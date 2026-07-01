import { useState } from "react";
import "./foodGoals.css";

// ManualMacrosPanel (V2 P6) — the import-review [manual] rescue: hand-enter a flagged ingredient's
// macros (kcal/P/C/F for the amount used). Stored as recipe_ingredients.manual_macros — an estimate
// the recipe page shows with a ~ (recipeCalc treats manual_macros as a used-as-is estimate). Reuses
// the estimate panel's chrome. Props: name, initial (manual_macros|null), onSave(macros), onClose.
const NUMS = [["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"]];
const numOrNull = (s) => { if (s == null || String(s).trim() === "") return null; const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : null; };

export default function ManualMacrosPanel({ name, initial, onSave, onClose }) {
  const [vals, setVals] = useState(() => { const o = {}; for (const [k] of NUMS) o[k] = initial?.[k] != null ? String(initial[k]) : ""; return o; });
  const ok = numOrNull(vals.kcal) != null;
  const save = () => { const m = {}; for (const [k] of NUMS) m[k] = numOrNull(vals[k]); onSave(m); };

  return (
    <div className="fgoal-backdrop" onMouseDown={onClose}>
      <div className="fgoal fest" role="dialog" aria-modal="true" aria-label="Enter macros" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fgoal-head">
          <span className="fgoal-eyebrow">Macros for “{name || "ingredient"}”</span>
          <button type="button" className="fgoal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <p className="fest-note">Enter for the amount used in this recipe — stored as an estimate (~).</p>
        <div className="fest-grid">
          {NUMS.map(([k, label, unit]) => (
            <label key={k} className="fest-num">
              <span className="fest-num-label">{label}</span>
              <span className="fest-num-input">
                <input type="number" inputMode="decimal" min="0" value={vals[k]} placeholder="—" onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
                <span className="fest-num-unit">{unit}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="feep-manage">
          <span className="fgoal-spacer" />
          <button type="button" className="fgoal-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="fgoal-btn fgoal-save" disabled={!ok} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
