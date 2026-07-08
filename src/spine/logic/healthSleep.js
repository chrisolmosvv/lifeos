// LifeOS — Health → Sleep (S5): sleep transforms (PURE).
//
// Takes raw sleep_nights rows (one row per night, keyed on night_date = the
// Amsterdam wake-up date) + resolved goals + "today", and returns the view-model
// the Sleep front page will later read. No DB, no clock-inside — "now" is passed in.
//
// Surfaces: last night (duration, stage minutes + %, awakenings, in-bed/woke
// times); duration vs goal (EXACT: asleep >= target); 7/30/90 avg duration;
// week-over-week arrow + raw latest; goal streak (gap-pausing); bedtime
// consistency (std-dev of bedtime over 7 nights); bedtime vs goal (by_time).

import { amsTodayYMD, shiftYMD, amsClockMinutes } from "./gymDates.js";
import { statsForRange, presetRange, weekOverWeek, DEADBAND, PRESETS } from "./healthStats.js";
import { vsGoal } from "./healthGoals.js";

// Minutes-after-midnight → minutes-after-noon (noon = 0), so a 23:30 bedtime and a
// 00:30 bedtime sit 60 min apart instead of wrapping ~23h. (Same anchoring the
// by_time goal uses; trivial enough to keep local and avoid coupling the modules.)
function anchorNoon(min) {
  return ((min + 720) % 1440 + 1440) % 1440;
}

// Nightly duration series: { ymd: night_date, value: asleep_minutes }. One row per
// night already, so no daily-collapse needed. Oldest-first for clean reads.
function durationSeries(rows) {
  return (rows || [])
    .filter((r) => r?.night_date)
    .map((r) => ({ ymd: r.night_date, value: r.asleep_minutes, at: r.night_date }))
    .sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
}

// The most recent night on or before `today`. null if none.
function latestNight(rows, today) {
  let best = null;
  for (const r of rows || []) {
    if (!r?.night_date || r.night_date > today) continue;
    if (best == null || r.night_date > best.night_date) best = r;
  }
  return best;
}

function pct(part, whole) {
  return whole > 0 && Number.isFinite(part) ? Math.round((part / whole) * 100) : null;
}

// Last night's detail. REM/Core/Deep % are of time ASLEEP (rem+core+deep). Awake %
// is of time IN BED (asleep + awake) — being awake isn't part of sleep, so it can't
// be a slice of "asleep"; the page shows min AND % for all four stages (S6-prep).
// The detail view-model for ONE night row (shared by lastNight + nightOn). null row
// → null. REM/Core/Deep % of asleep; Awake % of time in bed (asleep + awake).
function nightDetail(r) {
  if (!r) return null;
  const asleep = r.asleep_minutes;
  return {
    nightDate: r.night_date,
    asleepMinutes: asleep ?? null,
    inBedAt: r.in_bed_at ?? null,
    wokeAt: r.woke_at ?? null,
    awakenings: r.awakenings ?? null,
    stages: {
      rem: { min: r.rem_minutes ?? null, pct: pct(r.rem_minutes, asleep) },
      core: { min: r.core_minutes ?? null, pct: pct(r.core_minutes, asleep) },
      deep: { min: r.deep_minutes ?? null, pct: pct(r.deep_minutes, asleep) },
      awake: { min: r.awake_minutes ?? null, pct: pct(r.awake_minutes, (asleep ?? 0) + (r.awake_minutes ?? 0)) },
    },
  };
}

export function lastNight(rows, today) {
  return nightDetail(latestNight(rows, today));
}

// The detail for an EXACT night_date (the Week/Month bar drill-in). null if no row.
export function nightOn(rows, ymd) {
  return nightDetail((rows || []).find((r) => r?.night_date === ymd) || null);
}

// 7/30/90 avg duration, each with the daily values it averaged (for the debug
// readout to list). → { 7: {avg, values:[{ymd,value}]}, 30: {...}, 90: {...} }.
export function rollingDurations(rows, today) {
  const series = durationSeries(rows);
  const out = {};
  for (const days of PRESETS) {
    const { start, end } = presetRange(days, today);
    const values = series.filter((p) => p.ymd >= start && p.ymd <= end);
    out[days] = { avg: statsForRange(series, start, end).avg, values };
  }
  return out;
}

// Week-over-week duration arrow (avg last 7 vs prior 7) + the raw latest night.
export function durationTrend(rows, today) {
  const series = durationSeries(rows);
  const wow = weekOverWeek(series, { end: today, deadband: DEADBAND.sleep_duration });
  const last = latestNight(rows, today);
  return { ...wow, latest: last?.asleep_minutes ?? null, latestDate: last?.night_date ?? null };
}

// Goal streak: consecutive nights hitting the sleep_duration goal, counting back
// from today. A night with NO data PAUSES (skip, keep counting through the gap);
// a real logged miss BREAKS it. null if there's no sleep_duration goal to test.
export function goalStreak(rows, goal, today) {
  if (!goal || goal.target_value == null || goal.direction !== "up") return null;
  const byNight = new Map();
  let minYmd = null;
  for (const r of rows || []) {
    if (!r?.night_date) continue;
    byNight.set(r.night_date, r.asleep_minutes);
    if (minYmd == null || r.night_date < minYmd) minYmd = r.night_date;
  }
  let streak = 0;
  const detail = []; // for the debug readout: each night considered + its verdict
  let cursor = today;
  while (minYmd != null && cursor >= minYmd) {
    if (byNight.has(cursor)) {
      const mins = byNight.get(cursor);
      const hit = Number.isFinite(mins) && mins >= goal.target_value; // EXACT, no grace
      detail.push({ ymd: cursor, asleep: mins, hit });
      if (hit) streak += 1;
      else break; // a real miss ends the streak
    } else {
      detail.push({ ymd: cursor, asleep: null, hit: null }); // gap → pause
    }
    cursor = shiftYMD(cursor, -1);
  }
  return { streak, target: goal.target_value, detail };
}

// Nights that HIT the sleep_duration goal in the last `days` (default 7) — the "4/7"
// tally for the Week/Month views. Unlike the streak this does NOT stop at the first
// miss; it counts every night in the window. hit = nights with data meeting the goal
// (EXACT: asleep ≥ target); total = the window size; withData = nights with any sleep
// logged. null if there's no sleep_duration goal. (S6-prep.)
export function nightsHitGoal(rows, goal, today, days = 7) {
  if (!goal || goal.target_value == null || goal.direction !== "up") return null;
  const start = shiftYMD(today, -(days - 1));
  let hit = 0, withData = 0;
  for (const r of rows || []) {
    if (!r?.night_date || r.night_date < start || r.night_date > today) continue;
    if (!Number.isFinite(r.asleep_minutes)) continue;
    withData += 1;
    if (r.asleep_minutes >= goal.target_value) hit += 1;
  }
  return { hit, total: days, withData };
}

// Bedtime consistency = population STD-DEV of in_bed_at clock-time over the last 7
// nights (we picked std-dev over max−min: robust to a single odd night). Times are
// anchored to minutes-after-noon first so evening/after-midnight bedtimes don't
// wrap. Needs >= 2 nights with a bedtime, else null. → { stdDevMin, nights, times }.
export function bedtimeConsistency(rows, today) {
  const start = shiftYMD(today, -6);
  const mins = [];
  const times = []; // {ymd, clockMin} for the debug readout
  for (const r of rows || []) {
    if (!r?.night_date || r.night_date < start || r.night_date > today) continue;
    const clock = amsClockMinutes(r.in_bed_at);
    if (clock == null) continue;
    mins.push(anchorNoon(clock));
    times.push({ ymd: r.night_date, clockMin: clock });
  }
  if (mins.length < 2) return { stdDevMin: null, nights: mins.length, times };
  const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
  const variance = mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length;
  return { stdDevMin: Math.sqrt(variance), nights: mins.length, times };
}

// (Bed/wake clock math — averageClock, circularMedianClock, clockExtent,
// rangeBedWakeAverages — moved to ./healthRhythm.js to keep this file under the size
// guard. They reason on the same noon-anchor convention bedtimeConsistency uses.)

// Last night's bedtime vs a by_time bedtime goal. null if no goal / no bedtime.
export function bedtimeVsGoal(rows, goal, today) {
  if (!goal || goal.direction !== "by_time") return null;
  const r = latestNight(rows, today);
  const clock = amsClockMinutes(r?.in_bed_at);
  if (clock == null) return null;
  return { ...vsGoal(clock, goal), nightDate: r.night_date };
}

// The whole Sleep view-model in one call (what the debug readout renders).
// goals = Map<goal_type, {target_value, unit, direction}> from resolveGoals().
export function sleepView(rows, goals, now = Date.now()) {
  const today = amsTodayYMD(now);
  const durGoal = goals?.get?.("sleep_duration") ?? null;
  const bedGoal = goals?.get?.("bedtime") ?? null;
  const last = lastNight(rows, today);
  return {
    today,
    lastNight: last,
    durationVsGoal: last && durGoal ? vsGoal(last.asleepMinutes, durGoal) : null,
    rolling: rollingDurations(rows, today),
    trend: durationTrend(rows, today),
    streak: goalStreak(rows, durGoal, today),
    bedtime: bedtimeConsistency(rows, today),
    bedtimeVsGoal: bedtimeVsGoal(rows, bedGoal, today),
  };
}
