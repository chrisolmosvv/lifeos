import { useState } from "react";
import { MEAL_SLOTS, entryMacros } from "./foodCalc";
import { fmtNum } from "./foodFormat";

// AmountStep — pick how much (in grams), pick the slot, then log. Serving chips (½·1·2 × the
// food's serving grams) when it has a serving size, else gram chips (50·100·150). The slot
// defaults to the time-of-day (passed in) and is changeable. A live preview runs entryMacros —
// the SAME F3 getter that builds the stored snapshot — so what you see is what lands.

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

export default function AmountStep({ food, defaultSlot, onBack, onConfirm }) {
  const servingG = Number.isFinite(food?.serving?.grams) ? food.serving.grams : null;
  const [grams, setGrams] = useState(servingG ?? 100);
  const [slot, setSlot] = useState(defaultSlot || "snacks");

  const chips = servingG
    ? [["½", servingG * 0.5], ["1", servingG], ["2", servingG * 2]]
    : [["50 g", 50], ["100 g", 100], ["150 g", 150]];

  const g = Number(grams);
  const preview = entryMacros(food, g || 0, "g");

  return (
    <div className="amt">
      <div className="amt-chips">
        {chips.map(([label, val]) => (
          <button
            key={label}
            type="button"
            className={g === val ? "amt-chip is-on" : "amt-chip"}
            onClick={() => setGrams(val)}
          >
            {label}
            {servingG ? <span className="amt-chip-g"> {Math.round(val)}g</span> : null}
          </button>
        ))}
      </div>

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

      <div className="amt-actions">
        <button type="button" className="amt-back" onClick={onBack}>‹ Back</button>
        <button type="button" className="amt-log" disabled={!(g > 0)} onClick={() => onConfirm(g, "g", slot)}>
          Add to {SLOT_LABELS[slot]}
        </button>
      </div>
    </div>
  );
}
