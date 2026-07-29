// LifeOS — Gym V2 (Piece 8): Body-Part Balance grouping (PURE — display transform over
// muscleBalance's per-window ranked output).
//
// TAXONOMY (owner-locked): every real primary_muscle_group maps to Upper / Lower / Core, or is
// EXCLUDED. Excluded groups (cardio, full_body, other — and anything NOT in the map, incl. null)
// never appear in Balance, in any tab or window. Percentages are RENORMALISED against the total
// of the INCLUDED groups only (per the active metric) — so the three buckets sum to 100% and no
// share silently leaks to an excluded group.
//
// %  = a group's share of the GRAND included total (comparable across buckets; a true "balance"
//      read). MINOR = a group under MINOR_PCT of that grand total; minors collapse into ONE
//      "(minor)" line inside their OWN bucket (never a standalone bucket).
// TREND = the group's grand-% now minus its grand-% in the immediately prior equal-length window
//      (percentage-POINTS). Neutral/descriptive — a shift in share, not a good/bad signal.

export const REGION = {
  shoulders: "upper", triceps: "upper", biceps: "upper", chest: "upper",
  upper_back: "upper", lats: "upper", traps: "upper", forearms: "upper", neck: "upper",
  quadriceps: "lower", hamstrings: "lower", glutes: "lower", calves: "lower",
  abductors: "lower", adductors: "lower",
  abdominals: "core", lower_back: "core",
  // cardio / full_body / other (and any unmapped value) → EXCLUDED by omission.
};
export const BUCKETS = [
  { id: "upper", label: "Upper body" },
  { id: "lower", label: "Lower body" },
  { id: "core", label: "Core" },
];
export const MINOR_PCT = 3; // grand-% below this collapses into its bucket's "(minor)" line

const valueOf = (g, metric) => (metric === "volume" ? g.volume : g.sets) || 0;

function grandPctMap(ranked, metric) {
  const included = (ranked || []).filter((g) => REGION[g.muscle]);
  const grand = included.reduce((t, g) => t + valueOf(g, metric), 0) || 1;
  const map = {};
  for (const g of included) map[g.muscle] = (valueOf(g, metric) / grand) * 100;
  return { included, grand, map };
}

// balanceView(ranked, priorRanked, metric) → the full display model.
//   { radar:[{muscle,value,pct}]≤7, radarMax, groups:[{id,label,rows,minorRow,total}], hasData }
export function balanceView(ranked, priorRanked, metric = "sets") {
  const { included, grand } = grandPctMap(ranked, metric);
  const prior = grandPctMap(priorRanked, metric).map;

  const rows = included.map((g) => {
    const value = valueOf(g, metric);
    const pct = (value / grand) * 100;
    const p = prior[g.muscle];
    return { muscle: g.muscle, region: REGION[g.muscle], value, pct, trend: p == null ? null : pct - p };
  });

  // Radar = the top 7 included groups by the active metric (any bucket), dynamic max scale.
  // Carries `trend` (share pp-change vs the prior window) so the hover card can show an arrow (Piece 18).
  const radar = rows
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)
    .map((r) => ({ muscle: r.muscle, value: r.value, pct: r.pct, trend: r.trend }));
  const radarMax = radar.length ? Math.max(...radar.map((r) => r.value)) : 0;

  // Grouped list: per bucket, major rows (≥3%) sorted desc + one collapsed (minor) line.
  const groups = BUCKETS.map((b) => {
    const inB = rows.filter((r) => r.region === b.id).sort((a, b) => b.pct - a.pct);
    const major = inB.filter((r) => r.pct >= MINOR_PCT);
    const minors = inB.filter((r) => r.pct < MINOR_PCT);
    const minorRow = minors.length
      ? {
          minor: true,
          count: minors.length,
          pct: minors.reduce((t, r) => t + r.pct, 0),
          value: minors.reduce((t, r) => t + r.value, 0),
          names: minors.map((r) => r.muscle),
        }
      : null;
    return { id: b.id, label: b.label, rows: major, minorRow, total: inB.reduce((t, r) => t + r.pct, 0) };
  }).filter((b) => b.rows.length || b.minorRow);

  return { radar, radarMax, groups, metric, hasData: included.length > 0 };
}
