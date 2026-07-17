import { useCallback, useEffect, useState } from "react";
import { amsTodayYMD, shiftYMD } from "../../spine/logic/gymDates";
import { fetchBody, fetchActivity, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { metricView as bodyView, BODY_METRICS } from "../../spine/logic/healthBody";
import { metricView as activityView } from "../../spine/logic/healthActivity";
import { composition } from "../../spine/logic/healthBodyRange";
import { metaFor } from "../../spine/logic/bodyFormat";
import { useGoalWrites } from "./useGoalWrites";
import BodyCompositionChart from "../kit/BodyCompositionChart";
import BodyComposition from "./BodyComposition";
import EnergySection from "./EnergySection";
import BodySideColumn from "./BodySideColumn";
import BodyRangeControl from "./BodyRangeControl";
import GoalEditor from "./GoalEditor";
import Breadcrumb from "../kit/Breadcrumb";
import Skeleton from "../kit/Skeleton";
import InlineError from "../kit/InlineError";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./healthChrome.css";
import "../kit/bodyPage.css";
import "../kit/bodySide.css";
import "../kit/bodyCompositionBlock.css";

// BodyPage — the Body front page (Health Hub → Body), V3. Breadcrumb + a Body-local TIME
// control: Today / 3 Months / 6 Months / 1 Year with prev/next paging (Piece 9). Data loads
// ONCE per open (the whole history); paging just re-windows the loaded rows — no refetch.
// The composition chart + the Energy bars/split follow the viewed period; the ring, hero
// numbers, fat/lean split and Vitals stay fixed to TODAY (current-status widgets).

const START = "2026-01-01";
const LOAD_METRICS = [...BODY_METRICS]; // BMI + blood oxygen were cut from Body in V3
const ACTIVITY_LOAD = ["active_energy", "resting_energy"];
const WINDOW_DAYS = { "3mo": 90, "6mo": 180, "1yr": 365 }; // Today = full journey (chart) / 14-day (energy)

// The earliest real weigh-in (the chart's Today-view start) and the earliest data point
// across ALL Body metrics (the backward-paging boundary). Both from the already-loaded rows.
function earliestWeight(state) {
  let min = null;
  for (const r of state.rowsByMetric?.weight || []) {
    if (r?.metric_date && (min === null || r.metric_date < min)) min = r.metric_date;
  }
  return min;
}
function earliestData(state) {
  let min = earliestWeight(state);
  const consider = (d) => { if (d && (min === null || d < min)) min = d; };
  for (const r of state.rowsByMetric?.body_fat || []) consider(r.metric_date);
  for (const m of ["active_energy", "resting_energy"]) {
    for (const r of state.activityRows?.[m] || []) consider(r.day);
  }
  return min;
}

export default function BodyPage({ onBack }) {
  const [win, setWin] = useState("today"); // 'today' | '3mo' | '6mo' | '1yr'
  const [anchor, setAnchor] = useState(null); // the viewed period's END ymd; null → today
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
    return () => { alive = false; };
  }, []);

  useEffect(() => load(), [load]);

  // ── PAGING derived state (safe before load: `today` is undefined until loaded) ──
  const today = state.today;
  const days = win === "today" ? null : WINDOW_DAYS[win];
  const anchorEnd = anchor || today || null;
  const earliest = state.rowsByMetric ? earliestData(state) : null;

  // The chart window: Today = the full journey (earliest weigh-in → today); a windowed view
  // = [anchorEnd − days + 1 .. anchorEnd]. Energy's window matches on the paged views, but
  // Today = a trailing 14 days ending today (its own current-status default).
  const viewStart = win === "today" || !today ? null : shiftYMD(anchorEnd, -(days - 1));
  const chartStart = win === "today" ? (earliestWeight(state) || today) : viewStart;
  const chartEnd = win === "today" ? today : anchorEnd;
  const energyEnd = win === "today" ? today : anchorEnd;
  const energyDays = win === "today" ? 14 : days;

  const prevDisabled = win === "today" || !earliest || (viewStart != null && viewStart <= earliest);
  const nextDisabled = win === "today" || !today || anchorEnd >= today;
  const showBackToToday = win !== "today" && !!today && anchorEnd < today;

  const changeWin = (w) => { setWin(w); setAnchor(null); }; // switching level returns to the present
  const page = (dir) => {
    if (win === "today" || !today) return;
    let next = shiftYMD(anchor || today, dir * WINDOW_DAYS[win]);
    if (next > today) next = today; // cap forward at today
    setAnchor(next);
  };

  // The live page: a two-column TOP ROW (full-width chart | Weight/Body-fat/Vitals column),
  // then the full-width fat/lean split bar + Energy section below it.
  function renderBody() {
    const splitComp = composition(
      state.body?.weight?.latestRaw?.value,
      state.body?.body_fat?.latestRaw?.value,
      state.body?.lean_mass?.latestRaw?.value,
    );
    return (
      <div className="health-fade" key={`${win}_${anchor || "now"}`}>
        <div className="body-body">
          <div className="body-main">
            <BodyCompositionChart
              weightRows={state.rowsByMetric.weight}
              bodyFatRows={state.rowsByMetric.body_fat}
              windowStart={chartStart}
              windowEnd={chartEnd}
              weightGoal={goalMap.get("weight") ?? null}
              today={state.today}
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

        <div className="bcb-split">
          <span className="bcb-split-label">fat / lean split</span>
          <BodyComposition comp={splitComp} />
        </div>
        <EnergySection
          activity={state.activity}
          activityRows={state.activityRows}
          goalMap={goalMap}
          today={state.today}
          viewEnd={energyEnd}
          viewDays={energyDays}
          onSetGoal={(el) => gw.openEditor("active_energy", el)}
        />
      </div>
    );
  }

  const isFit = !state.loading && !state.error;
  const breadcrumbEl = <Breadcrumb crumbs={[{ label: "Health", onClick: onBack }, { label: "Body" }]} />;
  const controlEl = (
    <BodyRangeControl
      win={win}
      onWin={changeWin}
      onPrev={() => page(-1)}
      onNext={() => page(1)}
      prevDisabled={prevDisabled}
      nextDisabled={nextDisabled}
      viewStart={viewStart}
      viewEnd={win === "today" ? null : anchorEnd}
      showBackToToday={showBackToToday}
      onBackToToday={() => setAnchor(null)}
    />
  );

  return (
    <div className={isFit ? "body-page health-fit" : "body-page"}>
      <div className="health-chrome">
        {breadcrumbEl}
        {controlEl}
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
                // active_energy is a MOVE-goal ("hit at least X") → force direction up.
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
