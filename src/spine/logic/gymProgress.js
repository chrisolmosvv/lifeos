// LifeOS — Health → Gym V2 (Piece 12): Training Progress drill-down aggregates (PURE).
//
// The combo chart shows TWO series per day — volume (bars) and total reps (line) —
// so this layer emits { ymd, volume, reps } per real session day. Reps reuse the new
// gymCalc.sumReps (all sets, warm-ups included, matching the volume rule) so the grid's
// AVG WEIGHT PER REP = volume ÷ reps stays internally consistent. Everything here is
// cheap client-side maths over the already-loaded workouts — no fetch, no new data.

import { amsYMD } from "./gymDates.js";
import { setVolume, sumVolume, sumReps, prWeight } from "./gymCalc.js";

const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";
const inWindow = (ymd, start, end) => (!start || ymd >= start) && (!end || ymd <= end);

// ── Combo series (Screen 1 + Screen 3) ────────────────────────────────────────
// ONE point per real session DAY in [start, end], each { ymd, volume, reps } — the
// day's total training volume AND total reps. Only real days are emitted (no faked
// zero-days), so the bars sit on genuine sessions and the reps line spans real data.
// `pickSets(exercise)` selects which sets count: the default takes every set (the
// routine-wide chart); the single-exercise chart passes a key filter.
function comboFrom(workouts, { start, end }, pickSets) {
  const vol = new Map();
  const reps = new Map();
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd || !inWindow(ymd, start, end)) continue;
    for (const ex of w.exercises || []) {
      const sets = pickSets(ex);
      if (!sets || !sets.length) continue;
      vol.set(ymd, (vol.get(ymd) || 0) + sumVolume(sets));
      reps.set(ymd, (reps.get(ymd) || 0) + sumReps(sets));
    }
  }
  return [...vol.keys()]
    .sort()
    .map((ymd) => ({ ymd, volume: vol.get(ymd) || 0, reps: reps.get(ymd) || 0 }));
}

// Routine-wide (or All): every exercise's sets count toward the day.
export function comboSeries(workouts, { start, end } = {}) {
  return comboFrom(workouts, { start, end }, (ex) => ex.sets || []);
}

// Single-exercise DETAIL series (Screen 3, Piece 15). Per real session day for one exercise:
//   { ymd, volume, reps, maxWeight, isPR }
//   maxWeight = that day's heaviest WORKING-set weight (gymCalc.prWeight; null = bodyweight/duration)
//   isPR      = maxWeight STRICTLY beats the exercise's best from every day BEFORE it (first-ever
//               weighted day counts; ties do NOT). Same rule as recentSessions' PR flag — a single
//               chronological pass over ALL history seeds the running best, so a day early in the
//               window is judged against history the window itself may not include; only in-window
//               days are emitted. Reps/volume are per-day totals (all sets, matching the volume rule).
export function exerciseDetailSeries(workouts, key, { start, end } = {}) {
  const byDay = new Map(); // ymd → { volume, reps, sets:[] } across ALL history for this exercise
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd) continue;
    for (const ex of w.exercises || []) {
      if (liftKey(ex) !== key) continue;
      const rec = byDay.get(ymd) || { volume: 0, reps: 0, sets: [] };
      rec.volume += sumVolume(ex.sets);
      rec.reps += sumReps(ex.sets);
      if (ex.sets) rec.sets.push(...ex.sets);
      byDay.set(ymd, rec);
    }
  }
  const out = [];
  let best = null; // running best heaviest-working-set weight, oldest→newest
  for (const ymd of [...byDay.keys()].sort()) {
    const rec = byDay.get(ymd);
    const maxWeight = prWeight(rec.sets);
    let isPR = false;
    if (maxWeight != null && (best == null || maxWeight > best)) { isPR = true; best = maxWeight; }
    if (inWindow(ymd, start, end)) out.push({ ymd, volume: rec.volume, reps: rec.reps, maxWeight, isPR });
  }
  return out;
}

// ── Period totals (Screen 1 stat row) ─────────────────────────────────────────
// Volume (kg), total SETS, and total REPS for a routine over [start, end] — all three
// counting EVERY set (warm-ups included, matching the volume rule) so the stat row's
// figures are internally consistent. Cheap client-side over the already-loaded workouts.
export function periodTotals(workouts, { start, end } = {}) {
  let volume = 0, sets = 0, reps = 0;
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd || !inWindow(ymd, start, end)) continue;
    for (const ex of w.exercises || []) {
      for (const s of ex.sets || []) {
        volume += setVolume(s);
        reps += num(s?.reps);
        sets += 1;
      }
    }
  }
  return { volume, sets, reps };
}

// ── Top-N exercise ranking (Screen 2) ─────────────────────────────────────────
// For each exercise trained IN the window, a card row:
//   { key, name, muscle, volume, reps, sets, avgWeightPerRep, best, delta, isNew, bodyweight }
//   volume / reps / sets  = totals for that exercise in-window (all sets)
//   avgWeightPerRep        = volume ÷ reps (kg per rep); null if no reps
//   best                   = heaviest working weight in-window (null → bodyweight/duration)
//   delta                  = best − heaviest working weight BEFORE the window; null if no prior
//   isNew                  = weighted this window, no prior baseline to diff
// Ranked by `metric` ("volume" | "reps") descending, then name. Returns the top `limit`.
export function exerciseRanking(workouts, { start, end, metric = "volume", limit = 6 } = {}) {
  const acc = new Map(); // key → { key, name, muscle, volume, reps, sets, best }
  const before = {}; // key → heaviest working weight strictly before `start`
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd) continue;
    const isIn = inWindow(ymd, start, end);
    const isBefore = start && ymd < start;
    if (!isIn && !isBefore) continue; // future of the window — ignore
    for (const ex of w.exercises || []) {
      const key = liftKey(ex);
      const pr = prWeight(ex.sets); // heaviest working weight; null for bodyweight/duration
      if (isIn) {
        let rec = acc.get(key);
        if (!rec) { rec = { key, name: ex.title || key, muscle: ex.muscle || null, volume: 0, reps: 0, sets: 0, best: null }; acc.set(key, rec); }
        for (const s of ex.sets || []) {
          rec.volume += setVolume(s);
          rec.reps += num(s?.reps);
          rec.sets += 1;
        }
        if (pr != null && (rec.best == null || pr > rec.best)) rec.best = pr;
      } else if (pr != null && (before[key] == null || pr > before[key])) {
        before[key] = pr;
      }
    }
  }
  const rows = [...acc.values()].map((r) => {
    const prior = before[r.key] ?? null;
    let delta = null, isNew = false;
    if (r.best != null) {
      if (prior != null) delta = r.best - prior;
      else isNew = true;
    }
    return {
      ...r,
      avgWeightPerRep: r.reps > 0 ? r.volume / r.reps : null,
      bodyweight: r.best == null,
      delta,
      isNew,
    };
  });
  const by = metric === "reps" ? "reps" : "volume";
  rows.sort((a, b) => b[by] - a[by] || a.name.localeCompare(b.name));
  return rows.slice(0, limit);
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
