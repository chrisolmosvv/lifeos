// LifeOS — Sleep: hypnogram PRESENTATION helper (not metric logic).
//
// Turns the raw `segments` jsonb (an ordered array of {stage,start,end}) into
// drawable blocks for the time-axis graph, and turns per-night stage TOTALS into a
// proportion band for the fallback (older nights with totals but no segments). Also
// the stage display labels + CSS shade classes, and the bedtime-regularity word.
// Pure presentation: no Supabase, no derived metrics — the numbers come from S5.

// Stage → display label + CSS shade class. Ink shades across the board; terracotta
// is reserved for Deep (the "best" stage) via the .deep class in CSS. The lowercase
// inbed/asleep stages map to sensible labels.
const STAGE_META = {
  deep: { label: "Deep", cls: "deep" },
  rem: { label: "REM", cls: "rem" },
  core: { label: "Core", cls: "core" },
  awake: { label: "Awake", cls: "awake" },
  inbed: { label: "In bed", cls: "inbed" },
  asleep: { label: "Asleep", cls: "asleep" },
};
function metaFor(stage) {
  return STAGE_META[String(stage || "").toLowerCase()] || { label: String(stage || "—"), cls: "other" };
}
export function stageLabel(stage) {
  return metaFor(stage).label;
}
export function stageClass(stage) {
  return metaFor(stage).cls;
}

// Parse raw segments → chronological drawable blocks. Each block carries ms bounds
// (the component derives left%/width% from the night's axis) + a minute duration.
// Returns [] when segments are missing/empty/all-invalid → caller uses the band.
export function parseSegments(segments) {
  if (!Array.isArray(segments)) return [];
  const blocks = [];
  for (const s of segments) {
    const startMs = Date.parse(s?.start);
    const endMs = Date.parse(s?.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
    const m = metaFor(s?.stage);
    blocks.push({
      stage: s.stage,
      label: m.label,
      cls: m.cls,
      startMs,
      endMs,
      durMin: (endMs - startMs) / 60000,
    });
  }
  blocks.sort((a, b) => a.startMs - b.startMs);
  return blocks;
}

// The proportion-band fallback from per-night stage TOTALS (the S5 lastNight.stages
// shape, or a raw row). Order Deep → Core → REM → Awake; pct of the summed minutes.
// [] if there are no stage minutes to show.
export function proportionBand(stages) {
  const parts = [
    { key: "deep", min: stages?.deep?.min },
    { key: "core", min: stages?.core?.min },
    { key: "rem", min: stages?.rem?.min },
    { key: "awake", min: stages?.awake?.min },
  ].filter((p) => Number.isFinite(p.min) && p.min > 0);
  const total = parts.reduce((a, p) => a + p.min, 0);
  if (total <= 0) return [];
  return parts.map((p) => ({ ...metaFor(p.key), stage: p.key, min: p.min, pct: Math.round((p.min / total) * 100) }));
}

// Bedtime regularity WORD from S5's std-dev spread (minutes). ONE tunable constant
// (sane defaults; we tune on real data). Presentation classification, not a metric.
export const REGULARITY_MIN = { steady: 20, fair: 45 }; // <20 steady · <45 fairly steady · else variable
export function regularityLabel(stdDevMin) {
  if (!Number.isFinite(stdDevMin)) return null;
  if (stdDevMin < REGULARITY_MIN.steady) return "steady";
  if (stdDevMin < REGULARITY_MIN.fair) return "fairly steady";
  return "variable";
}
