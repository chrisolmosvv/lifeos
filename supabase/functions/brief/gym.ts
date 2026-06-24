// LifeOS — the morning brief: the OPTIONAL Gym line (G15). Read-only, AI-free.
//
// Restraint is the feature. This returns AT MOST ONE calm line, and only when
// there's a real story: a fresh PR from the last session, or a real training gap.
// Most mornings it returns null and the brief is unchanged. It is APPENDED to the
// brief AFTER Gemini has written the prose (see index.ts), so raw gym/health data
// NEVER goes through the model — the locked "no AI on health data" rule holds.
//
// DEGRADE-SAFE: any read failure or empty data → null → the brief sends exactly as
// it does today. Never throws.
//
// READS reuse the brief's service-role select() but with a PLAIN user_id filter —
// NOT sb.owner(), which appends `archived_at=is.null` (a spine column the gym tables
// don't have). Gym tables are an external cache; they have no archive concept.
//
// THRESHOLDS (stated): a PR line only if the last session was within PR_RECENT_DAYS
// (so we never announce a stale PR); a gap line only at GAP_DAYS or more. PR outranks
// gap (and they're near-mutually-exclusive: a fresh PR means you just trained).

import { select } from "./sb.ts";
import { daysBetweenYMD, localYMD, todayYMD } from "../_shared/datetime.ts";

const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");

const GAP_DAYS = 3;       // a gap note only at 3+ days since the last session
const PR_RECENT_DAYS = 2; // a PR note only if the last session was today/within 2 days
const WARMUP = "warmup";

const owner = () => `user_id=eq.${OWNER_USER_ID}`;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const fmtKg = (w: number) => (w % 1 === 0 ? String(w) : w.toFixed(1));

// Paginated read (gym_sets can exceed PostgREST's 1000-row cap). Returns rows or
// null on any failure (caller treats null as "no line", never an error).
async function readAll(table: string, cols: string): Promise<Record<string, unknown>[] | null> {
  const PAGE = 1000;
  const out: Record<string, unknown>[] = [];
  for (let off = 0; ; off += PAGE) {
    const rows = await select(`${table}?select=${cols}&${owner()}&limit=${PAGE}&offset=${off}`);
    if (rows === null) return null;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// The gym line, or null. The ONLY export.
export async function gymLine(): Promise<string | null> {
  if (!OWNER_USER_ID) return null;
  try {
    const workouts = await readAll("gym_workouts", "id,started_at");
    if (!workouts || workouts.length === 0) return null; // empty cache → degrade-safe

    const byStarted = (a: Record<string, unknown>, b: Record<string, unknown>) =>
      String(a.started_at) < String(b.started_at) ? -1 : String(a.started_at) > String(b.started_at) ? 1 : 0;
    const chrono = workouts.slice().sort(byStarted);
    const last = chrono[chrono.length - 1];
    const lastDay = localYMD(String(last.started_at));
    if (!lastDay) return null;
    const daysSince = daysBetweenYMD(lastDay, todayYMD());

    // 1) A fresh PR from the last session outranks everything.
    if (daysSince <= PR_RECENT_DAYS) {
      const prs = await lastSessionPRs(chrono, String(last.id));
      if (prs && prs.length > 0) {
        const top = prs.slice().sort((a, b) => b.weight - a.weight)[0];
        return prs.length === 1
          ? `On the gym: new best last session — ${top.lift} at ${fmtKg(top.weight)} kg.`
          : `On the gym: new bests last session, including ${top.lift} at ${fmtKg(top.weight)} kg.`;
      }
    }

    // 2) A real training gap.
    if (daysSince >= GAP_DAYS) {
      return `On the gym: ${daysSince} days since your last training session.`;
    }

    return null; // trained recently, no PR — nothing worth saying
  } catch (_err) {
    return null; // degrade-safe: never break the brief
  }
}

// The working-set weight PRs set IN the last session (vs all prior). Same rule as
// the front-end calc layer (heaviest working weight per lift, warm-ups excluded),
// reimplemented here (separate runtime — no cross-track import). null on read failure.
async function lastSessionPRs(
  chrono: Record<string, unknown>[],
  lastId: string,
): Promise<{ lift: string; weight: number }[] | null> {
  const exercises = await readAll("gym_exercises", "id,workout_id,exercise_template_id,title");
  if (!exercises) return null;
  const sets = await readAll("gym_sets", "exercise_id,weight_kg,set_type");
  if (!sets) return null;

  const setsByEx = new Map<string, Record<string, unknown>[]>();
  for (const s of sets) {
    const k = String(s.exercise_id);
    (setsByEx.get(k) ?? setsByEx.set(k, []).get(k)!).push(s);
  }
  const exByWorkout = new Map<string, Record<string, unknown>[]>();
  for (const ex of exercises) {
    const k = String(ex.workout_id);
    (exByWorkout.get(k) ?? exByWorkout.set(k, []).get(k)!).push(ex);
  }

  // Heaviest WORKING weight of one exercise (warm-ups excluded), or null.
  const exerciseTop = (exId: string): number | null => {
    let top: number | null = null;
    for (const s of setsByEx.get(exId) ?? []) {
      if (s.set_type === WARMUP) continue;
      const w = num(s.weight_kg);
      if (w > 0 && (top === null || w > top)) top = w;
    }
    return top;
  };

  const best: Record<string, number> = {};
  let found: { lift: string; weight: number }[] = [];
  for (const w of chrono) {
    const isLast = String(w.id) === lastId;
    const here: { lift: string; weight: number }[] = [];
    for (const ex of exByWorkout.get(String(w.id)) ?? []) {
      const top = exerciseTop(String(ex.id));
      if (top === null) continue;
      const key = String(ex.exercise_template_id || ex.title || "?");
      if (best[key] == null || top > best[key]) {
        if (isLast) here.push({ lift: String(ex.title || key), weight: top });
        best[key] = top;
      }
    }
    if (isLast) {
      found = here;
      break;
    }
  }
  return found;
}
