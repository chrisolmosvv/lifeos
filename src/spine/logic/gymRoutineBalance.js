// LifeOS — Health → Gym V2 (Piece 19): SESSION-BASED body-part balance (PURE — calc layer).
//
// The Region view (gymBalance.js / gymBalanceGroups.js) aggregates purely by muscle and throws away
// which routine a set belonged to. This parallel path PRESERVES each workout's routine tag
// (classifyRoutine, Piece 3 — the same title-prefix rule every other routine feature uses), so a
// muscle's sets can be split by WHICH routine's sessions trained them. A muscle can therefore appear
// under MORE THAN ONE routine (e.g. shoulders under both Push and Pull — real: pull-day rear delts),
// each instance carrying only that routine's own set-count / volume.
//
// Two grains come out: per-routine TOTALS (all working sets in that routine's sessions — feeds the
// Push:Pull:Legs headline ratio, matching how the recon measured) and per-routine per-MUSCLE totals
// (real muscles only — feeds the × deviation breakdown). Non-muscular pseudo-groups
// (cardio/full_body/other/null) are dropped from the muscle breakdown exactly as the Region view
// drops them; abdominals & lower_back ARE real muscles and DO appear (they have no static PPL home —
// which is the whole reason this is session-based, not a static muscle→PPL map).

import { lastNDaysSet, amsYMD } from "./gymDates.js";
import { isWorking, setVolume } from "./gymCalc.js";
import { classifyRoutine } from "./gymRoutine.js";

const NON_MUSCLE = new Set(["cardio", "full_body", "other"]);
const mk = () => ({ sets: 0, volume: 0, muscles: {} });

// routineBalance(workouts, { days, now }) → { push, pull, legs, other } where each is
//   { sets, volume, muscles: { <muscle>: { sets, volume } } }.  Window = the SAME lastNDaysSet the
//   Region view / band use, so both slices of Balance read the identical set of days.
export function routineBalance(workouts, { days = 30, now = Date.now() } = {}) {
  const window = lastNDaysSet(days, now);
  const R = { push: mk(), pull: mk(), legs: mk(), other: mk() };
  for (const w of workouts || []) {
    if (!window.has(amsYMD(w.started_at))) continue;
    const bucket = R[classifyRoutine(w.title)];
    for (const ex of w.exercises || []) {
      const muscle = ex.muscle || null;
      for (const s of ex.sets || []) {
        if (!isWorking(s)) continue; // working sets only, matching every other Balance measure
        const v = setVolume(s);
        bucket.sets += 1;
        bucket.volume += v;
        if (muscle && !NON_MUSCLE.has(muscle)) {
          const m = (bucket.muscles[muscle] ||= { sets: 0, volume: 0 });
          m.sets += 1;
          m.volume += v;
        }
      }
    }
  }
  return R;
}

// The three real routine SIDES (Other is never a side — it's the footnote bucket).
export const ROUTINE_SIDES = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
];

// routineView(R, metric) → the display model for one metric ('sets' | 'volume'):
//   { ratio:[{id,label,value,pct}]   — Push:Pull:Legs %, normalised to P+P+L ONLY (Other excluded),
//     columns:[{id,label,rows:[{muscle,value,mult}]}]  — per side, muscles desc, × deviation-from-even,
//     otherValue                     — Other-session total in this metric (the footnote number),
//     hasPPL }                       — any Push/Pull/Legs work at all this window
// × multiplier = actualShareWithinSide × groupCountWithinSide (even share within a side = 1 / #groups
//   appearing in that side). 1.0× = its fair share; >1 over-trained, <1 under- — scoped to that side only.
export function routineView(R, metric = "sets") {
  const val = (o) => (metric === "volume" ? o.volume : o.sets) || 0;
  const pplTotal = ROUTINE_SIDES.reduce((t, s) => t + val(R[s.id]), 0);
  const ratio = ROUTINE_SIDES.map((s) => ({
    id: s.id,
    label: s.label,
    value: val(R[s.id]),
    pct: pplTotal ? (val(R[s.id]) / pplTotal) * 100 : 0,
  }));
  const columns = ROUTINE_SIDES.map((s) => {
    const entries = Object.entries(R[s.id].muscles).map(([muscle, o]) => ({ muscle, value: val(o) }));
    const total = entries.reduce((t, e) => t + e.value, 0);
    const n = entries.length || 1;
    const rows = entries
      .map((e) => ({ muscle: e.muscle, value: e.value, mult: total ? (e.value / total) * n : 0 }))
      .sort((a, b) => b.value - a.value);
    return { id: s.id, label: s.label, rows };
  });
  return { ratio, columns, otherValue: val(R.other), hasPPL: pplTotal > 0 };
}
