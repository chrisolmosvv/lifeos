import { useState } from "react";
import { dayLedger, calorieArc, macroSplit } from "./foodCalc";
import CalorieArc from "./CalorieArc";
import MacroBar from "./MacroBar";
import MealLedger from "./MealLedger";
import QuickAddStrip from "./QuickAddStrip";
import SaveAsMealPanel from "./SaveAsMealPanel";

// DayView (Slice 1a rebuild) — single-column layout. A horizontal band at the top: ring left,
// macros right, "+ Log food" top-right. QuickAddStrip below the band. MealLedger unchanged below.
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
      <div className="flog-band">
        <div className="flog-band-left">
          {calGoal != null ? (
            <button type="button" className="flog-arc-btn" onClick={(e) => onOpenGoals(e.currentTarget)} aria-label="Edit daily targets">
              <CalorieArc arc={arc} />
            </button>
          ) : (
            <button type="button" className="flog-setgoals" onClick={(e) => onOpenGoals(e.currentTarget)}>Set your daily targets</button>
          )}
        </div>

        <div className="flog-band-right">
          <button type="button" className="flog-logfood" onClick={() => onAdd()}>+ Log food</button>
          <MacroBar split={split} grams={ledger.total} targets={targets} micros={ledger.total} />
        </div>
      </div>

      <div className="flog-quickrow">
        {selectMode ? (
          <SaveAsMealPanel entries={selectedEntries} onSave={save} onCancel={exitSelect} />
        ) : (
          <QuickAddStrip items={quickItems} onPickMeal={onRelogMeal} onLongPressMeal={onLongPressMeal} onPickFood={onQuickAdd} />
        )}
      </div>

      <div className="flog-ledger">
        {selectMode ? (
          <p className="flog-selecthint">Tick food items to include, then name your meal in the panel above.</p>
        ) : (
          allItems.some((e) => e.food_item_id) && (
            <button type="button" className="flog-savemeal" onClick={() => setSelectMode(true)}>Save a meal from today</button>
          )
        )}
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
  );
}
