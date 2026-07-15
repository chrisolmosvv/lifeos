// LifeOS — Sleep CLOCK CHART: the pure maths behind SleepClockColumns. PURE FUNCTIONS ONLY
// (no React, no fetch, no clock) — split out in Piece 4 so the component stays small and the
// window/crop rules are testable in one place.
//
// THE WINDOW (Piece 4 flip): 22:00 (top) → 12:00 next day (bottom) — a 14-hour vertical
// window. It used to be 18:00 → 12:00 (18h). Cropping the dead midday hours makes each
// night's block bigger; moving the top from 18:00 to 22:00 crops more of them still.

import { shiftYMD, amsClockMinutes, humanDayShort } from "../../spine/logic/gymDates.js";
import { rangeBedWakeAverages } from "../../spine/logic/healthRhythm.js";
import { clockFromMin } from "../../spine/logic/healthFormat.js";

export const WINDOW_START_MIN = 22 * 60; // 1320 — the top of the chart
export const WINDOW_MIN = 14 * 60; //       840 — 22:00 → 12:00

// The four labels on the right divider, as offsets from the window top.
export const GRID = [
  { off: 0, label: "22:00" },
  { off: 120, label: "00:00" },
  { off: 480, label: "06:00" },
  { off: 840, label: "12:00" },
];

export const STAGE_KEYS = [
  ["deep", "deep_minutes"],
  ["core", "core_minutes"],
  ["rem", "rem_minutes"],
  ["awake", "awake_minutes"],
];

// Minutes since the window top, wrapped into a day.
export const offsetOf = (t) => (((t - WINDOW_START_MIN) % 1440) + 1440) % 1440;

// The DEAD stretch is 12:00–22:00 (offsets 840…1439) — the hours the window crops out.
// A time landing there is either just BEFORE the window (an early bedtime, e.g. 21:30 →
// offset 1410) or just AFTER it (a very late wake, e.g. 13:00 → offset 1020). Split the
// dead stretch at its midpoint (17:00) to tell those apart.
const DEAD_MID = (WINDOW_MIN + 1440) / 2; // 1140 = 17:00

// Where a clock-minute sits in the window → { pct, crop }.
// crop: 'top'    → the real time is EARLIER than 22:00; pinned to the top edge.
//       'bottom' → the real time is LATER than 12:00; pinned to the bottom edge.
// THE BUG THIS FIXES (recon flagged it): the old code clamped out-of-window times to
// 0/100 and then DROPPED any block whose wake was not below its bed. With a 22:00 top, a
// night that began before 22:00 clamped its bed to the BOTTOM (offset ~1410 → 100%), so
// wake < bed and the whole night silently vanished. Now it pins to the TOP and says so.
export function place(t) {
  if (!Number.isFinite(t)) return null;
  const off = offsetOf(t);
  if (off <= WINDOW_MIN) return { pct: (off / WINDOW_MIN) * 100, crop: null };
  return off >= DEAD_MID ? { pct: 0, crop: "top" } : { pct: 100, crop: "bottom" };
}

// A clock-minute → Y%, for the average marks. Out-of-window values pin to an edge.
export const topOf = (t) => place(t)?.pct ?? null;

// One column per day, newest LAST, counting back from `end`. This is the seam Piece 6 needs:
// a 90-day view collapses to ~13 WEEKLY columns, which means swapping this slot builder (or
// passing `slots` straight in) — not rewriting the chart.
export function buildSlots(rows, end, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const ymd = shiftYMD(end, -i);
    out.push({ ymd, row: (rows || []).find((r) => r.night_date === ymd) || null });
  }
  return out;
}

// A bed→wake pair (clock-minutes) → the block GEOMETRY, or null when it can't sit in the
// window. { topPct, heightPct, cropTop, cropBottom }. The shared primitive under both the
// per-night blocks and the weekly-average spans — the crop rules live in exactly one place.
export function spanBlock(bedMin, wakeMin) {
  const bed = place(bedMin);
  const wake = place(wakeMin);
  if (!bed || !wake) return null;
  // Both pinned to the same edge = the span lies entirely outside the window. Nothing honest
  // to draw, so draw nothing (rather than a fake sliver).
  if (wake.pct <= bed.pct) return null;
  return { topPct: bed.pct, heightPct: wake.pct - bed.pct, cropTop: bed.crop === "top", cropBottom: wake.crop === "bottom" };
}

// A night row → the block to draw, or null when it can't be placed. Adds the stage stack and
// the goal-met flag on top of the shared span geometry.
// { topPct, heightPct, cropTop, cropBottom, stages: [{key, pct}], metGoal }
export function blockFor(row, goalMinutes = null) {
  if (!row) return null;
  const span = spanBlock(amsClockMinutes(row.in_bed_at), amsClockMinutes(row.woke_at));
  if (!span) return null;

  const parts = STAGE_KEYS.map(([key, col]) => ({ key, min: row[col] })).filter(
    (p) => Number.isFinite(p.min) && p.min > 0,
  );
  const total = parts.reduce((a, p) => a + p.min, 0) || 1;

  return {
    ...span,
    stages: parts.map((p) => ({ key: p.key, pct: (p.min / total) * 100 })),
    metGoal:
      Number.isFinite(goalMinutes) && Number.isFinite(row.asleep_minutes)
        ? row.asleep_minutes >= goalMinutes
        : false,
  };
}

// 90-day (Piece 6): ONE column per WEEK, each an AVERAGE bed→wake span (not a night, no
// stages). rangeBedWakeAverages already gives a window's avg bed/wake for any range, so this
// is that call once per 7-day bucket — no new calc. Newest week LAST, matching buildSlots.
// Each column is pre-normalised to what SleepClockColumns renders via its `columns` prop:
// a flat (stage-less) span, its own hover readout, and a drill key = that week's start ymd.
export function weeklyColumns(rows, end, weeks) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const wEnd = shiftYMD(end, -7 * w);
    const wStart = shiftYMD(wEnd, -6);
    const avg = rangeBedWakeAverages(rows, wStart, wEnd);
    const n = avg.nights;
    const span = n ? spanBlock(avg.bedAvgMin, avg.wakeAvgMin) : null;
    out.push({
      key: wStart,
      drillKey: wStart,
      disabled: !n,
      block: span ? { ...span, flat: true, stages: [] } : null,
      label: n
        ? `week of ${humanDayShort(wStart)} · avg ${clockFromMin(avg.bedAvgMin)} to ${clockFromMin(avg.wakeAvgMin)}`
        : `week of ${humanDayShort(wStart)} · no data`,
      readout: n
        ? `week of ${humanDayShort(wStart)} · avg bed ${clockFromMin(avg.bedAvgMin)} · avg wake ${clockFromMin(avg.wakeAvgMin)} · ${n} ${n === 1 ? "night" : "nights"}`
        : null,
    });
  }
  return out;
}
