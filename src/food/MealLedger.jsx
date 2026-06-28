import { useState } from "react";
import { fmtNum, fmtFull } from "./foodFormat";

// MealLedger — the day's entries grouped into the 4 fixed slots, each with a subtotal. Calm
// via typographic restraint: hairline rules, tabular figures, muted secondary numbers — dense
// but not loud. Zero-scroll mechanism: CAP rows per slot, "+N more" expands inline. Tapping a
// row expands it to the full 7 numbers + an Edit affordance. The '+' (per slot) and "+ add
// food" + Edit ACTIONS are F6 — wired here as stubs. No math; reads the F3 dayLedger slots.

const SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];
const CAP = 4; // rows shown per slot before "+N more"

function entryName(e, names) {
  if (e.food_item_id && names?.itemById?.[e.food_item_id]) return names.itemById[e.food_item_id].name;
  if (e.recipe_id && names?.recipeById?.[e.recipe_id]) return names.recipeById[e.recipe_id];
  return "Food"; // a manual entry with no FK has no stored name — F6 gives manual adds a name
}

export default function MealLedger({ slots, names, onAddFood, onAddToSlot, onEditEntry }) {
  const [openSlots, setOpenSlots] = useState({}); // slot key → show all rows
  const [openRow, setOpenRow] = useState(null); //   entry id → expanded full nutrition

  return (
    <div className="ml">
      {SLOTS.map(({ key, label }) => {
        const slot = slots[key];
        const items = slot.items;
        if (items.length === 0) return null; // empty slots stay hidden until they hold an entry
        const sub = slot.subtotal;
        const shown = openSlots[key] ? items : items.slice(0, CAP);
        const more = items.length - shown.length;
        return (
          <section key={key} className="ml-slot">
            <header className="ml-slot-head">
              <span className="ml-slot-name">{label}</span>
              <span className="ml-slot-sub">
                {fmtNum("kcal", sub.kcal)} · P{fmtNum("protein", sub.protein)} C{fmtNum("carbs", sub.carbs)} F
                {fmtNum("fat", sub.fat)}
              </span>
              <button type="button" className="ml-add" aria-label={`Add to ${label}`} onClick={() => onAddToSlot(key)}>+</button>
            </header>
            <ul className="ml-rows">
              {shown.map((e) => {
                const open = openRow === e.id;
                return (
                  <li key={e.id} className={open ? "ml-row is-open" : "ml-row"}>
                    <button type="button" className="ml-row-main" onClick={() => setOpenRow(open ? null : e.id)}>
                      <span className="ml-name">{entryName(e, names)}</span>
                      <span className="ml-amt">{e.amount != null ? `${e.amount} ${e.unit || "g"}` : ""}</span>
                      <span className="ml-kcal">{fmtNum("kcal", e.kcal)}</span>
                      <span className="ml-macros">
                        P{fmtNum("protein", e.protein)} C{fmtNum("carbs", e.carbs)} F{fmtNum("fat", e.fat)}
                      </span>
                    </button>
                    {open && (
                      <div className="ml-detail">
                        <span>{fmtFull("kcal", e.kcal)}</span>
                        <span>protein {fmtFull("protein", e.protein)}</span>
                        <span>carbs {fmtFull("carbs", e.carbs)}</span>
                        <span>fat {fmtFull("fat", e.fat)}</span>
                        <span>fibre {fmtFull("fibre", e.fibre)}</span>
                        <span>sugar {fmtFull("sugar", e.sugar)}</span>
                        <span>sodium {fmtFull("sodium", e.sodium)}</span>
                        <button type="button" className="ml-edit" onClick={() => onEditEntry(e)}>Edit</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {more > 0 && (
              <button type="button" className="ml-more" onClick={() => setOpenSlots((s) => ({ ...s, [key]: true }))}>
                +{more} more
              </button>
            )}
          </section>
        );
      })}
      <button type="button" className="flog-add-primary" onClick={onAddFood}>+ add food</button>
    </div>
  );
}
