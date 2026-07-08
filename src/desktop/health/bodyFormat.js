// LifeOS — Health → Body (S7): display formatting (PURE, presentation-only).
//
// Per-metric labels / units / decimals + the formatters the Body tiles use. No data
// logic, no Amsterdam-day bucketing (that's gymDates), no derived numbers (those are
// the calc layer). Mirrors healthFormat.js / gymFormat.js in spirit.

// One row per body metric: how it's labelled and rounded for display. `tight` keeps
// the unit hard against the number (18.2% ), otherwise a space (86.1 kg).
export const METRIC_META = {
  weight: { label: "Weight", unit: "kg", decimals: 2 }, // 2dp — the 2nd decimal carries goal-tracking signal
  body_fat: { label: "Body fat", unit: "%", decimals: 1, tight: true },
  lean_mass: { label: "Lean mass", unit: "kg", decimals: 1 },
  resting_heart_rate: { label: "Resting HR", unit: "bpm", decimals: 0 },
  respiratory_rate: { label: "Respiratory", unit: "/min", decimals: 1 },
  // V2 P0c — generic body point readings (no UI yet; config so the numbers format).
  bmi: { label: "BMI", unit: "", decimals: 1 },
  blood_oxygen: { label: "Blood oxygen", unit: "%", decimals: 0, tight: true },
  // V2 P2 — Energy group (activity_hourly daily totals, kcal).
  active_energy: { label: "Active energy", unit: "kcal", decimals: 0 },
  resting_energy: { label: "Resting energy", unit: "kcal", decimals: 0 },
};

export function metaFor(metric) {
  return METRIC_META[metric] || { label: metric, unit: "", decimals: 1 };
}

// A metric value → its rounded number string ("86.1", "74"). null/NaN → "—".
export function fmtNum(metric, v) {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(metaFor(metric).decimals);
}

// A metric value → "86.1 kg" / "18.2%" / "74 bpm" (unit spacing per `tight`).
// null/NaN → "—" with no unit.
export function fmtFull(metric, v) {
  if (!Number.isFinite(v)) return "—";
  const m = metaFor(metric);
  return `${v.toFixed(m.decimals)}${m.tight ? "" : " "}${m.unit}`;
}

// A trend's raw gap → an unsigned magnitude string in the metric's units, for the
// arrow row ("0.4 kg", "2%"). The arrow itself carries the direction. null → "—".
export function fmtDelta(metric, diff) {
  if (!Number.isFinite(diff)) return "—";
  const m = metaFor(metric);
  return `${Math.abs(diff).toFixed(m.decimals)}${m.tight ? "" : " "}${m.unit}`;
}
