import { dayLedger, calorieArc, macroSplit } from "./foodCalc";
import { fmtFull } from "./foodFormat";
import CalorieArc from "./CalorieArc";
import MacroBar from "./MacroBar";
import MealLedger from "./MealLedger";
import QuickAddStrip from "./QuickAddStrip";

// DayView — the Day content: the calorie-arc + macro-bar header, the fibre/sugar/sodium +
// drinks line, the quick-add strip, and the meal ledger — or the warm states (no calorie goal
// → a set-targets prompt that opens the goals editor; empty day → invite + primary add). Every
// number comes from the F3 calc layer. Props carry the handlers; this file holds no write logic.
export default function DayView({ entries, goalMap, day, names, quickFoods, favSet, onAdd, onQuickAdd, onEditEntry, onToggleFav, onOpenGoals }) {
  const ledger = dayLedger(entries, goalMap, { day });
  const calGoal = goalMap.get("calories")?.target_value ?? null;
  const hasEntries = Object.values(ledger.slots).some((s) => s.items.length > 0);
  const arc = calorieArc(ledger.total.kcal, calGoal);
  const split = macroSplit(ledger.total);
  const targets = {
    protein: goalMap.get("protein")?.target_value ?? null,
    carbs: goalMap.get("carbs")?.target_value ?? null,
    fat: goalMap.get("fat")?.target_value ?? null,
  };

  return (
    <>
      <div className="flog-header">
        {calGoal != null ? (
          <button type="button" className="flog-arc-btn" onClick={(e) => onOpenGoals(e.currentTarget)} aria-label="Edit daily targets">
            <CalorieArc arc={arc} />
          </button>
        ) : (
          <button type="button" className="flog-setgoals" onClick={(e) => onOpenGoals(e.currentTarget)}>
            Set your daily targets
          </button>
        )}
        <MacroBar split={split} grams={ledger.total} targets={targets} />
      </div>

      <div className="flog-secondary">
        <span>
          fibre {fmtFull("fibre", ledger.total.fibre)} · sugar {fmtFull("sugar", ledger.total.sugar)} · sodium{" "}
          {fmtFull("sodium", ledger.total.sodium)}
        </span>
        <span className="flog-drinks">
          drinks: {ledger.alcohol.units} · {Math.round(ledger.alcohol.kcal)} kcal
        </span>
      </div>

      <QuickAddStrip foods={quickFoods} onPick={onQuickAdd} />

      {hasEntries ? (
        <MealLedger
          slots={ledger.slots}
          names={names}
          favSet={favSet}
          onAddFood={() => onAdd()}
          onAddToSlot={(s) => onAdd(s)}
          onEditEntry={onEditEntry}
          onToggleFav={onToggleFav}
        />
      ) : (
        <div className="flog-empty">
          <p className="flog-empty-line">Nothing logged yet — add a meal to start today’s ledger.</p>
          <button type="button" className="flog-add-primary" onClick={() => onAdd()}>+ add food</button>
        </div>
      )}
    </>
  );
}
