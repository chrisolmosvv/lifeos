import { useEffect, useState } from "react";
import { amsTodayYMD, shiftYMD } from "../gym/gymDates";
import { ageLabel } from "./healthFormat";
import { fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { metricView as bodyView, BODY_METRICS } from "./healthBody";
import { DEADBAND } from "./healthStats";
import { composition, goalProgress, baselineBand, windowDelta } from "./healthBodyRange";
import { fmtFull, metaFor } from "./bodyFormat";
import { useGoalWrites } from "./useGoalWrites";
import BodyTile from "./BodyTile";
import BodyComposition from "./BodyComposition";
import GoalEditor from "./GoalEditor";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "../kit/bodyPage.css";

// BodyPage — the full Body front page (Health Hub → Body). A Latest / Week / Month /
// 90-day switcher reframes the WHOLE page; opens on Latest; data loads ONCE per open
// (compute-on-read), range switching is client-side. Latest shows Composition + Vitals
// groups with goal bars (weight + body_fat are goal-able via the S9 editor); the range
// views show line charts. "← Health" returns to the hub, like the Sleep page.

const START = "2026-01-01"; // backfill start — the whole record
const RANGES = [
  { id: "latest", label: "Latest" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "90", label: "90 days" },
];

export default function BodyPage({ onBack }) {
  const [range, setRange] = useState("latest"); // 'latest' | 'week' | 'month' | '90'
  const [state, setState] = useState({ loading: true });
  // Goals live in their own state so an in-app edit (S9) can update them without a
  // refetch; the write hook updates this Map optimistically.
  const [goalMap, setGoalMap] = useState(new Map());
  const gw = useGoalWrites(goalMap, setGoalMap);

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, ...bodyRows] = await Promise.all([
        fetchGoals(),
        ...BODY_METRICS.map((m) => fetchBody(m, START, today)),
      ]);
      const resolved = resolveGoals(goals);
      const rowsByMetric = {};
      const body = {};
      BODY_METRICS.forEach((m, i) => {
        rowsByMetric[m] = bodyRows[i];
        body[m] = bodyView(m, bodyRows[i], resolved.get(m), now);
      });
      if (alive) {
        setGoalMap(resolved);
        setState({ loading: false, now, today, rowsByMetric, body });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
  }, []);

  // The Latest view (piece 2): Composition trio + fat-vs-lean bar + weight goal bar,
  // and the Vitals pair as 7-day averages + personal bands. "Current value" for
  // Composition = the latest single READING (deliberate override of the daily-average
  // headline); Vitals = the smoothed 7-day average (noisy single readings). Trends and
  // sparklines roll over the daily-average series either way (S5).
  function renderLatest() {
    const { body, rowsByMetric, today, now } = state;
    const v = (m) => body[m];
    const series90 = (m) => v(m).rolling?.[90]?.values || [];

    const comp = composition(
      v("weight").latestRaw?.value,
      v("body_fat").latestRaw?.value,
      v("lean_mass").latestRaw?.value,
    );
    // Goal bars below the trio: weight + body_fat are goal-able (S9); lean is not.
    const goalArea = [
      { metric: "weight", promptText: "Set a goal weight to track progress." },
      { metric: "body_fat", promptText: "Set a body-fat goal to track progress." },
    ].map(({ metric, promptText }) => ({
      metric,
      promptText,
      hasGoal: goalMap.has(metric),
      goalProg: goalProgress(rowsByMetric[metric], goalMap.get(metric) ?? null, { end: today }),
      onEdit: (el) => gw.openEditor(metric, el),
    }));

    const compTile = (m, extra) => (
      <BodyTile
        metric={m}
        value={v(m).latestRaw?.value ?? null}
        subLabel={v(m).latestRaw ? ageLabel(v(m).latestRaw.at, now) : null}
        extra={extra}
        trend={v(m).trend}
        series={series90(m)}
      />
    );

    const vitalTile = (m) => (
      <BodyTile
        metric={m}
        value={v(m).rolling?.[7]?.avg ?? null}
        subLabel="7-day average"
        trend={v(m).trend}
        series={series90(m)}
        band={baselineBand(rowsByMetric[m], { end: today })}
      />
    );

    const fatMassExtra = Number.isFinite(comp.fatMassKg)
      ? `${fmtFull("lean_mass", comp.fatMassKg)} fat`
      : null;

    return (
      <>
        <section className="body-group">
          <h2 className="body-group-label">Composition</h2>
          <div className="body-tiles body-tiles--3">
            {compTile("weight")}
            {compTile("body_fat", fatMassExtra)}
            {compTile("lean_mass")}
          </div>
          <BodyComposition comp={comp} goals={goalArea} />
        </section>

        <section className="body-group body-group--vitals">
          <h2 className="body-group-label">Vitals</h2>
          <div className="body-tiles body-tiles--2">
            {vitalTile("resting_heart_rate")}
            {vitalTile("respiratory_rate")}
          </div>
        </section>
      </>
    );
  }

  // Week (7) / Month (30) / 90-day reframe: every value becomes that range's AVERAGE,
  // every trend becomes that range's window-over-window DELTA (windowDelta shows "—"
  // cleanly while no prior window exists), and the sparkline grows into a full line
  // chart over the window — with the goal line (weight only) or normal-range band
  // (vitals) overlaid. No composition/goal bar here; those are Latest-view snapshots.
  function renderRange(days) {
    const { body, rowsByMetric, today } = state;
    const v = (m) => body[m];
    const windowStart = shiftYMD(today, -(days - 1));
    const weightGoalVal = goalMap.get("weight")?.target_value ?? null;

    const tile = (m, opts = {}) => (
      <BodyTile
        metric={m}
        value={v(m).rolling?.[days]?.avg ?? null}
        subLabel={`${days}-day average`}
        trend={windowDelta(rowsByMetric[m], days, { end: today, deadband: DEADBAND[m] })}
        series={v(m).rolling?.[days]?.values || []}
        chartVariant="full"
        windowStart={windowStart}
        windowEnd={today}
        goalValue={opts.goalValue ?? null}
        band={opts.band ?? null}
      />
    );

    return (
      <>
        <section className="body-group">
          <h2 className="body-group-label">Composition · {days}-day</h2>
          <div className="body-tiles body-tiles--3">
            {tile("weight", { goalValue: weightGoalVal })}
            {tile("body_fat")}
            {tile("lean_mass")}
          </div>
        </section>

        <section className="body-group body-group--vitals">
          <h2 className="body-group-label">Vitals · {days}-day</h2>
          <div className="body-tiles body-tiles--2">
            {tile("resting_heart_rate", { band: baselineBand(rowsByMetric.resting_heart_rate, { end: today }) })}
            {tile("respiratory_rate", { band: baselineBand(rowsByMetric.respiratory_rate, { end: today }) })}
          </div>
        </section>
      </>
    );
  }

  const RANGE_DAYS = { week: 7, month: 30, "90": 90 };

  return (
    <div className="body-page">
      <button type="button" className="hub-back" onClick={onBack}>
        ← Health
      </button>

      <div className="body-tabs" role="tablist" aria-label="Body range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === range}
            className={r.id === range ? "body-tab is-active" : "body-tab"}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {state.loading ? (
        <div className="body-loading">
          <span className="hub-spinner" aria-hidden="true" />
          <span>Reading your body stats…</span>
        </div>
      ) : state.error ? (
        <p className="body-error">Couldn’t load your body stats. {state.error}</p>
      ) : range === "latest" ? (
        renderLatest()
      ) : (
        renderRange(RANGE_DAYS[range])
      )}

      {gw.editor && (
        <Popover
          anchorRef={gw.anchorRef}
          title={`${metaFor(gw.editor.metric).label} goal`}
          onClose={gw.closeEditor}
        >
          <GoalEditor
            metric={gw.editor.metric}
            current={state.body?.[gw.editor.metric]?.latestDaily?.value ?? null}
            goal={goalMap.get(gw.editor.metric) ?? null}
            onSubmit={(vals) => gw.submitGoal(gw.editor.metric, vals)}
            onClear={() => gw.clearGoalFor(gw.editor.metric)}
            onClose={gw.closeEditor}
          />
        </Popover>
      )}
      {gw.toast && <Toast text={gw.toast} onDismiss={gw.dismissToast} />}
    </div>
  );
}
