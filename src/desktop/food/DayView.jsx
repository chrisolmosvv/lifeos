import { useState } from "react";
import { dayLedger, calorieArc } from "../../spine/logic/foodCalc";
import CalorieArc from "./CalorieArc";
import MacroRings from "./MacroRings";
import MealLedger from "./MealLedger";
import SaveAsMealPanel from "./SaveAsMealPanel";

// DayView (Piece 4) — two-column layout. Left: calorie ring + three macro rings (all with
// per-meal segments) + micros + "+ Log food". Right: meal ledger. mealTotals derived from
// the existing dayLedger slots subtotals — no new getter needed.
export default function DayView({ entries, goalMap, day, names, quickItems, favSet, onAdd, onQuickAdd, onRelogMeal, onLongPressMeal, onEditEntry, onToggleFav, onOpenRecipe, onOpenGoals, onSaveMeal }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const ledger = dayLedger(entries, goalMap, { day });
  const calGoal = goalMap.get("calories")?.target_value ?? null;
  const arc = calorieArc(ledger.total.kcal, calGoal);
  const targets = {
    protein: goalMap.get("protein")?.target_value ?? null,
    carbs: goalMap.get("carbs")?.target_value ?? null,
    fat: goalMap.get("fat")?.target_value ?? null,
  };

  // Per-meal subtotals — already computed by dayLedger, just reshape for the rings
  const mealTotals = {
    breakfast: ledger.slots.breakfast.subtotal,
    lunch: ledger.slots.lunch.subtotal,
    dinner: ledger.slots.dinner.subtotal,
    snacks: ledger.slots.snacks.subtotal,
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
              <CalorieArc arc={arc} mealTotals={mealTotals} />
            </button>
          ) : (
            <button type="button" className="flog-setgoals" onClick={(e) => onOpenGoals(e.currentTarget)}>Set your daily targets</button>
          )}
          <MacroRings grams={ledger.total} targets={targets} micros={ledger.total} mealTotals={mealTotals} />
          <button type="button" className="flog-logfood" onClick={() => onAdd()}>+ LOG FOOD</button>
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
