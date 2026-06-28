import { shiftYMD, humanDayShort } from "../gym/gymDates";
import { rangeTotals, calorieArc } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import CalorieArc from "./CalorieArc";
import FoodTrend from "./FoodTrend";

// FoodRange — the Week/Month aggregate view (the range switcher reframes the WHOLE page).
// Header: an AVG-DAY calorie arc (avg daily kcal vs goal) + the avg-grams-vs-goal macros
// (note: day view shows a PROPORTION, aggregate shows avg-vs-goal — intentional). Beneath:
// a calories trend, then a per-day list (date · kcal · P/C/F) that drills into that day's
// ledger. Aggregate views MAY scroll (zero-scroll governs the day overview only). All numbers
// come from the F3 rangeTotals / dailyTotals — no math here.

const MACROS = [
  ["protein", "Protein"],
  ["carbs", "Carbs"],
  ["fat", "Fat"],
];

export default function FoodRange({ daily, days, end, goalMap, onDrillDay }) {
  const start = shiftYMD(end, -(days - 1));
  const rt = rangeTotals(daily, days, { end });
  const calGoal = goalMap.get("calories")?.target_value ?? null;
  const arc = calorieArc(rt.perNutrient.kcal.avg ?? 0, calGoal);

  const inWindow = (daily || []).filter((d) => d.ymd >= start && d.ymd <= end);
  const trend = inWindow.map((d) => ({ ymd: d.ymd, value: d.kcal }));
  const rows = inWindow.slice().reverse(); // newest day first for the list

  return (
    <div className="frange">
      <div className="flog-header">
        {calGoal != null ? (
          <CalorieArc arc={arc} />
        ) : (
          <div className="flog-setgoals flog-setgoals--static">Set targets to see your average vs goal</div>
        )}
        <div className="frange-macros">
          {MACROS.map(([k, label]) => {
            const avg = rt.perNutrient[k].avg;
            const goal = goalMap.get(k)?.target_value ?? null;
            return (
              <div key={k} className="frange-macro">
                <span className="frange-macro-name">{label}</span>
                <span className="frange-macro-val">
                  {avg != null ? `${fmtNum(k, avg)}g` : "—"}
                  {goal != null && <span className="frange-macro-goal"> / {fmtNum(k, goal)}g</span>}
                </span>
              </div>
            );
          })}
          <div className="frange-macro frange-macro--note">avg / day</div>
        </div>
      </div>

      <FoodTrend series={trend} windowStart={start} windowEnd={end} goalValue={calGoal} />

      {rows.length === 0 ? (
        <p className="flog-empty-line frange-empty">Nothing logged in this range yet.</p>
      ) : (
        <ul className="frange-day-list">
          {rows.map((d) => (
            <li key={d.ymd}>
              <button type="button" className="frange-day" onClick={() => onDrillDay(d.ymd)}>
                <span className="frange-day-date">{humanDayShort(d.ymd)}</span>
                <span className="frange-day-kcal">{fmtNum("kcal", d.kcal)}</span>
                <span className="frange-day-macros">
                  P{fmtNum("protein", d.protein)} C{fmtNum("carbs", d.carbs)} F{fmtNum("fat", d.fat)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
