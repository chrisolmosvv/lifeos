// LifeOS — Focus module P1: display strings (PURE presentation helpers). No data,
// no fetch, no React — just turns the calc layer's raw seconds/minutes/ratings into
// the text the surfaces show. Kept apart from focusCalc so the maths stays testable
// and the wording lives in one place.

// Whole-minute rounding for logged time (sub-minute noise never shows). 0s → "0m".
function roundMin(seconds) {
  return Math.round((Number(seconds) || 0) / 60);
}

// Long duration: "2h 15m" / "45m" / "3h". For the centre total + the form section.
export function formatDuration(seconds) {
  const m = roundMin(seconds);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
}

// Compact duration for the tiny task-row tag: "2h15" / "45m" (no space).
export function formatDurationShort(seconds) {
  const m = roundMin(seconds);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h${String(mm).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${mm}m`;
}

// "14:30" from minutes-after-midnight (Amsterdam). null → "" (a running row).
export function clockFromMin(min) {
  if (min == null || !Number.isFinite(min)) return "";
  const h = Math.floor(min / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// "14:30 – 16:00" for a ledger row.
export function clockRange(startMin, endMin) {
  const a = clockFromMin(startMin);
  const b = clockFromMin(endMin);
  return b ? `${a} – ${b}` : a;
}

// Compact stars "★★★★☆" for a 1–5 rating; null/0 → "" (rating is optional).
export function stars(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1) return "";
  const n = Math.min(5, Math.max(1, Math.round(r)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// The lead trend line from weekVsTrailingAvg(). Discloses "N weeks so far" until the
// baseline is full, and "building your baseline" in weeks 0–1 (no baseline yet).
//   → { total: "8h", delta: "+1h vs 6-wk avg" | null, note: "3 weeks so far" | null }
export function trendLine({ thisWeekSeconds, deltaSeconds, weeksSoFar, baselineFull }) {
  const total = formatDuration(thisWeekSeconds);
  if (deltaSeconds == null || weeksSoFar === 0) {
    return { total, delta: null, note: "building your baseline" };
  }
  const sign = deltaSeconds >= 0 ? "+" : "−";
  const delta = `${sign}${formatDuration(Math.abs(deltaSeconds))} vs ${weeksSoFar}-wk avg`;
  const note = baselineFull ? null : `${weeksSoFar} week${weeksSoFar === 1 ? "" : "s"} so far`;
  return { total, delta, note };
}
