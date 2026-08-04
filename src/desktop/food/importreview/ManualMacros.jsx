// LifeOS — Food → import review MANUAL MACROS (Piece 10). The third resolution exit, restored: when
// an ingredient has real calories but no correct DB match and no weight, the owner hand-enters its
// numbers. Lives INSIDE the Finder popover (not a second overlay), styled to it.
//
// ★ BASIS — stored PER THE STATED AMOUNT, NOT per 100g. recipeCalc consumes manual_macros AS-IS with
//   NO division, so the numbers are the ingredient's actual contribution for the amount the recipe
//   states ("1/3 cup", "1 pinch"). This is the OPPOSITE of the per-100g convention everywhere else —
//   storing per-100g would make a pinch read up to 200× its true value, and that number reaches
//   logSnapshot when the recipe is cooked (a corrupted calorie in the owner's history). The old
//   ManualMacrosPanel worked the same way; the convention is pre-existing. The label names the amount.
//
// A grams WEIGHT is required — not a divisor (there is no division), but the thing that was missing:
// it fills the ingredient's grams so it stops being unweighted, turning a workaround into a real
// resolution. Fibre is optional and defaults to zero (kept so hand-entered rows aren't quietly
// different from every other ingredient, which stores fibre).

import { useState } from "react";

const NUMS = [["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"], ["fibre", "Fibre", "g"]];
const numOrNull = (s) => { const t = String(s ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isFinite(n) && n >= 0 ? n : null; };

// The amount phrase the numbers are FOR — "½ tsp black pepper", "black pepper" if no amount.
function forLabel(amount, unit, name) {
  const nm = name || "this ingredient";
  if (amount == null) return nm;
  const u = unit && unit !== "item" ? ` ${unit}` : "";
  return `${amount}${u} ${nm}`.trim();
}

export default function ManualMacros({ name, amount, unit, initial, initialGrams, onSave, onClear, onSearch }) {
  const [vals, setVals] = useState(() => { const o = {}; for (const [k] of NUMS) o[k] = initial?.[k] != null ? String(initial[k]) : ""; return o; });
  const [grams, setGrams] = useState(initialGrams != null ? String(initialGrams) : "");
  const g = numOrNull(grams);
  const ok = numOrNull(vals.kcal) != null && g != null && g > 0; // calories + a real weight
  const save = () => {
    const m = {};
    for (const [k] of NUMS) { const v = numOrNull(vals[k]); m[k] = k === "kcal" ? v : (v ?? 0); } // fibre + P/C/F blank → 0
    onSave(m, g);
  };

  return (
    <div className="iv-mm">
      <label>your numbers — for <b>{forLabel(amount, unit, name)}</b></label>
      <div className="iv-mm-wt">
        <span className="iv-mm-wt-lbl">it weighs</span>
        <input type="number" inputMode="decimal" min="0" value={grams} placeholder="—" onChange={(e) => setGrams(e.target.value)} />
        <span className="iv-mm-unit">g</span>
      </div>
      <div className="iv-mm-grid">
        {NUMS.map(([k, label, u]) => (
          <label key={k} className="iv-mm-num">
            <span className="iv-mm-lbl">{label}{k === "fibre" ? " (opt)" : ""}</span>
            <span className="iv-mm-in">
              <input type="number" inputMode="decimal" min="0" value={vals[k]} placeholder="—"
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
              <span className="iv-mm-unit">{u}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="iv-mm-acts">
        <button type="button" className="iv-mm-alt" onClick={onSearch}>‹ match a food instead</button>
        {initial && <button type="button" className="iv-mm-clear" onClick={onClear}>clear</button>}
        <button type="button" className="pri" disabled={!ok} onClick={save}>Save numbers</button>
      </div>
    </div>
  );
}
