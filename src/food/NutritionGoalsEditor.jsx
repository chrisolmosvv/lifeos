import { useState } from "react";

// NutritionGoalsEditor — the goals popover body (F6), reusing the S9 append-only path via the
// caller's useGoalWrites. CALORIES required; protein/carbs/fat OPTIONAL (macro goals are now
// optional — the F0 "full P/C/F" lock is relaxed). Save sets/updates the filled fields and
// CLEARS any macro that was set but is now blank; the Clear button (confirm) clears all four.
//
// Props: goalMap (resolved), onSubmit(setList, clearList), onClearAll(), onClose().

const FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal", req: true },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export default function NutritionGoalsEditor({ goalMap, onSubmit, onClearAll, onClose }) {
  const init = {};
  for (const f of FIELDS) {
    const v = goalMap.get(f.key)?.target_value;
    init[f.key] = v != null ? String(v) : "";
  }
  const [vals, setVals] = useState(init);
  const [confirming, setConfirming] = useState(false);

  const calNum = Number(vals.calories);
  const valid = vals.calories.trim() !== "" && Number.isFinite(calNum) && calNum > 0;
  const hasAny = FIELDS.some((f) => goalMap.get(f.key)?.target_value != null);

  const submit = () => {
    const setList = [];
    const clearList = [];
    for (const f of FIELDS) {
      const raw = String(vals[f.key]).trim();
      const wasSet = goalMap.get(f.key)?.target_value != null;
      if (raw === "") {
        if (wasSet && !f.req) clearList.push(f.key); // a blanked macro → clear it
        continue;
      }
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setList.push({ goal_type: f.key, target_value: n, unit: f.unit, direction: null });
    }
    onSubmit(setList, clearList);
  };

  return (
    <div className="ngoals">
      {FIELDS.map((f) => (
        <label key={f.key} className="ngoals-field">
          <span className="ngoals-name">{f.label}{f.req ? " *" : ""}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={vals[f.key]}
            placeholder={f.req ? "required" : "optional"}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
          />
          <span className="ngoals-unit">{f.unit}</span>
        </label>
      ))}

      {confirming ? (
        <div className="ngoals-confirm">
          <span>Clear all targets?</span>
          <button type="button" className="ngoals-btn" onClick={() => setConfirming(false)}>Keep</button>
          <button type="button" className="ngoals-btn ngoals-danger" onClick={onClearAll}>Clear</button>
        </div>
      ) : (
        <div className="ngoals-actions">
          {hasAny && (
            <button type="button" className="ngoals-btn ngoals-clear" onClick={() => setConfirming(true)}>Clear</button>
          )}
          <span className="ngoals-spacer" />
          <button type="button" className="ngoals-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ngoals-btn ngoals-save" disabled={!valid} onClick={submit}>Save</button>
        </div>
      )}
    </div>
  );
}
