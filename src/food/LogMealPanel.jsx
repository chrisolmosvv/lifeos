import { useState } from "react";
import { MEAL_SLOTS } from "./foodCalc";
import { fmtNum } from "./foodFormat";

// LogMealPanel — the shared INLINE cook→log staging panel (F9). One component, two triggers: the
// recipe page's "Log this meal" and cook mode's "Done cooking" both open THIS panel (not a modal,
// not a route — it expands in place). Sets servings eaten (default 1) + the meal slot (defaults to
// time-of-day via slotForHour) and shows a LIVE macro preview (recipeMacros.perServing × servings)
// before logging. When the recipe has unmatched ingredients it shows the honest "~ N unestimated"
// note, so you log informed (the snapshot stores only what's matched — a known undercount).
//
// Props: perServing {7 numbers}, unestimatedCount, defaultSlot, onLog(servings, slot), onClose.
const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

export default function LogMealPanel({ perServing, unestimatedCount = 0, defaultSlot, onLog, onClose }) {
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState(defaultSlot);
  const at = (k) => (perServing?.[k] || 0) * servings; // live preview for N servings

  return (
    <div className="lmp">
      <div className="lmp-row">
        <span className="lmp-label">Servings eaten</span>
        <div className="lmp-step">
          <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer">−</button>
          <span className="lmp-n">{servings}</span>
          <button type="button" onClick={() => setServings((s) => s + 1)} aria-label="More">+</button>
        </div>
      </div>

      <div className="lmp-slots">
        {MEAL_SLOTS.map((s) => (
          <button key={s} type="button" className={s === slot ? "lmp-slot is-on" : "lmp-slot"} onClick={() => setSlot(s)}>
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>

      <p className="lmp-preview">
        {fmtNum("kcal", at("kcal"))} kcal · P{fmtNum("protein", at("protein"))} C{fmtNum("carbs", at("carbs"))} F
        {fmtNum("fat", at("fat"))}
      </p>
      {unestimatedCount > 0 && (
        <p className="lmp-approx">~ {unestimatedCount} unestimated — macros approximate</p>
      )}

      <div className="lmp-actions">
        <button type="button" className="lmp-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="lmp-log" onClick={() => onLog(servings, slot)}>Log this meal</button>
      </div>
    </div>
  );
}
