import { useState } from "react";
import { MEAL_SLOTS, NUTRIENTS, entryMacros } from "./foodCalc";
import { entryToFood } from "./foodShape";
import { fmtNum, fmtFull } from "../../spine/logic/foodFormat";
import "./foodGoals.css";

// EditEntryPanel (V2 P4) — a FULL-SCREEN editor for a logged entry: amount + slot + the FULL
// 7-number breakdown (which moved here off the ledger row) + swap + remove. Amount changes RE-RUN
// entryMacros on a per-unit rate reverse-derived (entryToFood) from the STORED snapshot, so the row
// recomputes without refetching the food. Optimistic write + undo toast (caller).
//
// COOKED-MEAL variant (entry_source==='recipe_cook'): the amount is SERVINGS (swap HIDDEN — it's a
// recipe, not a food); the rescale falls out for free — entryToFood reverse-derives a per-unit rate
// from the snapshot÷amount and entryMacros rescales it linearly. It rescales the STORED P3 snapshot,
// NEVER the live recipe — the sacred snapshot-not-live contract extends here.
//
// Props: entry, name, onApply(patch), onRemove(), onSwap(), onClose().
const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };
const BREAKDOWN = [["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"], ["fibre", "fibre"], ["sugar", "sugar"], ["sodium", "sodium"]];
const pick7 = (m) => { const o = {}; for (const k of NUTRIENTS) o[k] = m[k]; return o; };

export default function EditEntryPanel({ entry, name, onApply, onRemove, onSwap, onClose }) {
  const isCook = entry.entry_source === "recipe_cook";
  const [amount, setAmount] = useState(entry.amount ?? (isCook ? 1 : 100));
  const [slot, setSlot] = useState(entry.meal_slot);
  const food = entryToFood(entry);
  const a = Number(amount);
  const preview = entryMacros(food, a || 0, "g"); // linear rescale of the stored snapshot (grams OR servings)
  const changed = (a > 0 && a !== Number(entry.amount)) || slot !== entry.meal_slot;

  const apply = () => {
    const patch = { meal_slot: slot };
    if (a > 0 && a !== Number(entry.amount)) { patch.amount = a; Object.assign(patch, pick7(preview)); }
    onApply(patch);
  };

  return (
    <div className="fgoal-backdrop" onMouseDown={onClose}>
      <div className="fgoal feep" role="dialog" aria-modal="true" aria-label="Edit entry" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fgoal-head">
          <span className="fgoal-eyebrow">{name || "Edit"}</span>
          <button type="button" className="fgoal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <label className="feep-amount">
          <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          <span className="feep-unit">{isCook ? "servings" : "grams"}</span>
        </label>

        <div className="feep-slots">
          {MEAL_SLOTS.map((s) => (
            <button key={s} type="button" className={s === slot ? "feep-slot is-on" : "feep-slot"} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</button>
          ))}
        </div>

        <div className="feep-preview">
          <span className="feep-kcal">{fmtNum("kcal", preview.kcal)} kcal</span>
          {BREAKDOWN.map(([k, label]) => (
            <span key={k} className="feep-macro">{label} {fmtFull(k, preview[k])}</span>
          ))}
        </div>

        <div className="feep-manage">
          {!isCook && <button type="button" className="fgoal-btn" onClick={onSwap}>Swap food</button>}
          <button type="button" className="fgoal-btn fgoal-danger" onClick={onRemove}>Remove</button>
          <span className="fgoal-spacer" />
          <button type="button" className="fgoal-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="fgoal-btn fgoal-save" disabled={!changed} onClick={apply}>Save</button>
        </div>
      </div>
    </div>
  );
}
