import { useCallback, useEffect, useState } from "react";
import { amsTodayYMD, shiftYMD } from "../../spine/logic/gymDates";
import { fetchBody, fetchActivity, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { metricView as bodyView, BODY_METRICS } from "../../spine/logic/healthBody";
import { metricView as activityView } from "../../spine/logic/healthActivity";
import { composition } from "../../spine/logic/healthBodyRange";
import { metaFor } from "../../spine/logic/bodyFormat";
import { useGoalWrites } from "./useGoalWrites";
import { buildLatestGroups, buildRangeGroups } from "./bodyGroups";
import BodyTable from "./BodyTable";
import BodyCompositionBlock from "./BodyCompositionBlock";
import GoalEditor from "./GoalEditor";
import RangeSwitcher from "../kit/RangeSwitcher";
import Breadcrumb from "../kit/Breadcrumb";
import Skeleton from "../kit/Skeleton";
import InlineError from "../kit/InlineError";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./healthChrome.css";
import "../kit/bodyPage.css";

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
  // today; "Latest" shows the FULL journey (all history from START) — a snapshot number
  // (the heroes) over the whole trend, and the one window each range that isn't the "90"
  // tab already covers. (Latest-window semantics were the open recon fork — this is the
  // default chosen; flagged in the handoff, reversible.)
  function chartWindow() {
    const end = state.today;
    if (range === "latest") return { start: START, end };
    return { start: shiftYMD(end, -(RANGE_DAYS[range] - 1)), end };
  }

  // The live page: the Composition BLOCK (heroes + Var-2 chart + fat/lean split) is the
  // dominant content; Energy + Vitals stay as their existing table rows beneath (their
  // redesign is Pieces 5/6 — untouched here). Both respond to the one range control.
  function renderBody() {
    const ctx = {
      body: state.body,
      activity: state.activity,
      rowsByMetric: state.rowsByMetric,
      activityRows: state.activityRows,
      goalMap,
      today: state.today,
      openEditor: gw.openEditor,
    };
    const allGroups = range === "latest" ? buildLatestGroups(ctx) : buildRangeGroups(ctx, RANGE_DAYS[range]);
    const restGroups = allGroups.filter((g) => g.name !== "Composition"); // Composition → the block below
    const splitComp = composition(
      state.body?.weight?.latestRaw?.value,
      state.body?.body_fat?.latestRaw?.value,
      state.body?.lean_mass?.latestRaw?.value,
    );
    const win = chartWindow();
    return (
      <div className="health-fade" key={range}>
        <BodyCompositionBlock
          weightRows={state.rowsByMetric.weight}
          bodyFatRows={state.rowsByMetric.body_fat}
          splitComp={splitComp}
          weightGoal={goalMap.get("weight") ?? null}
          today={state.today}
          windowStart={win.start}
          windowEnd={win.end}
        />
        <BodyTable groups={restGroups} />
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
