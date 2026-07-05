import { shiftYMD, humanDayShort } from "../gym/gymDates";
import { rangeTotals, perGoalHits } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import FoodBarChart from "./FoodBarChart";

// WeekMonthView (Nutrition Slice 2) — consistency-focused Week/Month. Honest about logged days:
// averages and "X of Y" counts are ALWAYS over logged days only, and the count is always shown.
// Two states: SPARSE (< 2 logged days → calm "not enough yet" message + day indicator) and FULL
// (lead number + supporting averages + per-goal consistency + day bars).

const SPARSE_THRESHOLD = 2; // fewer than this → sparse state
const DAYS_WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const GOAL_LABELS = { calories: "Calories", protein: "Protein", carbs: "Carbs", fat: "Fat" };
const CHARTS = [
  ["kcal", "calories", "Calories"],
  ["protein", "protein", "Protein"],
  ["carbs", "carbs", "Carbs"],
  ["fat", "fat", "Fat"],
];

function dayOfWeek(ymd) {
  return new Date(ymd + "T12:00:00").getDay(); // 0=Sun..6=Sat
}

function allDaysInRange(start, end) {
  const days = [];
  let d = start;
  while (d <= end) { days.push(d); d = shiftYMD(d, 1); }
  return days;
}

export default function WeekMonthView({ daily, days, end, goalMap, today, onDrillDay }) {
  const start = shiftYMD(end, -(days - 1));
  const isWeek = days <= 7;
  const inWindow = (daily || []).filter((d) => d.ymd >= start && d.ymd <= end);
  const loggedSet = new Set(inWindow.map((d) => d.ymd));
  const loggedCount = loggedSet.size;
  const allDays = allDaysInRange(start, end);
  const rt = rangeTotals(daily, days, { end });
  const gh = perGoalHits(daily, goalMap, { start, end });
  const goalFor = (type) => goalMap.get(type)?.target_value ?? null;

  // ── Sparse state ──────────────────────────────────────────────────
  if (loggedCount < SPARSE_THRESHOLD) {
    const rangeLabel = isWeek ? "this week" : "this month";
    return (
      <div className="fwm">
        <div className="fwm-sparse">
          <p className="fwm-sparse-lead">
            {loggedCount === 0
              ? `Nothing logged ${rangeLabel} yet.`
              : `Only ${loggedCount} day logged ${rangeLabel}.`}
          </p>
          <p className="fwm-sparse-sub">Keep logging to see your patterns.</p>

          {isWeek && (
            <div className="fwm-dayind">
              {allDays.map((d) => {
                const dow = dayOfWeek(d);
                const label = DAYS_WEEK[dow === 0 ? 6 : dow - 1]; // Mon=0
                const logged = loggedSet.has(d);
                const isFuture = d > today;
                return (
                  <div key={d} className={`fwm-dayind-slot${logged ? " is-logged" : ""}${isFuture ? " is-future" : ""}`}>
                    <span className="fwm-dayind-label">{label}</span>
                    <span className="fwm-dayind-dot">{logged ? "●" : "○"}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!isWeek && (
            <div className="fwm-monthind">
              {allDays.map((d) => {
                const logged = loggedSet.has(d);
                const isFuture = d > today;
                return <span key={d} className={`fwm-monthind-bar${logged ? " is-logged" : ""}${isFuture ? " is-future" : ""}`} />;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full state ────────────────────────────────────────────────────
  const avgKcal = rt.perNutrient.kcal?.avg;
  const goalKeys = Object.keys(gh.goals);

  return (
    <div className="fwm">
      {/* Lead number: average kcal per logged day */}
      <div className="fwm-lead">
        <span className="fwm-lead-num">{avgKcal != null ? fmtNum("kcal", avgKcal) : "—"}</span>
        <span className="fwm-lead-caption">kcal · averaged over {loggedCount} logged day{loggedCount !== 1 ? "s" : ""}</span>
        <span className="fwm-lead-title">YOUR TYPICAL DAY</span>
      </div>

      {/* Supporting averages: P/C/F per logged day */}
      <div className="fwm-avgs">
        {[["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]].map(([k, label]) => (
          <div key={k} className="fwm-avg">
            <span className="fwm-avg-val">{rt.perNutrient[k]?.avg != null ? fmtNum(k, rt.perNutrient[k].avg) + "g" : "—"}</span>
            <span className="fwm-avg-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Per-goal consistency: X of N logged days */}
      {goalKeys.length > 0 && (
        <div className="fwm-consist">
          <span className="fwm-consist-head">ON TARGET · OUT OF {loggedCount} LOGGED DAY{loggedCount !== 1 ? "S" : ""}</span>
          <div className="fwm-consist-row">
            {goalKeys.map((type) => (
              <div key={type} className="fwm-consist-goal">
                <span className="fwm-consist-val">{gh.goals[type].hit}/{gh.goals[type].of}</span>
                <span className="fwm-consist-label">{GOAL_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day bars (week) or sparkline strip (month) */}
      {isWeek ? (
        <div className="fwm-weekbar">
          {allDays.map((d) => {
            const row = inWindow.find((r) => r.ymd === d);
            const dow = dayOfWeek(d);
            const label = DAYS_WEEK[dow === 0 ? 6 : dow - 1];
            const maxKcal = Math.max(...inWindow.map((r) => r.kcal || 0), 1);
            const h = row ? Math.max(4, (row.kcal / maxKcal) * 60) : 0;
            const isFuture = d > today;
            return (
              <div key={d} className="fwm-weekbar-day" onClick={() => row && onDrillDay?.(d)}>
                <div className="fwm-weekbar-track">
                  {row ? (
                    <div className="fwm-weekbar-fill" style={{ height: `${h}px` }} />
                  ) : (
                    <div className={`fwm-weekbar-gap${isFuture ? " is-future" : ""}`} />
                  )}
                </div>
                <span className="fwm-weekbar-label">{label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fwm-sparkline">
          {allDays.map((d) => {
            const row = inWindow.find((r) => r.ymd === d);
            const maxKcal = Math.max(...inWindow.map((r) => r.kcal || 0), 1);
            const h = row ? Math.max(2, (row.kcal / maxKcal) * 32) : 0;
            const isFuture = d > today;
            return (
              <span key={d} className={`fwm-spark${row ? " has-data" : ""}${isFuture ? " is-future" : ""}`}
                style={row ? { height: `${h}px` } : undefined} />
            );
          })}
        </div>
      )}

      {/* Unlogged days caption */}
      {(() => {
        const unlogged = allDays.filter((d) => !loggedSet.has(d) && d <= today);
        if (!unlogged.length) return null;
        if (isWeek) {
          const names = unlogged.map((d) => {
            const dow = dayOfWeek(d);
            return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow];
          });
          return <p className="fwm-unlogged">{names.join(", ")} not logged</p>;
        }
        return <p className="fwm-unlogged">{unlogged.length} day{unlogged.length !== 1 ? "s" : ""} not logged</p>;
      })()}

      {/* The 2×2 chart grid (kept — the owner wants to see the shape) */}
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
    </div>
  );
}
