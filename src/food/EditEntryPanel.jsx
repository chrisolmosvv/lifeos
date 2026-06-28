import { useState } from "react";
import { MEAL_SLOTS, NUTRIENTS, entryMacros } from "./foodCalc";
import { entryToFood } from "./foodShape";
import { fmtNum } from "./foodFormat";

// EditEntryPanel — a logged row's edit (F6): change the amount + slot, SWAP the food, or
// REMOVE. Amount changes RE-RUN entryMacros (on a per-100g reverse-derived from the stored
// snapshot) so the row's numbers recompute; slot is a plain field change. Swap hands off to the
// add modal. Remove deletes (with the undo toast). A live preview shows the recomputed macros.
//
// Props: entry, name, onApply(patch), onRemove(), onSwap(), onClose().

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };
const pick7 = (m) => { const o = {}; for (const k of NUTRIENTS) o[k] = m[k]; return o; };

export default function EditEntryPanel({ entry, name, onApply, onRemove, onSwap, onClose }) {
  const [grams, setGrams] = useState(entry.amount ?? 100);
  const [slot, setSlot] = useState(entry.meal_slot);
  const food = entryToFood(entry);
  const g = Number(grams);
  const preview = entryMacros(food, g || 0, "g");
  const changed = (g > 0 && g !== Number(entry.amount)) || slot !== entry.meal_slot;

  const apply = () => {
    const patch = { meal_slot: slot };
    if (g > 0 && g !== Number(entry.amount)) {
      patch.amount = g;
      Object.assign(patch, pick7(preview)); // recomputed snapshot
    }
    onApply(patch);
  };

  return (
    <div className="afm-backdrop" onMouseDown={onClose}>
      <div className="afm" role="dialog" aria-modal="true" aria-label="Edit entry" onMouseDown={(e) => e.stopPropagation()}>
        <div className="afm-head">
          <span className="afm-title">{name || "Edit"}</span>
          <button type="button" className="afm-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="amt">
          <label className="amt-field">
            <input type="number" inputMode="decimal" min="0" value={grams} onChange={(e) => setGrams(e.target.value)} />
            <span>grams</span>
          </label>
          <div className="amt-slots">
            {MEAL_SLOTS.map((s) => (
              <button key={s} type="button" className={s === slot ? "amt-slot is-on" : "amt-slot"} onClick={() => setSlot(s)}>
                {SLOT_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="amt-preview">
            {fmtNum("kcal", preview.kcal)} kcal · P{fmtNum("protein", preview.protein)} C{fmtNum("carbs", preview.carbs)} F
            {fmtNum("fat", preview.fat)}
          </p>
          <div className="eep-row">
            <button type="button" className="eep-swap" onClick={onSwap}>Swap food</button>
            <button type="button" className="eep-remove" onClick={onRemove}>Remove</button>
          </div>
          <div className="amt-actions">
            <button type="button" className="amt-back" onClick={onClose}>Cancel</button>
            <button type="button" className="amt-log" disabled={!changed} onClick={apply}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
