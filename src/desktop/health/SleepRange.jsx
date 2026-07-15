import { shiftYMD } from "../../spine/logic/gymDates";
import { nightsHitGoal, goalStreak, bedtimeConsistency } from "../../spine/logic/healthSleep";
import { rangeBedWakeAverages } from "../../spine/logic/healthRhythm";
import { hm, clockFromMin } from "../../spine/logic/healthFormat";
import SleepAggStats from "./SleepAggStats";
import SleepAggLedger from "./SleepAggLedger";
import SleepClockColumns from "../kit/SleepClockColumns";
import { weeklyColumns } from "../kit/sleepClockChart";

// SleepRange — the Week (7) / Month (30) / 90-day aggregate, V2 mockup-1 broadsheet:
// a thin breadcrumb+switcher chrome row, a full-width stats row, then the chart hero
// (flex-filling to the fold) beside a right goal/rhythm ledger.
//
// THE CHART: ALL three ranges now render the CLOCK COLUMNS (SleepClockColumns) — the same
// chart as Last night. Week/Month feed per-NIGHT rows (Piece 5); 90-day feeds ~13 pre-built
// WEEKLY-average columns (Piece 6, retiring the old stacked bars). The stats strip and the
// ledger are shared and unchanged — 90-day's goal context lives there, not on the chart.
//
// `end` is the window anchor (today by default; a past week-end when drilled into a week
// from the 90-day view). Night column → onDrill(ymd); weekly column → onWeekDrill(weekStart).

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function SleepRange({ days, rows, goal, end, rolling, breadcrumb, switcher, onDrill, onWeekDrill }) {
  const isWeekly = days >= 90;
  const start = shiftYMD(end, -(days - 1));

  const inWindow = (rows || []).filter(
    (r) => r?.night_date && r.night_date >= start && r.night_date <= end && Number.isFinite(r.asleep_minutes),
  );
  const dataNights = inWindow.length;
  const showSummary = dataNights >= 3; // S5 sparse rule

  // Headline stats (window-scoped; inline where no getter fits).
  const avgDur = mean(inWindow.map((r) => r.asleep_minutes));
  const bedwake = rangeBedWakeAverages(rows, start, end);
  const nh = nightsHitGoal(rows, goal, end, days);
  const streak = goalStreak(rows, goal, end);
  const consistency = bedtimeConsistency(rows, end); // 7-night metric → WEEK only
  const awakeAvg = mean(inWindow.map((r) => r.awake_minutes).filter(Number.isFinite));

  const baseAvg = rolling?.[90]?.avg;
  const baseHasData = (rolling?.[90]?.values?.length || 0) >= 3;
  const showBaseline = !isWeekly && showSummary && Number.isFinite(avgDur) && Number.isFinite(baseAvg) && baseHasData;
  const baseDelta = showBaseline ? avgDur - baseAvg : null;
  const goalTarget = goal?.target_value ?? null;

  const statsCells = [
    { label: isWeekly ? "90-day average" : `${days}-night average`, value: hm(avgDur), hero: true },
    { label: "avg bed", value: clockFromMin(bedwake?.bedAvgMin) },
    { label: "avg wake", value: clockFromMin(bedwake?.wakeAvgMin) },
    nh && { label: "goal", value: `${nh.hit}/${nh.total} hit`, accent: true },
    { label: "awake avg", value: hm(awakeAvg) },
    showBaseline && {
      label: "baseline",
      value:
        Math.abs(baseDelta) < 1
          ? "about the same"
          : `${Math.round(Math.abs(baseDelta))} min ${baseDelta < 0 ? "less" : "more"}`,
    },
  ];

  const ledgerRows = [
    nh && {
      label: "goal",
      big: `${nh.hit}/${nh.total}`,
      sub: `${streak ? `${streak.streak}-night streak` : ""}${goalTarget ? ` · target ${hm(goalTarget)}` : ""}`.replace(/^ · /, ""),
      accent: true,
    },
    { label: "rhythm", big: `${clockFromMin(bedwake?.bedAvgMin)} / ${clockFromMin(bedwake?.wakeAvgMin)}`, sub: "average bed / wake" },
    !isWeekly && days <= 7 && Number.isFinite(consistency?.stdDevMin)
      ? { label: "consistency", big: `±${Math.round(consistency.stdDevMin)}m`, sub: "bedtime spread this week" }
      : null,
  ];

  return (
    <div className="sleep-agg">
      <div className="health-chrome">
        {breadcrumb}
        {switcher}
      </div>

      {showSummary ? <SleepAggStats cells={statsCells} /> : <p className="sleep-muted sr-sparse">Not enough nights yet for an average.</p>}

      <div className="agg-main">
        <div className="agg-chart agg-chart--clock">
          {isWeekly ? (
            // 90-day (Piece 6): ~13 WEEKLY-average bed→wake columns. No goal mark on the chart
            // (owner's call) — goal context is in the stats strip + ledger. Click a week →
            // onWeekDrill jumps to that week (exactly the old bar behaviour).
            <SleepClockColumns
              columns={weeklyColumns(rows, end, Math.ceil(days / 7), goal)}
              averages={bedwake}
              onDrill={onWeekDrill}
            />
          ) : (
            // Week & Month: per-night columns (Piece 5). goalMinutes drives the terracotta
            // goal-met mark; averages (already computed for the ledger's rhythm row) drive the
            // avg bed/wake marks — same source, so the marks agree with the ledger numbers.
            <SleepClockColumns
              rows={rows}
              end={end}
              days={days}
              goalMinutes={goalTarget}
              averages={bedwake}
              onDrill={onDrill}
            />
          )}
        </div>

        <SleepAggLedger rows={ledgerRows} />
      </div>
    </div>
  );
}
