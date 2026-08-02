// LifeOS — Health Hub remodel: PURE calc helpers for the rich Hub sections.
//
// Compute-on-read only — no DB, no React, no stored values. These WRAP the existing
// detail-page calc (gymCalc / gymBalance / bodyComposition / healthSleep) so the Hub
// shows the SAME numbers the detail pages show, and add the few new derivations the
// Hub design needs (a graded heatmap, a global muscle baseline, a window net-delta,
// "% of night", and the restorative sum extracted from SleepNight so it's shared).
//
// Owner-locked build decisions this file encodes (03-decisions.md, Hub remodel):
//   • Heatmap grades each day 0–3 by TERCILES of the window's non-zero daily values,
//     so the shading self-scales for either metric (sets or volume). 0 = rest.
//   • Muscle × baseline = the MEAN working-set count across ALL real muscles worked
//     in the 30-day window; a muscle's × = its sets ÷ that mean. 1.0× = fair share.
//   • Sleep legend % = each stage's minutes ÷ TOTAL time in bed (sums to ~100) —
//     deliberately different from the detail page's %-of-asleep.

import { amsTodayYMD, shiftYMD, amsYMD } from "../../spine/logic/gymDates.js";
import { isWorking, workoutVolume } from "../../spine/logic/gymCalc.js";
import { muscleBalance } from "../../spine/logic/gymBalance.js";
import { REGION } from "../../spine/logic/gymBalanceGroups.js";
import { smoothedSeries } from "../../spine/logic/bodyComposition.js";

// ── GYM: graded calendar heatmap ─────────────────────────────────────────────
// Weekday of an Amsterdam ymd as Mon=0 … Sun=6 (noon-UTC never crosses midnight).
function weekdayMon(ymd) {
  return (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7;
}

// Tercile cutoffs of a list of non-zero values → [c1, c2] (the 1/3 and 2/3 quantiles).
// A day's value v grades: 0 if v<=0, else 1 (<=c1), 2 (<=c2), 3 (>c2). With few
// distinct values the terciles collapse gracefully (still a valid 1..3 split).
function tercileCutoffs(values) {
  const xs = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (xs.length === 0) return [0, 0];
  const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
  return [q(1 / 3), q(2 / 3)];
}
function gradeOf(v, [c1, c2]) {
  if (!(v > 0)) return 0;
  if (v <= c1) return 1;
  if (v <= c2) return 2;
  return 3;
}

// heatmapGrade(workouts, { now, weeks }) → a Monday-first grid of `weeks`×7 day cells
// (oldest→newest, ending with the current partial week). Each cell:
//   { ymd, weekday(0..6), sets, volume, gradeSets, gradeVolume, isToday, isFuture }
// Grades are terciles of the grid window's NON-ZERO daily values, per metric, so the
// shading self-scales. Days after today carry isFuture (rendered as empty, not rest).
export function heatmapGrade(workouts, { now = Date.now(), weeks = 5 } = {}) {
  const today = amsTodayYMD(now);
  const curMonday = shiftYMD(today, -weekdayMon(today));
  const firstMonday = shiftYMD(curMonday, -7 * (weeks - 1));

  // Per-day working-set count + per-day volume (weight×reps, all sets — matching
  // dailyVolumeSeries), in ONE pass over the workouts.
  const setsByDay = new Map();
  const volByDay = new Map();
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd) continue;
    let working = 0;
    for (const ex of w.exercises || []) {
      for (const s of ex.sets || []) if (isWorking(s)) working += 1;
    }
    setsByDay.set(ymd, (setsByDay.get(ymd) || 0) + working);
    volByDay.set(ymd, (volByDay.get(ymd) || 0) + workoutVolume(w));
  }

  const days = [];
  for (let i = 0; i < weeks * 7; i++) {
    const ymd = shiftYMD(firstMonday, i);
    const isFuture = ymd > today;
    days.push({
      ymd,
      weekday: weekdayMon(ymd),
      sets: isFuture ? 0 : setsByDay.get(ymd) || 0,
      volume: isFuture ? 0 : volByDay.get(ymd) || 0,
      isToday: ymd === today,
      isFuture,
    });
  }

  const setCuts = tercileCutoffs(days.map((d) => d.sets));
  const volCuts = tercileCutoffs(days.map((d) => d.volume));
  for (const d of days) {
    d.gradeSets = d.isFuture ? 0 : gradeOf(d.sets, setCuts);
    d.gradeVolume = d.isFuture ? 0 : gradeOf(d.volume, volCuts);
  }
  return { days, weeks };
}

// ── GYM: muscle bars vs a global balanced baseline ───────────────────────────
// The new static muscle→Push/Pull/Legs map for the BAR COLOURS (owner-locked). This
// is intentionally NOT the session-title split the ratio bar uses — it colours each
// muscle by its anatomical group. Muscles with no PPL home (neck, abdominals,
// lower_back) still count toward the baseline mean but are not shown as bars.
export const MUSCLE_PPL = {
  chest: "push", shoulders: "push", triceps: "push",
  upper_back: "pull", lats: "pull", biceps: "pull", traps: "pull", forearms: "pull",
  quadriceps: "legs", hamstrings: "legs", glutes: "legs", calves: "legs",
  abductors: "legs", adductors: "legs",
};

// muscleBaseline(workouts, { days, now, top }) → { bars, mean, maxMult }.
//   mean  = average working-set count across ALL real muscles worked (REGION-mapped),
//           the "balanced baseline" 1.0× (owner decision 6).
//   bars  = the top `top` PPL-mapped muscles by sets, each { name, sets, mult, ppl }.
//   maxMult = the largest × among bars (for scaling the bar track widths).
export function muscleBaseline(workouts, { days = 30, now = Date.now(), top = 6 } = {}) {
  const { ranked } = muscleBalance(workouts, { days, now });
  const real = ranked.filter((g) => REGION[g.muscle]); // real muscles only (drops cardio/other/unknown)
  const totalSets = real.reduce((t, g) => t + g.sets, 0);
  const mean = real.length ? totalSets / real.length : 0;

  const bars = ranked
    .filter((g) => MUSCLE_PPL[g.muscle])
    .slice(0, top)
    .map((g) => ({
      name: g.muscle,
      sets: g.sets,
      mult: mean > 0 ? g.sets / mean : 0,
      ppl: MUSCLE_PPL[g.muscle],
    }));
  const maxMult = bars.reduce((m, b) => Math.max(m, b.mult), 0);
  return { bars, mean, maxMult };
}

// ── BODY: net change over a window ───────────────────────────────────────────
// bodyNetDelta(rows, { start, end, smooth }) → { first, last, delta } | null.
// First-vs-last of the SMOOTHED daily series over the window — the same line the
// chart draws, so the legend delta matches the visible line's endpoints. null if
// the window holds fewer than 2 smoothed points (no honest delta to state).
export function bodyNetDelta(rows, { start, end, smooth = 7 } = {}) {
  const s = smoothedSeries(rows, { start, end, smooth, withBand: false });
  if (!s || s.length < 2) return null;
  const first = s[0].smoothed;
  const last = s[s.length - 1].smoothed;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return { first, last, delta: last - first, firstYmd: s[0].ymd, lastYmd: s[s.length - 1].ymd };
}

// ── SLEEP: "% of night" + restorative ────────────────────────────────────────
// sleepNightPct(stages) → each stage's minutes as % of TOTAL time in bed (the sum of
// all four stage minutes), so the four numbers sum to ~100 (owner decision 1). This
// is DIFFERENT from healthSleep's nightDetail %, which is %-of-asleep — intended.
// stages = { rem:{min}, core:{min}, deep:{min}, awake:{min} }.
export function sleepNightPct(stages) {
  const mins = {
    deep: num(stages?.deep?.min),
    core: num(stages?.core?.min),
    rem: num(stages?.rem?.min),
    awake: num(stages?.awake?.min),
  };
  const total = mins.deep + mins.core + mins.rem + mins.awake;
  const pctOf = (m) => (total > 0 ? Math.round((m / total) * 100) : null);
  return {
    totalMin: total,
    deep: { min: mins.deep, pct: pctOf(mins.deep) },
    core: { min: mins.core, pct: pctOf(mins.core) },
    rem: { min: mins.rem, pct: pctOf(mins.rem) },
    awake: { min: mins.awake, pct: pctOf(mins.awake) },
  };
}

// restorative = deep + REM, as minutes and as % of time ASLEEP. Extracted from
// SleepNight.jsx (was an inline sum there) so the night page and the Hub share ONE
// definition. → { min, pct } (min null if either stage is missing; pct null if no
// asleep total). % is of ASLEEP (not of night) — the established restorative meaning.
export function restorative(stages, asleepMinutes) {
  const deep = stages?.deep?.min;
  const rem = stages?.rem?.min;
  const min = Number.isFinite(deep) && Number.isFinite(rem) ? deep + rem : null;
  const pct =
    min != null && Number.isFinite(asleepMinutes) && asleepMinutes > 0
      ? Math.round((min / asleepMinutes) * 100)
      : null;
  return { min, pct };
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
