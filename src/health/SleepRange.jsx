import { useState } from "react";
import { shiftYMD, humanDayShort } from "../gym/gymDates";
import { nightsHitGoal, goalStreak, bedtimeConsistency } from "./healthSleep";
import { rangeBedWakeAverages } from "./healthRhythm";
import { hm, clockFromMin } from "./healthFormat";
import SleepAggStats from "./SleepAggStats";
import SleepAggLedger from "./SleepAggLedger";

// SleepRange — the Week (7) / Month (30) / 90-day aggregate, V2 mockup-1 broadsheet:
// a thin breadcrumb+switcher chrome row, a full-width stats row, then a stacked stage-
// bars hero (flex-filling to the fold) beside a right goal/rhythm ledger. One component,
// varying by `days`. 90-day collapses to ~13 WEEKLY bars (each = that week's average
// night) and hides the baseline (no window wider than 90). Consumes existing getters
// only — awake-minutes avg + awakenings are inline reduces (presentation, no new getter).
//
// `end` is the window anchor (today by default; a past week-end when drilled into a week
// from the 90-day view). Nightly bar → onDrill(ymd); weekly bar → onWeekDrill(weekStart).

const STAGES = [
  { key: "deep", col: "deep_minutes", label: "Deep" },
  { key: "core", col: "core_minutes", label: "Core" },
  { key: "rem", col: "rem_minutes", label: "REM" },
  { key: "awake", col: "awake_minutes", label: "Awake" },
];
const total4 = (s) => STAGES.reduce((a, st) => a + (s[st.key] ?? s[st.col] ?? 0), 0);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function SleepRange({ days, rows, goal, end, rolling, breadcrumb, switcher, onDrill, onWeekDrill }) {
  const [active, setActive] = useState(null);
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
  const awakeningsTotal = inWindow.reduce((a, r) => a + (Number.isFinite(r.awakenings) ? r.awakenings : 0), 0);
  const awakeningsPerNight = dataNights ? awakeningsTotal / dataNights : null;

  const baseAvg = rolling?.[90]?.avg;
  const baseHasData = (rolling?.[90]?.values?.length || 0) >= 3;
  const showBaseline = !isWeekly && showSummary && Number.isFinite(avgDur) && Number.isFinite(baseAvg) && baseHasData;
  const baseDelta = showBaseline ? avgDur - baseAvg : null;
  const goalTarget = goal?.target_value ?? null;

  // ── Bars: nightly (week/month) or weekly-average (90) ──────────────────────
  let bars;
  if (isWeekly) {
    bars = [];
    for (let w = Math.ceil(days / 7) - 1; w >= 0; w--) {
      const wEnd = shiftYMD(end, -7 * w);
      const wStart = shiftYMD(wEnd, -6);
      const nights = (rows || []).filter(
        (r) => r?.night_date && r.night_date >= wStart && r.night_date <= wEnd && Number.isFinite(r.asleep_minutes),
      );
      const n = nights.length;
      const avgStage = (col) => (n ? nights.reduce((a, r) => a + (r[col] || 0), 0) / n : 0);
      bars.push({
        id: wStart,
        weekStart: wStart,
        label: humanDayShort(wStart),
        n,
        deep: avgStage("deep_minutes"),
        core: avgStage("core_minutes"),
        rem: avgStage("rem_minutes"),
        awake: avgStage("awake_minutes"),
        asleep: n ? nights.reduce((a, r) => a + r.asleep_minutes, 0) / n : null,
      });
    }
  } else {
    bars = [];
    for (let i = days - 1; i >= 0; i--) {
      const ymd = shiftYMD(end, -i);
      const r = (rows || []).find((x) => x.night_date === ymd) || null;
      bars.push({
        id: ymd,
        ymd,
        label: humanDayShort(ymd),
        n: r ? 1 : 0,
        deep: r?.deep_minutes ?? 0,
        core: r?.core_minutes ?? 0,
        rem: r?.rem_minutes ?? 0,
        awake: r?.awake_minutes ?? 0,
        asleep: r?.asleep_minutes ?? null,
      });
    }
  }
  const maxTotal = Math.max(1, ...bars.filter((b) => b.n).map(total4), goalTarget || 0);
  const perBarLabels = !isWeekly && days <= 7; // week only

  const act = active ? bars.find((b) => b.id === active) : null;
  const readout = act && act.n
    ? isWeekly
      ? `week of ${act.label} · avg ${hm(act.asleep)} · ${act.n} ${act.n === 1 ? "night" : "nights"}`
      : `${act.label} · ${hm(act.asleep)}`
    : null;

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
    { label: "awakenings", big: `${awakeningsTotal}`, sub: Number.isFinite(awakeningsPerNight) ? `${awakeningsPerNight.toFixed(1)} per night` : "" },
  ];

  return (
    <div className="sleep-agg">
      <div className="sleep-chrome agg-chrome">
        {breadcrumb}
        {switcher}
      </div>

      {showSummary ? <SleepAggStats cells={statsCells} /> : <p className="sleep-muted sr-sparse">Not enough nights yet for an average.</p>}

      <div className="agg-main">
        <div className="agg-chart">
          <div className="agg-legend">
            {STAGES.map((st) => (
              <span className="agg-legend-key" key={st.key}>
                <span className={`hyp-dot hyp-${st.key}`} />
                {st.label}
              </span>
            ))}
          </div>

          <div className="agg-bars">
            {Number.isFinite(goalTarget) && (
              <span className="agg-goal-line" style={{ bottom: `${(goalTarget / maxTotal) * 100}%` }}>
                <span className="agg-goal-label">goal {hm(goalTarget)}</span>
              </span>
            )}
            {bars.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`agg-col ${active === b.id ? "is-active" : ""}`}
                disabled={!b.n}
                onMouseEnter={() => setActive(b.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(b.id)}
                onBlur={() => setActive(null)}
                onClick={() => b.n && (isWeekly ? onWeekDrill?.(b.weekStart) : onDrill?.(b.ymd))}
                title={b.n ? `${b.label} · ${hm(b.asleep)}` : `${b.label} · no data`}
              >
                <span className="agg-bar">
                  {STAGES.map((st) =>
                    b[st.key] > 0 ? (
                      <span key={st.key} className={`agg-seg hyp-${st.key}`} style={{ height: `${(b[st.key] / maxTotal) * 100}%` }} />
                    ) : null,
                  )}
                </span>
              </button>
            ))}
          </div>

          {perBarLabels && (
            <div className="agg-labels">
              {bars.map((b) => (
                <span className="agg-col-label" key={b.id}>{b.n ? hm(b.asleep) : "—"}</span>
              ))}
            </div>
          )}

          <div className="agg-axis">
            <span>{humanDayShort(start)}</span>
            <span className="agg-readout">
              {readout || (isWeekly ? "weekly averages · hover a bar" : days > 7 ? "hover a bar for the night" : "")}
            </span>
            <span>{humanDayShort(end)}</span>
          </div>
        </div>

        <SleepAggLedger rows={ledgerRows} />
      </div>
    </div>
  );
}
