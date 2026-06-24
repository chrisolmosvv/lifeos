// LifeOS — Health → Gym: weekly trend aggregates (PURE — the calc layer for the
// trend chart). Weeks are rolling 7-Amsterdam-day windows ending today, sharing
// the SAME date definition (gymDates) as the box score — so the most recent weekly
// VOLUME point equals the box score's 7-day Volume. The chart only DISPLAYS these;
// it never recomputes a metric.

import { amsYMD, amsTodayYMD, shiftYMD, humanDayShort } from "./gymDates.js";
import { sumVolume, best1RM } from "./gymCalc.js";

// `n` weekly day-sets, oldest first. Week i (counting back) ends 7*i days before
// today; week 0 (the last entry) ends today → its days are the box score's window.
function weekBuckets(n, now) {
  const today = amsTodayYMD(now);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const end = -7 * i;
    const days = new Set();
    for (let d = 0; d < 7; d++) days.add(shiftYMD(today, end - d));
    weeks.push({ startYMD: shiftYMD(today, end - 6), days });
  }
  return weeks;
}

const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";

// The lift trained in the MOST sessions across all history → { key, name } or null.
export function mostFrequentLift(workouts) {
  const sessions = {}, names = {};
  for (const w of workouts || []) {
    const seen = new Set();
    for (const ex of w.exercises || []) {
      const key = liftKey(ex);
      if (!seen.has(key)) {
        sessions[key] = (sessions[key] || 0) + 1;
        seen.add(key);
      }
      if (!names[key]) names[key] = ex.title || key;
    }
  }
  let best = null;
  for (const key of Object.keys(sessions)) {
    if (best == null || sessions[key] > sessions[best]) best = key;
  }
  return best == null ? null : { key: best, name: names[best] };
}

// All sets of one lift (by key) across workouts whose Amsterdam day is in `days`.
function liftSetsInDays(workouts, key, days) {
  const out = [];
  for (const w of workouts || []) {
    if (!days.has(amsYMD(w.started_at))) continue;
    for (const ex of w.exercises || []) {
      if (liftKey(ex) === key) out.push(...(ex.sets || []));
    }
  }
  return out;
}

// Volume + sessions per week, plus (by default) the most-frequent lift's best
// est-1RM per week. Returns:
//   { labels:[...], volume:[num...], sessions:[int...], lift:{name, points:[num|null]}|null }
// A null lift point = the lift wasn't trained that week (the chart breaks the line).
export function trendSeries(workouts, { weeks = 12, now = Date.now(), lift } = {}) {
  const buckets = weekBuckets(weeks, now);
  const chosen = lift === undefined ? mostFrequentLift(workouts) : lift;

  const labels = buckets.map((b) => humanDayShort(b.startYMD));
  const volume = buckets.map((b) => {
    let v = 0;
    for (const w of workouts || []) {
      if (!b.days.has(amsYMD(w.started_at))) continue;
      for (const ex of w.exercises || []) v += sumVolume(ex.sets);
    }
    return v;
  });
  const sessions = buckets.map((b) => {
    let c = 0;
    for (const w of workouts || []) if (b.days.has(amsYMD(w.started_at))) c++;
    return c;
  });

  let liftSeries = null;
  if (chosen) {
    const points = buckets.map((b) => {
      const sets = liftSetsInDays(workouts, chosen.key, b.days);
      return sets.length ? best1RM(sets) : null;
    });
    liftSeries = { name: chosen.name, points };
  }

  return { labels, volume, sessions, lift: liftSeries };
}
