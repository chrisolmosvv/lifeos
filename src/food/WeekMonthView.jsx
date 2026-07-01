import { shiftYMD } from "../gym/gymDates";
import { rangeTotals, rangeAdherence } from "./foodCalc";
import SummaryStrip from "./SummaryStrip";
import FoodBarChart from "./FoodBarChart";

// WeekMonthView (V2 P4) — the Week/Month aggregate: a numeric SummaryStrip + a 2×2 grid of
// FoodBarCharts (calories + each macro). The BARS are the per-day drill (tap → that day's ledger);
// the V1 avg-day arc + per-day list are retired. Day-proportion vs aggregate-avg-vs-goal split is
// PRESERVED (Day shows a proportion; here each chart shows avg-vs-goal). All numbers from the F3
// getters (rangeTotals reuses Body windowing; rangeAdherence from P0) — no new calc, Body untouched.
const CHARTS = [
  ["kcal", "calories", "Calories"],
  ["protein", "protein", "Protein"],
  ["carbs", "carbs", "Carbs"],
  ["fat", "fat", "Fat"],
];

export default function WeekMonthView({ daily, days, end, goalMap, today, onDrillDay }) {
  const start = shiftYMD(end, -(days - 1));
  const rt = rangeTotals(daily, days, { end });
  const adherence = rangeAdherence(daily, goalMap, { start, end, today });
  const inWindow = (daily || []).filter((d) => d.ymd >= start && d.ymd <= end);
  const goalFor = (type) => goalMap.get(type)?.target_value ?? null;

  return (
    <div className="fwm">
      <SummaryStrip perNutrient={rt.perNutrient} adherence={adherence} />
      <div className="fwm-grid">
        {CHARTS.map(([k, type, label]) => (
          <FoodBarChart
            key={k}
            label={label}
            nutrient={k}
            series={inWindow.map((d) => ({ ymd: d.ymd, value: d[k] }))}
            windowStart={start}
            windowEnd={end}
            goalValue={goalFor(type)}
            avgValue={rt.perNutrient[k].avg}
            onDrillDay={onDrillDay}
          />
        ))}
      </div>
      <p className="fwm-foot">Averaged over logged days — a gap day is not a 0.</p>
    </div>
  );
}
