// LifeOS — health-ingest: the sleep parse + sessionise layer (S3b).
//
// Turns Apple Health's per-stage sleep segments into one consolidated sleep_nights
// row per night. The shortcut sends { kind:"sleep", segments:[{stage,start,end}…] };
// Apple emits many segments per night (Core/Deep/REM/Awake/In Bed), sometimes split
// across a couple of sessions and the odd daytime nap. We:
//   1) map each stage (case-insensitive, spaces ignored) and keep valid segments,
//   2) cluster segments into sessions (a gap > SESSION_GAP_MIN starts a new one),
//   3) drop naps — per wake-date keep only the session with the largest in-bed span,
//   4) emit one row per kept session: summed stage minutes, asleep = REM+Core+Deep+
//      generic-asleep (Awake & In-Bed excluded), awakenings = Awake segs ≥ AWAKENING
//      _MIN_MIN, score null, source "apple-health".
// Upsert REPLACES a night on (user_id, night_date) — latest send wins, like body/activity.

import { localYMD } from "../_shared/datetime.ts";
import { type SleepRow, upsertSleepNights } from "./store.ts";
import { parseInstant } from "./parse.ts";

// Tunable: a gap longer than this (minutes) between segments starts a new session.
const SESSION_GAP_MIN = 180;
// Tunable: an Awake segment counts as an awakening at/over this length (minutes).
const AWAKENING_MIN_MIN = 5;
const SOURCE = "apple-health";

type Segment = { stage?: unknown; start?: unknown; end?: unknown };
type Stage = "REM" | "Core" | "Deep" | "Awake" | "inbed" | "asleep";
type Seg = { stage: Stage; start: Date; end: Date; mins: number };

export type SleepOutcome = { status: number; body: unknown };

// Apple's stage labels vary; match case-insensitively, ignoring spaces. Unknown → null.
function mapStage(raw: unknown): Stage | null {
  if (typeof raw !== "string") return null;
  switch (raw.toLowerCase().replace(/\s+/g, "")) {
    case "rem":
    case "asleeprem":
      return "REM";
    case "core":
    case "asleepcore":
      return "Core";
    case "deep":
    case "asleepdeep":
      return "Deep";
    case "awake":
      return "Awake";
    case "inbed":
      return "inbed"; // boundary only, not counted as sleep
    case "asleep":
    case "asleepunspecified":
      return "asleep"; // generic asleep
    default:
      return null;
  }
}

export async function ingestSleep(payload: { segments?: unknown }): Promise<SleepOutcome> {
  const segments = payload?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    // An empty window is recognisable, not an error.
    return { status: 200, body: { ok: true, nights: 0, note: "no_segments" } };
  }

  // 1) Parse + validate. Unknown stage / unparseable / non-positive duration → skip.
  const segs: Seg[] = [];
  for (const s of segments as Segment[]) {
    const stage = mapStage(s?.stage);
    if (!stage) continue; // unknown stage — skip, don't fail
    const start = parseInstant(s?.start);
    const end = parseInstant(s?.end);
    if (!start || !end) continue; // bad_segment
    const mins = (end.getTime() - start.getTime()) / 60000;
    if (mins <= 0) continue; // bad_segment (non-positive duration)
    segs.push({ stage, start, end, mins });
  }
  if (segs.length === 0) return { status: 200, body: { ok: true, nights: 0 } };

  // 2) Cluster into sessions: sort by start; a gap from the session's running latest
  //    end beyond SESSION_GAP_MIN starts a new session.
  segs.sort((a, b) => a.start.getTime() - b.start.getTime());
  const gapMs = SESSION_GAP_MIN * 60000;
  const sessions: Seg[][] = [];
  let current: Seg[] = [];
  let runningEnd = 0;
  for (const seg of segs) {
    if (current.length === 0) {
      current = [seg];
      runningEnd = seg.end.getTime();
    } else if (seg.start.getTime() - runningEnd > gapMs) {
      sessions.push(current);
      current = [seg];
      runningEnd = seg.end.getTime();
    } else {
      current.push(seg);
      runningEnd = Math.max(runningEnd, seg.end.getTime());
    }
  }
  if (current.length) sessions.push(current);

  // 3) Drop naps: per wake-date (Amsterdam date of the latest end), keep the session
  //    with the largest total in-bed span.
  const best = new Map<string, { segs: Seg[]; inBed: Date; woke: Date; span: number }>();
  for (const sess of sessions) {
    const inBed = new Date(Math.min(...sess.map((x) => x.start.getTime())));
    const woke = new Date(Math.max(...sess.map((x) => x.end.getTime())));
    const span = woke.getTime() - inBed.getTime();
    const wakeDate = localYMD(woke.toISOString());
    const prev = best.get(wakeDate);
    if (!prev || span > prev.span) best.set(wakeDate, { segs: sess, inBed, woke, span });
  }

  // 4) One sleep_nights row per kept session.
  const rows: SleepRow[] = [...best.entries()].map(([wakeDate, k]) => {
    let rem = 0, core = 0, deep = 0, awake = 0, asleepGeneric = 0, awakenings = 0;
    for (const seg of k.segs) {
      switch (seg.stage) {
        case "REM": rem += seg.mins; break;
        case "Core": core += seg.mins; break;
        case "Deep": deep += seg.mins; break;
        case "asleep": asleepGeneric += seg.mins; break;
        case "Awake":
          awake += seg.mins;
          if (seg.mins >= AWAKENING_MIN_MIN) awakenings += 1;
          break;
        case "inbed":
          break; // boundary only — contributes to in_bed_at/woke_at, not to sleep
      }
    }
    return {
      night_date: wakeDate,
      in_bed_at: k.inBed.toISOString(),
      woke_at: k.woke.toISOString(),
      asleep_minutes: Math.round(rem + core + deep + asleepGeneric),
      rem_minutes: Math.round(rem),
      core_minutes: Math.round(core),
      deep_minutes: Math.round(deep),
      awake_minutes: Math.round(awake),
      awakenings,
      score: null,
      source: SOURCE,
      updated_at: new Date().toISOString(),
    };
  });

  const written = await upsertSleepNights(rows);
  if (written === null) return { status: 502, body: { ok: false, error: "db_write_failed" } };
  return { status: 200, body: { ok: true, nights: written } };
}
