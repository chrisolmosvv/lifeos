import { useEffect, useMemo, useState } from "react";
import { amsTodayYMD, shiftYMD, humanDayLong, humanDayShort } from "../gym/gymDates";
import { fetchGoals } from "../health/healthLoad";
import { resolveGoals } from "../health/healthGoals";
import { dayLedger, dailyTotals, calorieArc, macroSplit } from "./foodCalc";
import { fetchEntries, fetchNames } from "./foodLoad";
import { fmtFull } from "./foodFormat";
import CalorieArc from "./CalorieArc";
import MacroBar from "./MacroBar";
import MealLedger from "./MealLedger";
import FoodRange from "./FoodRange";
import "./foodLog.css";

// LogPage — the Food Log front page (F5, READ-ONLY). Fills FoodPage's Log tab. Loads the
// owner's entries + goals ONCE (compute-on-read), then a Day / Week / Month switcher +
// chevron date nav reframe the page client-side. EVERY number comes from the F3 calc layer
// (dayLedger / calorieArc / macroSplit / dailyTotals / rangeTotals) — this view never does
// macro math. The add/edit affordances are placed but their ACTIONS are F6 (stubbed here).

const START = "2026-01-01"; // the whole record — load once, slice client-side
const RANGES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];
const RANGE_DAYS = { week: 7, month: 30 };
const GOAL_TYPES = ["calories", "protein", "carbs", "fat"];
const noop = () => {}; // F6 wires the real add/edit/goal actions

export default function LogPage() {
  const [range, setRange] = useState("day"); // 'day' | 'week' | 'month'
  const [date, setDate] = useState(null); //     day anchor / window end (ymd)
  const [state, setState] = useState({ loading: true });
  const [goalMap, setGoalMap] = useState(new Map());

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, entries] = await Promise.all([fetchGoals(), fetchEntries(START, today)]);
      const itemIds = [...new Set(entries.filter((e) => e.food_item_id).map((e) => e.food_item_id))];
      const recipeIds = [...new Set(entries.filter((e) => e.recipe_id).map((e) => e.recipe_id))];
      const names = await fetchNames(itemIds, recipeIds);
      if (alive) {
        setGoalMap(resolveGoals(goals));
        setDate(today);
        setState({ loading: false, now, today, entries, names });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
  }, []);

  const daily = useMemo(() => (state.entries ? dailyTotals(state.entries) : []), [state.entries]);

  if (state.loading) {
    return (
      <div className="food-loading">
        <span className="food-spinner" aria-hidden="true" />
        <span>Reading your food log…</span>
      </div>
    );
  }
  if (state.error) return <p className="flog-error">Couldn’t load your food log. {state.error}</p>;

  const step = range === "day" ? 1 : RANGE_DAYS[range];
  const atToday = date >= state.today;
  const go = (dir) => {
    const next = shiftYMD(date, dir * step);
    if (dir > 0 && next > state.today) return; // never past today
    if (next < START) return;
    setDate(next);
  };

  const dateLabel =
    range === "day"
      ? humanDayLong(date)
      : `${humanDayShort(shiftYMD(date, -(step - 1)))} – ${humanDayShort(date)}`;

  return (
    <div className="flog">
      <div className="flog-tabs" role="tablist" aria-label="Food range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === range}
            className={r.id === range ? "flog-tab is-active" : "flog-tab"}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flog-datenav">
        <button type="button" className="flog-arrow" aria-label="Previous" onClick={() => go(-1)}>‹</button>
        <div className="flog-date">
          {dateLabel}
          {range === "day" && date === state.today && <span className="flog-today">Today</span>}
        </div>
        <button type="button" className="flog-arrow" aria-label="Next" disabled={atToday} onClick={() => go(1)}>›</button>
      </div>

      {range === "day" ? (
        <DayView entries={state.entries} goalMap={goalMap} day={date} names={state.names} />
      ) : (
        <FoodRange
          daily={daily}
          days={step}
          end={date}
          goalMap={goalMap}
          onDrillDay={(ymd) => {
            setRange("day");
            setDate(ymd);
          }}
        />
      )}
    </div>
  );
}

// The Day view: the calorie-arc + macro-bar header, the fibre/sugar/sodium + drinks line,
// and the meal ledger — or the warm states (no goals → set-targets prompt replaces the arc;
// empty day → a one-line invite + the primary add).
function DayView({ entries, goalMap, day, names }) {
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
          <CalorieArc arc={arc} />
        ) : (
          <button type="button" className="flog-setgoals" onClick={noop}>
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

      {hasEntries ? (
        <MealLedger slots={ledger.slots} names={names} onAddFood={noop} onAddToSlot={noop} onEditEntry={noop} />
      ) : (
        <div className="flog-empty">
          <p className="flog-empty-line">Nothing logged yet — add a meal to start today’s ledger.</p>
          <button type="button" className="flog-add-primary" onClick={noop}>+ add food</button>
        </div>
      )}
    </>
  );
}
