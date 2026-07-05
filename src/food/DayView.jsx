import { useState } from "react";
import { dayLedger, calorieArc, macroSplit } from "./foodCalc";
import CalorieArc from "./CalorieArc";
import MacroBar from "./MacroBar";
import MealLedger from "./MealLedger";
import SaveAsMealPanel from "./SaveAsMealPanel";

// DayView (Slice 1a rev) — two-column layout escaping the 760px container (same technique as
// the recipe broadsheet). Left: ring + bar + macro lines + micros + "+ Log food". Right: the
// meal ledger. Separated by a thin hairline. QuickAddStrip removed from this view.
export default function DayView({ entries, goalMap, day, names, quickItems, favSet, onAdd, onQuickAdd, onRelogMeal, onLongPressMeal, onEditEntry, onToggleFav, onOpenRecipe, onOpenGoals, onSaveMeal }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const ledger = dayLedger(entries, goalMap, { day });
  const calGoal = goalMap.get("calories")?.target_value ?? null;
  const arc = calorieArc(ledger.total.kcal, calGoal);
  const split = macroSplit(ledger.total);
  const targets = {
    protein: goalMap.get("protein")?.target_value ?? null,
    carbs: goalMap.get("carbs")?.target_value ?? null,
    fat: goalMap.get("fat")?.target_value ?? null,
  };

  const allItems = Object.values(ledger.slots).flatMap((s) => s.items);
  const selectedEntries = allItems.filter((e) => selected.has(e.id));
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const toggleSelect = (id) => setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const save = (name, fav) => { onSaveMeal(selectedEntries, name, fav); exitSelect(); };

  return (
    <div className="flog-day">
      <div className="flog-cols">
        <div className="flog-left">
          {calGoal != null ? (
            <button type="button" className="flog-arc-btn" onClick={(e) => onOpenGoals(e.currentTarget)} aria-label="Edit daily targets">
              <CalorieArc arc={arc} />
            </button>
          ) : (
            <button type="button" className="flog-setgoals" onClick={(e) => onOpenGoals(e.currentTarget)}>Set your daily targets</button>
          )}
          <MacroBar split={split} grams={ledger.total} targets={targets} micros={ledger.total} />
          <button type="button" className="flog-logfood" onClick={() => onAdd()}>+ Log food</button>
        </div>

        <div className="flog-right">
          {selectMode ? (
            <SaveAsMealPanel entries={selectedEntries} onSave={save} onCancel={exitSelect} />
          ) : (
            allItems.some((e) => e.food_item_id) && (
              <button type="button" className="flog-savemeal" onClick={() => setSelectMode(true)}>Save a meal from today</button>
            )
          )}
          {selectMode && <p className="flog-selecthint">Tick food items to include, then name your meal.</p>}
          <MealLedger
            slots={ledger.slots}
            names={names}
            favSet={favSet}
            onAddToSlot={(s) => onAdd(s)}
            onEditEntry={onEditEntry}
            onToggleFav={onToggleFav}
            onOpenRecipe={onOpenRecipe}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={toggleSelect}
          />
        </div>
      </div>
    </div>
  );
}
