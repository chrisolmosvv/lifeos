// LifeOS — Food → import review MANUAL MACROS (Piece 10). The third resolution exit, restored: when
// an ingredient has real calories but no correct DB match and no weight, the owner hand-enters its
// numbers. Lives INSIDE the Finder popover (not a second overlay), styled to it. BASIS: the numbers
// are FOR THE AMOUNT AS THE RECIPE STATES IT (recipeCalc uses manual_macros as-is, unscaled) — the
// label says so with the concrete amount, because a number entered against the wrong basis is a
// silent error in the owner's food history. Stored as recipe_ingredients.manual_macros, shown "~".

import { useState } from "react";

const NUMS = [["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"]];
const numOrNull = (s) => { const t = String(s ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isFinite(n) && n >= 0 ? n : null; };

// The amount phrase the numbers are FOR — "½ tsp black pepper", "black pepper" if no amount.
function forLabel(amount, unit, name) {
  const nm = name || "this ingredient";
  if (amount == null) return nm;
  const u = unit && unit !== "item" ? ` ${unit}` : "";
  return `${amount}${u} ${nm}`.trim();
}

export default function ManualMacros({ name, amount, unit, initial, onSave, onClear, onSearch }) {
  const [vals, setVals] = useState(() => { const o = {}; for (const [k] of NUMS) o[k] = initial?.[k] != null ? String(initial[k]) : ""; return o; });
  const ok = numOrNull(vals.kcal) != null; // kcal is what makes an ingredient "estimated" in recipeCalc
  const save = () => { const m = {}; for (const [k] of NUMS) m[k] = numOrNull(vals[k]); onSave(m); };

  return (
    <div className="iv-mm">
      <label>your numbers — for <b>{forLabel(amount, unit, name)}</b></label>
      <div className="iv-mm-grid">
        {NUMS.map(([k, label, u]) => (
          <label key={k} className="iv-mm-num">
            <span className="iv-mm-lbl">{label}</span>
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
