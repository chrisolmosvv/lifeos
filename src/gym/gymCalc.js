// LifeOS — Health → Gym (G7): the metrics calc layer.
//
// PURE FUNCTIONS ONLY. No database, no fetch, no React — these take raw Hevy
// rows (workouts / exercises / sets / the template lookup) as plain objects and
// return numbers. A thin loader (gymLoad.js) does the fetching; the maths lives
// here so it can be unit-checked in isolation and never drifts.
//
// LOCKED DECISIONS (09-gym-form-guide.md / 03-decisions.md):
//   • Volume = weight_kg × reps, summed. Counts ALL sets (warm-ups included).
//   • Estimated 1RM = Epley: weight × (1 + reps/30). Warm-ups EXCLUDED.
//   • PR = heaviest working-set weight. Warm-ups EXCLUDED.
//   • Top set = heaviest working set. Warm-ups EXCLUDED.
//   • Rolling-7-day box score: Volume, Sessions, Time, New PRs.
//
// SET-TYPE rule (the G0 "set_type is free text" decision lives HERE): Hevy's
// warm-up tag is the EXACT string "warmup". ANY other value — "normal",
// "dropset", "failure", null, or an unrecognised tag — is treated as a WORKING
// set (counted), never silently dropped.

export const WARMUP_SET_TYPE = "warmup";

// A set is a warm-up only on the exact tag; everything else counts as working.
export function isWarmup(set) {
  return set?.set_type === WARMUP_SET_TYPE;
}
export function isWorking(set) {
  return !isWarmup(set);
}

// A finite number or 0 — never NaN/undefined leaks into a sum.
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// ── Volume ─────────────────────────────────────────────────────────────────
// weight × reps for one set. A null weight (bodyweight move) or null reps
// (duration/distance set) → 0 volume, never NaN. Counts regardless of set_type.
export function setVolume(set) {
  return num(set?.weight_kg) * num(set?.reps);
}
export function sumVolume(sets) {
  return (sets || []).reduce((t, s) => t + setVolume(s), 0);
}

// ── Estimated 1RM (Epley) ────────────────────────────────────────────────────
// weight × (1 + reps/30). Needs a real positive weight AND reps, so a bodyweight
// or duration set yields null (no estimate) rather than 0 or NaN. Warm-ups never
// reach here (callers filter to working sets).
export function epley1RM(weightKg, reps) {
  const w = num(weightKg);
  const r = num(reps);
  if (w <= 0 || r <= 0) return null;
  return w * (1 + r / 30);
}
// Best estimated 1RM across a list of sets (warm-ups excluded). null if none.
export function best1RM(sets) {
  let best = null;
  for (const s of sets || []) {
    if (!isWorking(s)) continue;
    const e = epley1RM(s.weight_kg, s.reps);
    if (e != null && (best == null || e > best)) best = e;
  }
  return best;
}

// ── PR + top set (heaviest working set) ──────────────────────────────────────
// PR = the heaviest weight lifted in a working set. null if no weighted working set.
export function prWeight(sets) {
  let best = null;
  for (const s of sets || []) {
    if (!isWorking(s)) continue;
    const w = s?.weight_kg;
    if (typeof w === "number" && Number.isFinite(w) && (best == null || w > best)) best = w;
  }
  return best;
}
// The heaviest working set itself (for "80kg × 5"). Tie-break on more reps. null if none.
export function topSet(sets) {
  let top = null;
  for (const s of sets || []) {
    if (!isWorking(s)) continue;
    const w = s?.weight_kg;
    if (typeof w !== "number" || !Number.isFinite(w)) continue;
    if (top == null || w > num(top.weight_kg) ||
        (w === num(top.weight_kg) && num(s.reps) > num(top.reps))) {
      top = s;
    }
  }
  return top;
}

// ── Shaping: bolt sets onto their exercise, exercises onto their workout ──────
// Returns workouts newest-first, each with .exercises (each with .sets), and a
// resolved .muscle (primary_muscle_group) per exercise via the template lookup.
// `templatesById` maps template_id → { primary_muscle_group, secondary_muscle_groups, title }.
export function buildWorkouts(workouts, exercises, sets, templatesById = {}) {
  const setsByEx = groupBy(sets, "exercise_id");
  const exByWo = groupBy(exercises, "workout_id");
  const out = (workouts || []).map((w) => {
    const exs = (exByWo[w.id] || [])
      .slice()
      .sort((a, b) => num(a.position) - num(b.position))
      .map((ex) => {
        const tpl = templatesById[ex.exercise_template_id] || null;
        return {
          ...ex,
          muscle: tpl?.primary_muscle_group ?? null,
          sets: (setsByEx[ex.id] || []).slice().sort((a, b) => num(a.position) - num(b.position)),
        };
      });
    return { ...w, exercises: exs };
  });
  return out.sort((a, b) => dateMs(b.started_at) - dateMs(a.started_at));
}

function groupBy(rows, key) {
  const m = {};
  for (const r of rows || []) (m[r[key]] ||= []).push(r);
  return m;
}

// ── Per-workout totals ────────────────────────────────────────────────────────
export function allSetsOf(workout) {
  return (workout?.exercises || []).flatMap((ex) => ex.sets || []);
}
export function workoutVolume(workout) {
  return sumVolume(allSetsOf(workout));
}
// Duration in minutes from started/ended; null if either is missing/unparseable.
export function workoutMinutes(workout) {
  const a = dateMs(workout?.started_at), b = dateMs(workout?.ended_at);
  if (!a || !b || b < a) return null;
  return (b - a) / 60000;
}

// ── Streak / consistency ──────────────────────────────────────────────────────
// Distinct local calendar dates (YYYY-MM-DD) that have a workout.
export function trainingDays(workouts) {
  const days = new Set();
  for (const w of workouts || []) {
    const d = localDay(w.started_at);
    if (d) days.add(d);
  }
  return days;
}
// Current DAILY streak: consecutive calendar days with a session, counting back
// from today — but only "live" if the most recent session was today or yesterday
// (otherwise the streak is broken → 0). NOTE: a definition choice, flagged for the
// owner (weekly consistency below is the gentler alternative).
export function currentStreakDays(workouts, now = Date.now()) {
  const days = trainingDays(workouts);
  if (days.size === 0) return 0;
  const today = startOfLocalDay(now);
  let cursor = today;
  if (!days.has(dayStr(cursor))) {
    cursor -= 86400000; // allow "trained yesterday, not yet today"
    if (!days.has(dayStr(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayStr(cursor))) {
    streak++;
    cursor -= 86400000;
  }
  return streak;
}
// Sessions per week for the last N weeks (index 0 = current week, oldest last).
// Week = rolling 7-day buckets ending "now". The gentler consistency view.
export function lastNWeeksSessions(workouts, n = 8, now = Date.now()) {
  const buckets = new Array(n).fill(0);
  for (const w of workouts || []) {
    const t = dateMs(w.started_at);
    if (!t) continue;
    const weeksAgo = Math.floor((now - t) / (7 * 86400000));
    if (weeksAgo >= 0 && weeksAgo < n) buckets[weeksAgo]++;
  }
  return buckets;
}

// ── Body-part split ────────────────────────────────────────────────────────────
// Group by primary muscle. Each muscle gets { volume, setCount }. A reps-only /
// duration exercise has 0 weight-volume but still adds to setCount (frequency) —
// never NaN, never dropped. Exercises with no template resolve under "unknown".
export function bodyPartSplit(workouts) {
  const out = {};
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      const key = ex.muscle || "unknown";
      const b = (out[key] ||= { volume: 0, setCount: 0 });
      for (const s of ex.sets || []) {
        b.volume += setVolume(s);
        b.setCount += 1;
      }
    }
  }
  return out;
}

// ── Rolling-7-day box score ─────────────────────────────────────────────────────
// Volume (all sets), Sessions, Time (minutes), New PRs — for workouts whose
// started_at is within `days` of `now`. A "new PR" = a lift whose heaviest working
// set INSIDE the window beats that lift's best working weight from BEFORE the window.
export function boxScore(workouts, days = 7, now = Date.now()) {
  const cutoff = now - days * 86400000;
  const inWin = [], before = [];
  for (const w of workouts || []) {
    const t = dateMs(w.started_at);
    (t && t >= cutoff ? inWin : before).push(w);
  }
  let volume = 0, timeMinutes = 0;
  for (const w of inWin) {
    volume += workoutVolume(w);
    const m = workoutMinutes(w);
    if (m != null) timeMinutes += m;
  }
  return {
    volume,
    sessions: inWin.length,
    timeMinutes,
    newPRs: countNewPRs(inWin, before),
  };
}

// Best working weight per lift (keyed by template id, falling back to title).
function bestWeightByLift(workouts) {
  const m = {};
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      const key = ex.exercise_template_id || ex.title || "?";
      const pr = prWeight(ex.sets);
      if (pr != null && (m[key] == null || pr > m[key])) m[key] = pr;
    }
  }
  return m;
}
function countNewPRs(inWin, before) {
  const prior = bestWeightByLift(before);
  const now = bestWeightByLift(inWin);
  let count = 0;
  for (const key of Object.keys(now)) {
    if (prior[key] == null || now[key] > prior[key]) count++;
  }
  return count;
}

// ── Small date helpers (local time) ───────────────────────────────────────────
function dateMs(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}
function startOfLocalDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function dayStr(ms) {
  const d = new Date(ms);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function localDay(v) {
  const t = dateMs(v);
  return t ? dayStr(t) : null;
}
