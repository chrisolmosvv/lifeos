import { dayLedger, calorieArc, macroSplit } from "./foodCalc";
import { fmtFull } from "./foodFormat";
import CalorieArc from "./CalorieArc";
import MacroBar from "./MacroBar";
import MealLedger from "./MealLedger";
import QuickAddStrip from "./QuickAddStrip";

// DayView (V2 P4) — the two-column broadsheet. LEFT rail: the 270° calorie arc (a button → Goals) →
// the P/C/F macro bar → a quiet fibre/sugar/sodium micros line → quick-add ("Log again", foods-only
// at P4 — meals-in-quick-add is P5). RIGHT column: a terracotta "+ Log food" (summons the P2 finder)
// → the meal ledger (four slots, empty ones invited). The V1 drinks line is DROPPED (F10 parked; the
// dayLedger alcohol READ getter is retained, just not rendered). Every number comes from the getters.
export default function DayView({ entries, goalMap, day, names, quickFoods, favSet, onAdd, onQuickAdd, onEditEntry, onToggleFav, onOpenRecipe, onOpenGoals }) {
  const ledger = dayLedger(entries, goalMap, { day });
  const calGoal = goalMap.get("calories")?.target_value ?? null;
  const arc = calorieArc(ledger.total.kcal, calGoal);
  const split = macroSplit(ledger.total);
  const targets = {
    protein: goalMap.get("protein")?.target_value ?? null,
    carbs: goalMap.get("carbs")?.target_value ?? null,
    fat: goalMap.get("fat")?.target_value ?? null,
  };

  return (
    <div className="flog-day">
      <aside className="flog-rail">
        {calGoal != null ? (
          <button type="button" className="flog-arc-btn" onClick={(e) => onOpenGoals(e.currentTarget)} aria-label="Edit daily targets">
            <CalorieArc arc={arc} />
          </button>
        ) : (
          <button type="button" className="flog-setgoals" onClick={(e) => onOpenGoals(e.currentTarget)}>Set your daily targets</button>
        )}
        <MacroBar split={split} grams={ledger.total} targets={targets} />
        <p className="flog-micros">
          fibre {fmtFull("fibre", ledger.total.fibre)} · sugar {fmtFull("sugar", ledger.total.sugar)} · sodium {fmtFull("sodium", ledger.total.sodium)}
        </p>
        <QuickAddStrip foods={quickFoods} onPick={onQuickAdd} />
      </aside>

      <div className="flog-col">
        <button type="button" className="flog-logfood" onClick={() => onAdd()}>+ Log food</button>
        <MealLedger
          slots={ledger.slots}
          names={names}
          favSet={favSet}
          onAddToSlot={(s) => onAdd(s)}
          onEditEntry={onEditEntry}
          onToggleFav={onToggleFav}
          onOpenRecipe={onOpenRecipe}
        />
      </div>
    </div>
  );
}
