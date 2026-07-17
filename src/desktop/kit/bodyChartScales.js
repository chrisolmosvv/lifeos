// LifeOS — Body composition chart GEOMETRY: PURE maths (no React) behind
// BodyCompositionChart, split out so the component stays small and the scales are
// testable in one place (the same discipline as sleepClockChart.js).
//
// TWO vertical scales share one plot box: WEIGHT is the visible kg axis (left); BODY
// FAT rides a SECONDARY scale mapped into the same height so its LINE SHAPE reads —
// there is no second labelled axis (its number is spoken by the hero on scrub, not the
// axis). X is real DATE across the window, so a gap in weigh-ins sits honestly.

import { humanDayShort, shiftYMD } from "../../spine/logic/gymDates.js";

// viewBox geometry. The SVG scales to its container via preserveAspectRatio.
// l = room for the weight (kg) axis labels; r = room for the body-fat (%) axis labels.
export const DIMS = { w: 640, h: 300, l: 44, r: 42, t: 16, b: 28 };
const DAY = 86400000;

export const dayIndex = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);

// x(ymd) across [windowStart, windowEnd], clamped into the plot box.
export function xScale(windowStart, windowEnd) {
  const total = Math.max(1, dayIndex(windowEnd, windowStart));
  const { l, w, r } = DIMS;
  const iw = w - l - r;
  return (ymd) => l + (Math.min(Math.max(dayIndex(ymd, windowStart), 0), total) / total) * iw;
}

// A value domain [min..max] over `values` → y(v) in the plot box, plus the padded
// lo/hi (for axis labels). Flat/empty domains still get a sane 1-unit spread.
export function yScaleFrom(values, pad = 0.1) {
  const xs = (values || []).filter((v) => Number.isFinite(v));
  let lo = xs.length ? Math.min(...xs) : 0;
  let hi = xs.length ? Math.max(...xs) : 1;
  if (lo === hi) { lo -= 1; hi += 1; }
  const p = (hi - lo) * pad;
  lo -= p; hi += p;
  const { t, h, b } = DIMS;
  const ih = h - t - b;
  const y = (v) => t + ih - ((v - lo) / (hi - lo)) * ih;
  return { y, lo, hi };
}

// "x,y x,y …" points for a polyline over a series, reading `field` (skips gaps).
export function polyPoints(series, xOf, yOf, field) {
  return (series || [])
    .filter((p) => Number.isFinite(p[field]))
    .map((p) => `${xOf(p.ymd).toFixed(1)},${yOf(p[field]).toFixed(1)}`)
    .join(" ");
}

// A filled band path (upper edge left→right, lower edge right→left) between lo/hi.
export function bandPath(series, xOf, yOf) {
  const pts = (series || []).filter((p) => Number.isFinite(p.lo) && Number.isFinite(p.hi));
  if (pts.length < 2) return "";
  const top = pts.map((p) => `${xOf(p.ymd).toFixed(1)},${yOf(p.hi).toFixed(1)}`);
  const bot = pts.slice().reverse().map((p) => `${xOf(p.ymd).toFixed(1)},${yOf(p.lo).toFixed(1)}`);
  return `M${top.join(" L")} L${bot.join(" L")} Z`;
}

// The nearest weight-series index to a pixel x — the scrub SNAPS to a real day, never
// a raw pixel. Returns -1 for an empty series.
export function nearestIndex(series, px, windowStart, windowEnd) {
  if (!series || !series.length) return -1;
  const x = xScale(windowStart, windowEnd);
  let best = 0;
  let bestD = Infinity;
  series.forEach((p, i) => {
    const d = Math.abs(x(p.ymd) - px);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// Evenly-spaced day labels across the DATE DOMAIN [windowStart, windowEnd] — spaced by
// date, not by data index, so they're always evenly spread in x and never bunch/overlap,
// no matter how the weigh-ins cluster or how wide the range is. Dedupes so a short window
// (fewer real days than `count`) yields fewer labels, not repeats.
export function dateTicks(windowStart, windowEnd, count = 4) {
  const total = dayIndex(windowEnd, windowStart);
  if (!Number.isFinite(total) || total <= 0) return [windowStart];
  const steps = Math.min(count, total + 1); // never more labels than there are days
  const out = [];
  for (let i = 0; i < steps; i++) {
    out.push(shiftYMD(windowStart, Math.round((i / (steps - 1)) * total)));
  }
  return [...new Set(out)];
}

export { humanDayShort };
