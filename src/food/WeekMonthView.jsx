import { shiftYMD, humanDayShort } from "../gym/gymDates";
import { rangeTotals, perGoalHits } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import FoodBarChart from "./FoodBarChart";

// WeekMonthView (Nutrition Slice 2) — consistency-focused Week/Month. Full-width, one-band top,
// charts below. Honest about logged days: averages and "X of Y" counts are ALWAYS over logged
// days only, and the count is always shown.

const SPARSE_THRESHOLD = 2;
const DAYS_WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const GOAL_LABELS = { calories: "Cal", protein: "Protein", carbs: "Carbs", fat: "Fat" };
const CHARTS = [
  ["kcal", "calories", "Calories"],
  ["protein", "protein", "Protein"],
  ["carbs", "carbs", "Carbs"],
  ["fat", "fat", "Fat"],
];

function dayOfWeek(ymd) {
  return new Date(ymd + "T12:00:00").getDay();
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
                const label = DAYS_WEEK[dow === 0 ? 6 : dow - 1];
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
  const unlogged = allDays.filter((d) => !loggedSet.has(d) && d <= today);

  return (
    <div className="fwm">
      {/* ── Top band: lead + averages + consistency — one horizontal row ── */}
      <div className="fwm-band">
        <div className="fwm-hero">
          <span className="fwm-hero-num">{avgKcal != null ? fmtNum("kcal", avgKcal) : "—"}</span>
          <span className="fwm-hero-unit">kcal / day</span>
          <span className="fwm-hero-cap">avg of {loggedCount} logged day{loggedCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="fwm-band-sep" />

        <div className="fwm-macros">
          {[["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, label]) => (
            <div key={k} className="fwm-macro">
              <span className="fwm-macro-val">{rt.perNutrient[k]?.avg != null ? fmtNum(k, rt.perNutrient[k].avg) : "—"}</span>
              <span className="fwm-macro-label">{label}</span>
            </div>
          ))}
        </div>

        {goalKeys.length > 0 && (
          <>
            <div className="fwm-band-sep" />
            <div className="fwm-targets">
              <span className="fwm-targets-head">ON TARGET</span>
              <div className="fwm-targets-row">
                {goalKeys.map((type) => (
                  <div key={type} className="fwm-target">
                    <span className="fwm-target-val">{gh.goals[type].hit}/{gh.goals[type].of}</span>
                    <span className="fwm-target-label">{GOAL_LABELS[type]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="fwm-band-sep" />

        {/* Inline week-bar or month-sparkline */}
        <div className="fwm-band-shape">
          {isWeek ? (
            <div className="fwm-minibar">
              {allDays.map((d) => {
                const row = inWindow.find((r) => r.ymd === d);
                const dow = dayOfWeek(d);
                const label = DAYS_WEEK[dow === 0 ? 6 : dow - 1];
                const maxKcal = Math.max(...inWindow.map((r) => r.kcal || 0), 1);
                const h = row ? Math.max(3, (row.kcal / maxKcal) * 36) : 0;
                const isFuture = d > today;
                return (
                  <div key={d} className="fwm-minibar-day" onClick={() => row && onDrillDay?.(d)}>
                    <div className="fwm-minibar-track">
                      {row ? (
                        <div className="fwm-minibar-fill" style={{ height: `${h}px` }} />
                      ) : (
                        <div className={`fwm-minibar-gap${isFuture ? " is-future" : ""}`} />
                      )}
                    </div>
                    <span className="fwm-minibar-label">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="fwm-minispark">
              {allDays.map((d) => {
                const row = inWindow.find((r) => r.ymd === d);
                const maxKcal = Math.max(...inWindow.map((r) => r.kcal || 0), 1);
                const h = row ? Math.max(2, (row.kcal / maxKcal) * 24) : 0;
                const isFuture = d > today;
                return (
                  <span key={d} className={`fwm-minispark-bar${row ? " has-data" : ""}${isFuture ? " is-future" : ""}`}
                    style={row ? { height: `${h}px` } : undefined} />
                );
              })}
            </div>
          )}
          {unlogged.length > 0 && (
            <span className="fwm-unlogged">
              {isWeek
                ? unlogged.map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dayOfWeek(d)]).join(", ") + " not logged"
                : `${unlogged.length} day${unlogged.length !== 1 ? "s" : ""} not logged`}
            </span>
          )}
        </div>
      </div>

      {/* ── Four macro charts — 2×2 grid, full width ── */}
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
