import { useState } from "react";
import "./foodGoals.css";

// NutritionGoalsEditor (V2 P4) — a FULL-SCREEN calm goals editor (was a popover). CALORIES required
// (large serif input); protein/carbs/fat OPTIONAL (blank reads "—", each has its own Clear). The
// ±10% on-target BAND is surfaced here (a plain line + a hairline diagram) so the rule is legible
// where it's set. Save/Clear/Clear-all go through the SHARED S9 write path via the caller (append-
// only; Clear keeps the S9 CONFIRM) — EXTENDED for UX only, never forked (Sleep/Body share it).
//
// Props: goalMap (resolved), onSubmit(setList, clearList), onClearAll(), onClose().
const FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal", req: true },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];
const commas = (n) => Math.round(n).toLocaleString("en-US");

export default function NutritionGoalsEditor({ goalMap, onSubmit, onClearAll, onClose }) {
  const init = {};
  for (const f of FIELDS) {
    const v = goalMap.get(f.key)?.target_value;
    init[f.key] = v != null ? String(v) : "";
  }
  const [vals, setVals] = useState(init);
  const [confirming, setConfirming] = useState(false);

  const calNum = Number(vals.calories);
  const calOk = vals.calories.trim() !== "" && Number.isFinite(calNum) && calNum > 0;
  const hasAny = FIELDS.some((f) => goalMap.get(f.key)?.target_value != null);

  const submit = () => {
    const setList = [];
    const clearList = [];
    for (const f of FIELDS) {
      const raw = String(vals[f.key]).trim();
      const wasSet = goalMap.get(f.key)?.target_value != null;
      if (raw === "") { if (wasSet && !f.req) clearList.push(f.key); continue; }
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setList.push({ goal_type: f.key, target_value: n, unit: f.unit, direction: null });
    }
    onSubmit(setList, clearList);
  };

  const clearOne = (key) => setVals((v) => ({ ...v, [key]: "" }));

  return (
    <div className="fgoal-backdrop" onMouseDown={onClose}>
      <div className="fgoal" role="dialog" aria-modal="true" aria-label="Daily targets" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fgoal-head">
          <span className="fgoal-eyebrow">Daily targets</span>
          <button type="button" className="fgoal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <label className="fgoal-cal">
          <span className="fgoal-cal-label">Calories *</span>
          <span className="fgoal-cal-input">
            <input type="number" inputMode="numeric" min="0" value={vals.calories} placeholder="0"
              onChange={(e) => setVals((v) => ({ ...v, calories: e.target.value }))} autoFocus />
            <span className="fgoal-cal-unit">kcal</span>
          </span>
        </label>

        {calOk && (
          <div className="fgoal-band">
            <div className="fgoal-band-bar" aria-hidden="true"><span className="fgoal-band-zone" /></div>
            <p className="fgoal-band-line">On target within ±10% — {commas(calNum * 0.9)}–{commas(calNum * 1.1)} kcal</p>
          </div>
        )}

        <div className="fgoal-macros">
          {FIELDS.filter((f) => !f.req).map((f) => (
            <label key={f.key} className="fgoal-macro">
              <span className="fgoal-macro-label">{f.label}</span>
              <span className="fgoal-macro-input">
                <input type="number" inputMode="numeric" min="0" value={vals[f.key]} placeholder="—"
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
                <span className="fgoal-macro-unit">{f.unit}</span>
              </span>
              {vals[f.key].trim() !== "" && (
                <button type="button" className="fgoal-clear-one" onClick={() => clearOne(f.key)}>Clear</button>
              )}
            </label>
          ))}
        </div>

        {confirming ? (
          <div className="fgoal-confirm">
            <span>Clear all targets? This can’t be undone.</span>
            <button type="button" className="fgoal-btn" onClick={() => setConfirming(false)}>Keep</button>
            <button type="button" className="fgoal-btn fgoal-danger" onClick={onClearAll}>Clear all</button>
          </div>
        ) : (
          <div className="fgoal-actions">
            {hasAny && <button type="button" className="fgoal-btn fgoal-clear" onClick={() => setConfirming(true)}>Clear all</button>}
            <span className="fgoal-spacer" />
            <button type="button" className="fgoal-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="fgoal-btn fgoal-save" disabled={!calOk} onClick={submit}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}
