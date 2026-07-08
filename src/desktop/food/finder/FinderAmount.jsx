import { useState } from "react";
import { MEAL_SLOTS, entryMacros } from "../foodCalc";
import { resolvePortion } from "../portions";
import { fmtNum } from "../foodFormat";

// FinderAmount — the shared amount step: a value field + a unit selector (only the units that
// resolve for THIS food, from config.unitsFor), DEFAULT 100 g, a live macro preview above, and —
// logger context only — the meal slot (pre-filled to time-of-day, always changeable).
//
// Resolution: g/ml/serving go straight through entryMacros (the F3 getter — the SAME maths that
// builds the stored snapshot). Household portions (cup/tbsp/tsp/item — recipe context) resolve to
// grams via resolvePortion FIRST, then entryMacros. onConfirm hands the shell {value, unit, grams}
// so each context can build its own object (a log entry vs a recipe ingredient).

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };
const DIRECT = new Set(["g", "ml", "serving"]); // entryMacros resolves these itself

function toGrams(food, value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const u = (unit || "g").toLowerCase();
  if (u === "g" || u === "ml") return v;
  if (u === "serving") { const sg = food?.serving?.grams; return Number.isFinite(sg) ? v * sg : null; }
  return resolvePortion(food?.name, v, u); // cup/tbsp/tsp/item
}

function preview(food, value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return {};
  if (DIRECT.has(unit)) return entryMacros(food, v, unit);
  const g = toGrams(food, v, unit);
  return g == null ? {} : entryMacros(food, g, "g");
}

export default function FinderAmount({ food, config, defaultSlot, onBack, onConfirm }) {
  const units = config.unitsFor(food);
  const [unit, setUnit] = useState(units[0] || "g");
  const [value, setValue] = useState(units[0] === "g" ? "100" : "1");
  const [slot, setSlot] = useState(defaultSlot || "snacks");

  const grams = toGrams(food, value, unit);
  const m = preview(food, value, unit);
  const ready = grams != null && grams > 0;

  return (
    <div className="amt">
      <div className="amt-chips">
        {units.map((u) => (
          <button key={u} type="button" className={u === unit ? "amt-chip is-on" : "amt-chip"} onClick={() => setUnit(u)}>{u}</button>
        ))}
      </div>

      <label className="amt-field">
        <input type="number" inputMode="decimal" min="0" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <span>{unit}{grams != null && unit !== "g" ? ` · ${Math.round(grams)} g` : ""}</span>
      </label>

      {config.showSlot && (
        <div className="amt-slots">
          {MEAL_SLOTS.map((s) => (
            <button key={s} type="button" className={s === slot ? "amt-slot is-on" : "amt-slot"} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</button>
          ))}
        </div>
      )}

      <p className="amt-preview">
        {fmtNum("kcal", m.kcal)} kcal · P{fmtNum("protein", m.protein)} C{fmtNum("carbs", m.carbs)} F{fmtNum("fat", m.fat)}
      </p>

      <div className="amt-actions">
        <button type="button" className="amt-back" onClick={onBack}>‹ Back</button>
        <button type="button" className="amt-log" disabled={!ready} onClick={() => onConfirm({ value: Number(value), unit, grams, slot })}>
          {config.showSlot ? `Add to ${SLOT_LABELS[slot]}` : "Add ingredient"}
        </button>
      </div>
    </div>
  );
}
