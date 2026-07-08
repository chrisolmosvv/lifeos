// LifeOS — Health → Sleep (V2 P1): bed/wake RHYTHM clock math (PURE). Extracted from
// healthSleep.js to keep that file under the size guard. Everything here reasons about
// CLOCK times (minutes-after-midnight, Amsterdam) on a circle, using the SAME noon-anchor
// convention bedtimeConsistency's std-dev uses — so the mean, median, and min→max
// envelope all agree on how the evening + small hours order without the midnight wrap.

import { amsClockMinutes } from "./gymDates.js";

// Minutes-after-midnight → minutes-after-noon (noon = 0). Self-inverse: applying it twice
// is a +1440 fold ≡ identity, so it both anchors and un-anchors.
function anchorNoon(min) {
  return ((min + 720) % 1440 + 1440) % 1440;
}

// CIRCULAR mean of clock times → minutes-after-midnight, handling the midnight wrap:
// 23:50 & 00:10 average to 00:00, not noon. Each time is an angle; we average the unit
// vectors and convert back. null for an empty list.
export function averageClock(minsList) {
  const xs = (minsList || []).filter((m) => Number.isFinite(m));
  if (xs.length === 0) return null;
  let sx = 0, sy = 0;
  for (const m of xs) {
    const a = (m / 1440) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  let a = Math.atan2(sy / xs.length, sx / xs.length);
  if (a < 0) a += 2 * Math.PI;
  return ((a / (2 * Math.PI)) * 1440) % 1440; // fold 24:00 → 00:00, keep in [0,1440)
}

// CIRCULAR MEDIAN: anchor to minutes-after-noon, take the plain median, un-anchor.
// Robust to one odd night (a 4am bedtime can't drag it). null for an empty list.
export function circularMedianClock(minsList) {
  const xs = (minsList || []).filter((m) => Number.isFinite(m)).map(anchorNoon).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  const med = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return anchorNoon(med); // self-inverse → back to clock minutes
}

// The FULL earliest→latest envelope (noon-anchored extremes, un-anchored). Feeds the
// rhythm dial's spread band: every night sits inside [min, max]; wide = variable, tight =
// consistent. → { min, max } clock minutes (nulls if empty).
export function clockExtent(minsList) {
  const xs = (minsList || []).filter((m) => Number.isFinite(m)).map(anchorNoon);
  if (xs.length === 0) return { min: null, max: null };
  return { min: anchorNoon(Math.min(...xs)), max: anchorNoon(Math.max(...xs)) };
}

// Average, median AND min→max envelope of bedtime + wake clock for nights in [start, end]
// inclusive. → { bedAvgMin, wakeAvgMin, bedMedMin, wakeMedMin, bedMin, bedMax, wakeMin,
// wakeMax, nights } (nulls if none). (S6 summary line + V2 P1 rhythm dials.)
export function rangeBedWakeAverages(rows, start, end) {
  const beds = [], wakes = [];
  for (const r of rows || []) {
    if (!r?.night_date || r.night_date < start || r.night_date > end) continue;
    const b = amsClockMinutes(r.in_bed_at);
    if (b != null) beds.push(b);
    const w = amsClockMinutes(r.woke_at);
    if (w != null) wakes.push(w);
  }
  const bedExt = clockExtent(beds), wakeExt = clockExtent(wakes);
  return {
    bedAvgMin: averageClock(beds),
    wakeAvgMin: averageClock(wakes),
    bedMedMin: circularMedianClock(beds),
    wakeMedMin: circularMedianClock(wakes),
    bedMin: bedExt.min, bedMax: bedExt.max,
    wakeMin: wakeExt.min, wakeMax: wakeExt.max,
    nights: Math.max(beds.length, wakes.length),
  };
}
