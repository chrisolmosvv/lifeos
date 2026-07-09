import { useState } from "react";
import { MEAL_SLOTS } from "../../spine/logic/foodCalc";
import { estimateMeal } from "../../spine/data/estimateClient";
import "./foodGoals.css";

// EstimateMealPanel (V2 P5, Feature B) — describe a meal → Gemini ballpark (free key) → the FOUR
// numbers pre-fill, live-editable (dashed-terracotta when AI-filled) → confirm → log a ONE-OFF
// snapshot (recipe_id null, is_estimated true). The numbers are ALWAYS hand-editable: if the estimate
// fails / quota's out / the kill-switch is on, the panel is simply a manual 4-number form — the
// deterministic fallback, no hard stop. Meal slot pre-fills to time-of-day. Logs via the caller's
// optimistic add (a logEntry wrapper — the manual path), never forking the write.
//
// Props: defaultSlot, onLog(snapshot {kcal,protein,carbs,fat}, slot), onClose.
const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };
const NUMS = [["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"]];
const numOrNull = (s) => { if (s == null || String(s).trim() === "") return null; const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : null; };
const r1 = (n) => Math.round(n * 10) / 10;

export default function EstimateMealPanel({ defaultSlot, onLog, onClose }) {
  const [description, setDescription] = useState("");
  const [vals, setVals] = useState({});
  const [slot, setSlot] = useState(defaultSlot || "snacks");
  const [busy, setBusy] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [failed, setFailed] = useState(false);

  const runEstimate = async () => {
    if (description.trim().length < 2) return;
    setBusy(true); setFailed(false);
    const res = await estimateMeal(description.trim());
    setBusy(false);
    if (res.ok) {
      setVals({ kcal: String(Math.round(res.estimate.kcal)), protein: String(r1(res.estimate.protein)), carbs: String(r1(res.estimate.carbs)), fat: String(r1(res.estimate.fat)) });
      setEstimated(true);
    } else {
      setFailed(true); // fields stay hand-editable — the manual fallback
    }
  };

  const kcalOk = numOrNull(vals.kcal) != null;
  const log = () => {
    const snap = {};
    for (const [k] of NUMS) snap[k] = numOrNull(vals[k]) ?? 0;
    onLog(snap, slot, description.trim()); // the description becomes the entry's label
  };

  return (
    <div className="fgoal-backdrop" onMouseDown={onClose}>
      <div className="fgoal fest" role="dialog" aria-modal="true" aria-label="Estimate this meal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fgoal-head">
          <span className="fgoal-eyebrow">Estimate this meal</span>
          <button type="button" className="fgoal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <label className="fest-desc">
          <span className="fest-desc-label">Describe it</span>
          <textarea rows={2} value={description} placeholder="e.g. a bowl of chicken curry with rice" onChange={(e) => setDescription(e.target.value)} autoFocus />
        </label>
        <button type="button" className="fgoal-btn fest-estimate" disabled={busy || description.trim().length < 2} onClick={runEstimate}>
          {busy ? "Estimating…" : "Estimate with AI"}
        </button>
        {failed && <p className="fest-note">Couldn’t estimate right now — enter the numbers by hand below.</p>}
        {estimated && <p className="fest-note fest-note--est">~ AI estimate — adjust any number.</p>}

        <div className="fest-grid">
          {NUMS.map(([k, label, unit]) => (
            <label key={k} className={estimated ? "fest-num is-est" : "fest-num"}>
              <span className="fest-num-label">{label}</span>
              <span className="fest-num-input">
                <input type="number" inputMode="decimal" min="0" value={vals[k] ?? ""} placeholder="—" onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
                <span className="fest-num-unit">{unit}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="feep-slots">
          {MEAL_SLOTS.map((s) => (
            <button key={s} type="button" className={s === slot ? "feep-slot is-on" : "feep-slot"} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</button>
          ))}
        </div>

        <div className="feep-manage">
          <span className="fgoal-spacer" />
          <button type="button" className="fgoal-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="fgoal-btn fgoal-save" disabled={!kcalOk} onClick={log}>Log meal</button>
        </div>
      </div>
    </div>
  );
}
