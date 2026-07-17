import { useCallback, useEffect, useState } from "react";
import { amsTodayYMD, shiftYMD } from "../../spine/logic/gymDates";
import { fetchBody, fetchActivity, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { metricView as bodyView, BODY_METRICS } from "../../spine/logic/healthBody";
import { metricView as activityView } from "../../spine/logic/healthActivity";
import { composition } from "../../spine/logic/healthBodyRange";
import { metaFor } from "../../spine/logic/bodyFormat";
import { useGoalWrites } from "./useGoalWrites";
import BodyCompositionBlock from "./BodyCompositionBlock";
import EnergySection from "./EnergySection";
import BodySideColumn from "./BodySideColumn";
import GoalEditor from "./GoalEditor";
import RangeSwitcher from "../kit/RangeSwitcher";
import Breadcrumb from "../kit/Breadcrumb";
import Skeleton from "../kit/Skeleton";
import InlineError from "../kit/InlineError";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./healthChrome.css";
import "../kit/bodyPage.css";
import "../kit/bodySide.css";

// BodyPage — the Body front page (Health Hub → Body), V2 "Scale Ticket". Breadcrumb
// "Health / Body" + the shared RangeSwitcher chrome; the Latest view is a 3-group metric
// table (Composition / Energy / Vitals) under the .health-fit zero-scroll model. Data
// loads ONCE per open; range switching is client-side.
//
// STAGE 1 (this commit): the chrome + .health-fit shell + the empty 3-group table
// scaffold (headers, rows, freshness notes, placeholder bottom bars). The Latest cells
// are placeholders / latest-raw values; the band/movement/trace/goal treatments and the
// energy metrics (active/resting energy) fill in stages 2–4. The range views still render
// the V1 tiles (restyled in stage 5).

const START = "2026-01-01";
// The page loads the BODY_METRICS display list. (BMI + blood oxygen were cut from every
// Body surface in the V3 redesign — no longer fetched or rendered here.)
const LOAD_METRICS = [...BODY_METRICS];
const ACTIVITY_LOAD = ["active_energy", "resting_energy"]; // Energy group (activity_hourly)
const RANGES = [
  { id: "latest", label: "Latest" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "90", label: "90 days" },
];
const RANGE_DAYS = { week: 7, month: 30, "90": 90 };

export default function BodyPage({ onBack }) {
  const [range, setRange] = useState("latest");
  const [state, setState] = useState({ loading: true });
  const [goalMap, setGoalMap] = useState(new Map());
  const gw = useGoalWrites(goalMap, setGoalMap);

  const load = useCallback(() => {
    let alive = true;
    setState({ loading: true });
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, ...rest] = await Promise.all([
        fetchGoals(),
        ...LOAD_METRICS.map((m) => fetchBody(m, START, today)),
        ...ACTIVITY_LOAD.map((m) => fetchActivity(m, START, today)),
      ]);
      const bodyRowsArr = rest.slice(0, LOAD_METRICS.length);
      const actRowsArr = rest.slice(LOAD_METRICS.length);
      const resolved = resolveGoals(goals);
      const rowsByMetric = {};
      const body = {};
      LOAD_METRICS.forEach((m, i) => {
        rowsByMetric[m] = bodyRowsArr[i];
        body[m] = bodyView(m, bodyRowsArr[i], resolved.get(m), now);
      });
      const activityRows = {};
      const activity = {};
      ACTIVITY_LOAD.forEach((m, i) => {
        activityRows[m] = actRowsArr[i];
        activity[m] = activityView(m, actRowsArr[i], now);
      });
      if (alive) {
        setGoalMap(resolved);
        setState({ loading: false, now, today, rowsByMetric, body, activityRows, activity });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // The chart window for the current range. Week/Month/90 are trailing windows ending
  // today; "Latest" shows the FULL journey — from the EARLIEST real weigh-in to today.
  // (Bugfix: it used to start at the hardcoded fetch bound START = 2026-01-01, so the
  // axis spanned months of empty space before the first weigh-in and crushed the data
  // into the right edge. The domain now clamps to the first real reading.)
  function chartWindow() {
    const end = state.today;
    if (range === "latest") {
      let earliest = null;
      for (const r of state.rowsByMetric.weight || []) {
        if (r?.metric_date && (earliest == null || r.metric_date < earliest)) earliest = r.metric_date;
      }
      return { start: earliest || end, end };
    }
    return { start: shiftYMD(end, -(RANGE_DAYS[range] - 1)), end };
  }

  // The live page is a TWO-COLUMN layout (Piece 6): the MAIN column holds the dominant
  // Composition block (heroes + Var-2 chart + split) then the modest Energy section (ring +
  // bars + avg split); the SIDE column holds Vitals alongside them (not stacked below) —
  // the locked "vitals is side info" call, and what frees the vertical room so the whole
  // page holds zero-scroll. All three respond to the one range control.
  function renderBody() {
    const splitComp = composition(
      state.body?.weight?.latestRaw?.value,
      state.body?.body_fat?.latestRaw?.value,
      state.body?.lean_mass?.latestRaw?.value,
    );
    const win = chartWindow();
    return (
      <div className="health-fade" key={range}>
        <div className="body-body">
          <div className="body-main">
            <BodyCompositionBlock
              weightRows={state.rowsByMetric.weight}
              bodyFatRows={state.rowsByMetric.body_fat}
              splitComp={splitComp}
              weightGoal={goalMap.get("weight") ?? null}
              today={state.today}
              windowStart={win.start}
              windowEnd={win.end}
            />
            <EnergySection
              activity={state.activity}
              activityRows={state.activityRows}
              goalMap={goalMap}
              today={state.today}
              range={range}
              onSetGoal={(el) => gw.openEditor("active_energy", el)}
            />
          </div>
          <BodySideColumn
            weightRows={state.rowsByMetric.weight}
            bodyFatRows={state.rowsByMetric.body_fat}
            weightGoal={goalMap.get("weight") ?? null}
            body={state.body}
            rowsByMetric={state.rowsByMetric}
            today={state.today}
          />
        </div>
      </div>
    );
  }

  const isFit = !state.loading && !state.error; // every table view is zero-scroll-fit
  const breadcrumbEl = <Breadcrumb crumbs={[{ label: "Health", onClick: onBack }, { label: "Body" }]} />;
  const switcherEl = (
    <RangeSwitcher ranges={RANGES} value={range} ariaLabel="Body range" onChange={setRange} />
  );

  return (
    <div className={isFit ? "body-page health-fit" : "body-page"}>
      <div className="health-chrome">
        {breadcrumbEl}
        {switcherEl}
      </div>

      {state.loading ? (
        <Skeleton cols={4} />
      ) : state.error ? (
        <InlineError message={state.error} onRetry={load} />
      ) : (
        renderBody()
      )}

      {gw.editor && (
        <Popover anchorRef={gw.anchorRef} title={`${metaFor(gw.editor.metric).label} goal`} onClose={gw.closeEditor}>
          <GoalEditor
            metric={gw.editor.metric}
            current={state.body?.[gw.editor.metric]?.latestDaily?.value ?? state.activity?.[gw.editor.metric]?.rolling?.[7]?.avg ?? null}
            goal={goalMap.get(gw.editor.metric) ?? null}
            onSubmit={(vals) =>
              gw.submitGoal(
                gw.editor.metric,
                // active_energy is a MOVE-goal ("hit at least X") → force direction up,
                // overriding GoalEditor's value-inferred direction. Scoped to this metric
                // only; weight/body_fat keep their inferred direction, Food is untouched
                // (it writes via its own NutritionGoalsEditor, not this handler).
                gw.editor.metric === "active_energy" ? { ...vals, direction: "up" } : vals,
              )
            }
            onClear={() => gw.clearGoalFor(gw.editor.metric)}
            onClose={gw.closeEditor}
          />
        </Popover>
      )}
      {gw.toast && <Toast text={gw.toast} onDismiss={gw.dismissToast} />}
    </div>
  );
}
