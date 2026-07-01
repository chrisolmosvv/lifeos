import { fmtNum } from "./foodFormat";

// MealLedger (V2 P4) — the day's four fixed slots, each a hairline-ruled section. Rows carry an
// ALWAYS-ON P·C·F shorthand + kcal (no cap, no "+N more", no tap-to-expand — the full 7-number
// breakdown lives in the full-screen Edit). Empty slots are SHOWN with a quiet invitation (never
// hidden). A cooked/meal entry (recipe_id) gets a "Meal" tag + a ↗ view-recipe affordance; a single
// food stays plain with a ★ favourite. Row → Edit; ★/↗ reveal on hover. Scrolls as one region.
const SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

function entryName(e, names) {
  if (e.food_item_id && names?.itemById?.[e.food_item_id]) return names.itemById[e.food_item_id].name;
  if (e.recipe_id && names?.recipeById?.[e.recipe_id]) return names.recipeById[e.recipe_id];
  if (e.entry_label) return e.entry_label; // V2 P5: an estimate's typed description (no FK to borrow from)
  return "Food";
}

export default function MealLedger({ slots, names, favSet, onAddToSlot, onEditEntry, onToggleFav, onOpenRecipe, selectMode, selected, onToggleSelect }) {
  return (
    <div className="ml">
      {SLOTS.map(({ key, label }) => {
        const items = slots[key].items;
        const sub = slots[key].subtotal;
        return (
          <section key={key} className="ml-slot">
            <header className="ml-slot-head">
              <span className="ml-slot-name">{label}</span>
              {items.length > 0 ? (
                <span className="ml-slot-sub">
                  {fmtNum("kcal", sub.kcal)} kcal · P{fmtNum("protein", sub.protein)} C{fmtNum("carbs", sub.carbs)} F{fmtNum("fat", sub.fat)}
                </span>
              ) : (
                <button type="button" className="ml-slot-add" onClick={() => onAddToSlot(key)}>+ add</button>
              )}
            </header>
            {items.length > 0 && (
              <ul className="ml-rows">
                {items.map((e) => {
                  const isMeal = !!e.recipe_id;
                  const selectable = selectMode && !!e.food_item_id; // only foods can become meal ingredients
                  return (
                    <li key={e.id} className="ml-row">
                      <button type="button" className="ml-row-main" disabled={selectMode && !selectable}
                        onClick={() => (selectMode ? (selectable && onToggleSelect(e.id)) : onEditEntry(e))}>
                        {selectMode && <span className="ml-tick">{selected?.has(e.id) ? "☑" : selectable ? "☐" : "·"}</span>}
                        <span className="ml-name">
                          {entryName(e, names)}
                          {isMeal && <span className="ml-meal-tag">Meal</span>}
                          {e.is_estimated && <span className="ml-meal-tag">~ est</span>}
                        </span>
                        <span className="ml-macros">
                          P{fmtNum("protein", e.protein)} C{fmtNum("carbs", e.carbs)} F{fmtNum("fat", e.fat)}
                        </span>
                        <span className="ml-kcal">{e.is_estimated ? "~" : ""}{fmtNum("kcal", e.kcal)}</span>
                      </button>
                      {!selectMode && (
                        <span className="ml-row-actions">
                          {isMeal && onOpenRecipe && (
                            <button type="button" className="ml-recipe-link" aria-label="View recipe" onClick={() => onOpenRecipe(e.recipe_id)}>↗</button>
                          )}
                          {e.food_item_id && onToggleFav && (
                            <button type="button" className={favSet?.has(e.food_item_id) ? "ml-fav is-on" : "ml-fav"} aria-label="Toggle favourite" onClick={() => onToggleFav(e.food_item_id)}>
                              {favSet?.has(e.food_item_id) ? "★" : "☆"}
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
