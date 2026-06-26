// LifeOS — Health (S5) VERIFY HARNESS — TEMPORARY, throwaway.
//
// NOT the S6 UI and NOT in the nav. Reachable only at #health-debug (see the hook
// in LoggedIn.jsx). It runs the calc layer against the owner's REAL data and
// prints every derived number next to the raw inputs it came from, so the owner
// (who doesn't read code) can sanity-check the maths and we can tune the dead-
// bands. Delete this file + its one-line hook to remove the harness entirely.

import { useEffect, useState } from "react";
import { amsTodayYMD } from "./gym/gymDates";
import { fetchSleep, fetchBody, fetchActivity, fetchGoals } from "./health/healthLoad";
import { resolveGoals } from "./health/healthGoals";
import { sleepView } from "./health/healthSleep";
import { metricView as bodyView, BODY_METRICS } from "./health/healthBody";
import { metricView as activityView, ACTIVITY_METRICS } from "./health/healthActivity";

const START = "2026-01-01"; // backfill start — the whole record
const ACT_METRICS = [...ACTIVITY_METRICS, "heart_rate"]; // + secondary cardiac avg

// ── tiny display helpers (presentation only) ─────────────────────────────────
const n1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "—");
const n0 = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-GB") : "—");
const mins = (v) =>
  Number.isFinite(v) ? `${Math.round(v)} min (${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")})` : "—";
const clock = (m) =>
  Number.isFinite(m) ? `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}` : "—";
const arrow = (dir) => (dir === "up" ? "↑ up" : dir === "down" ? "↓ down" : dir === "flat" ? "→ flat" : "— (no data)");
const yn = (b) => (b == null ? "—" : b ? "YES" : "no");

export default function HealthDebug() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const end = amsTodayYMD();
      const [goals, sleep, ...rest] = await Promise.all([
        fetchGoals(),
        fetchSleep(START, end),
        ...BODY_METRICS.map((m) => fetchBody(m, START, end)),
        ...ACT_METRICS.map((m) => fetchActivity(m, START, end)),
      ]);
      const body = {};
      BODY_METRICS.forEach((m, i) => (body[m] = rest[i]));
      const act = {};
      ACT_METRICS.forEach((m, i) => (act[m] = rest[BODY_METRICS.length + i]));
      if (alive) setState({ loading: false, end, goals, sleep, body, act });
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => { alive = false; };
  }, []);

  if (state.loading) return <Wrap><p>Loading real data…</p></Wrap>;
  if (state.error) return <Wrap><p style={{ color: "crimson" }}>Error: {state.error}</p></Wrap>;

  const { goals, sleep, body, act, end } = state;
  const goalMap = resolveGoals(goals);
  const sv = sleepView(sleep);

  return (
    <Wrap>
      <p>
        Today (Amsterdam): <b>{end}</b> · range from {START}. Rows fetched —
        sleep {sleep.length}; {BODY_METRICS.map((m) => `${m} ${body[m].length}`).join(", ")};{" "}
        {ACT_METRICS.map((m) => `${m} ${act[m].length}`).join(", ")}.
      </p>

      <h3>Live goals (newest active per type)</h3>
      {goalMap.size === 0 ? (
        <p>None set yet. (vs-goal + streak will show as “no goal”.)</p>
      ) : (
        <ul>
          {[...goalMap.entries()].map(([t, g]) => (
            <li key={t}>
              <code>{t}</code>: target {g.target_value} {g.unit || ""} · direction {g.direction}
              {g.direction === "by_time" ? ` (= ${clock(g.target_value)})` : ""}
            </li>
          ))}
        </ul>
      )}

      <h2>SLEEP</h2>
      {!sv.lastNight ? <p>No sleep nights on record.</p> : (
        <>
          <h3>Last night — {sv.lastNight.nightDate}</h3>
          <ul>
            <li>Asleep: <b>{mins(sv.lastNight.asleepMinutes)}</b> (raw asleep_minutes={String(sv.lastNight.asleepMinutes)})</li>
            <li>In bed: {sv.lastNight.inBedAt || "—"} · Woke: {sv.lastNight.wokeAt || "—"} · Awakenings: {String(sv.lastNight.awakenings)}</li>
            <li>Stages — REM {sv.lastNight.stages.rem.min}m ({sv.lastNight.stages.rem.pct ?? "—"}%),
              Core {sv.lastNight.stages.core.min}m ({sv.lastNight.stages.core.pct ?? "—"}%),
              Deep {sv.lastNight.stages.deep.min}m ({sv.lastNight.stages.deep.pct ?? "—"}%),
              Awake {sv.lastNight.stages.awake.min}m (% of asleep — stages over asleep_minutes)</li>
          </ul>
          <h3>Duration vs goal</h3>
          {sv.durationVsGoal ? (
            <p>target {mins(sv.durationVsGoal.target)} · last night {mins(sv.durationVsGoal.value)} ·
              hit (asleep ≥ target): <b>{yn(sv.durationVsGoal.met)}</b> · delta {Math.round(sv.durationVsGoal.delta)} min</p>
          ) : <p>No sleep_duration goal set.</p>}

          <h3>Rolling average duration</h3>
          {[7, 30, 90].map((d) => (
            <Roll key={d} d={d} r={sv.rolling[d]} fmt={mins} label={(v) => `${v.ymd}: ${Math.round(v.value)}`} />
          ))}

          <h3>Trend (week-over-week)</h3>
          <p>{arrow(sv.trend.dir)} · last-7 avg {mins(sv.trend.currAvg)} vs prior-7 avg {mins(sv.trend.priorAvg)}
            {Number.isFinite(sv.trend.band) ? ` · dead-band ±${sv.trend.band} min` : ""} ·
            raw latest {mins(sv.trend.latest)} ({sv.trend.latestDate || "—"})</p>

          <h3>Goal streak (gap-pausing)</h3>
          {sv.streak ? (
            <>
              <p>Streak: <b>{sv.streak.streak}</b> nights (target {mins(sv.streak.target)}). Most-recent-first:</p>
              <ol>
                {sv.streak.detail.map((d) => (
                  <li key={d.ymd}>{d.ymd}: {d.asleep == null ? "no data → PAUSE" : `${Math.round(d.asleep)} min → ${d.hit ? "hit" : "MISS (breaks)"}`}</li>
                ))}
              </ol>
            </>
          ) : <p>No sleep_duration goal set.</p>}

          <h3>Bedtime consistency (last 7 nights)</h3>
          <p>std-dev: <b>{sv.bedtime.stdDevMin == null ? "—" : `${Math.round(sv.bedtime.stdDevMin)} min`}</b> over {sv.bedtime.nights} nights.</p>
          <ul>{sv.bedtime.times.map((t) => <li key={t.ymd}>{t.ymd}: in bed {clock(t.clockMin)}</li>)}</ul>

          <h3>Bedtime vs goal</h3>
          {sv.bedtimeVsGoal ? (
            <p>target {clock(sv.bedtimeVsGoal.target)} · last night {clock(sv.bedtimeVsGoal.value)} ·
              hit (≤ target): <b>{yn(sv.bedtimeVsGoal.met)}</b> · delta {Math.round(sv.bedtimeVsGoal.delta)} min ({sv.bedtimeVsGoal.nightDate})</p>
          ) : <p>No by_time bedtime goal set.</p>}
        </>
      )}

      <h2>BODY (per metric)</h2>
      {BODY_METRICS.map((m) => {
        const v = bodyView(m, body[m], goalMap.get(m));
        return (
          <div key={m} style={{ marginBottom: 18 }}>
            <h3>{m} {v.unit ? `(${v.unit})` : ""}</h3>
            <ul>
              <li>Today's headline (daily avg): {v.todayHeadline ? <b>{n1(v.todayHeadline.value)}</b> : "— (no reading today)"}
                {v.todayHeadline ? ` from [${v.todayHeadline.readings.map((r) => n1(r.value)).join(", ")}]` : ""}</li>
              <li>Latest raw: {v.latestRaw ? `${n1(v.latestRaw.value)} @ ${v.latestRaw.at}` : "—"}</li>
              <li>Value used for vs-goal (latest daily avg): {v.latestDaily ? `${n1(v.latestDaily.value)} (${v.latestDaily.ymd})` : "—"}</li>
            </ul>
            {[7, 30, 90].map((d) => (
              <Roll key={d} d={d} r={v.rolling[d]} fmt={n1} label={(x) => `${x.ymd}: ${n1(x.value)}`} />
            ))}
            <p>Trend: {arrow(v.trend.dir)} · last-7 {n1(v.trend.currAvg)} vs prior-7 {n1(v.trend.priorAvg)}
              {Number.isFinite(v.trend.band) ? ` · band ±${v.trend.band}` : ""}
              {v.arrowVerdict ? ` · vs goal: ${v.arrowVerdict.toUpperCase()}` : ""}</p>
            <p>vs goal: {v.vsGoal ? `target ${v.vsGoal.target} · current ${n1(v.vsGoal.value)} · met ${yn(v.vsGoal.met)} · delta ${n1(v.vsGoal.delta)}` : "no goal"}</p>
          </div>
        );
      })}

      <h2>ACTIVITY (per metric)</h2>
      {ACT_METRICS.map((m) => {
        const v = activityView(m, act[m]);
        return (
          <div key={m} style={{ marginBottom: 18 }}>
            <h3>{m} — {v.mode === "sum" ? "summed/day" : "averaged/day"} {v.unit ? `(${v.unit})` : ""}</h3>
            <p>Today so far ({v.today}, EXCLUDED from trend): {v.todaySoFar ? `${n0(v.todaySoFar.value)} over ${v.todaySoFar.hours}h` : "— (no data today)"}</p>
            <p>Latest completed day: {v.latestCompleted ? `${n0(v.latestCompleted.value)} (${v.latestCompleted.ymd})` : "—"} · completed through {v.completedThrough}</p>
            {[7, 30, 90].map((d) => (
              <Roll key={d} d={d} r={v.rolling[d]} fmt={n0} label={(x) => `${x.ymd}: ${n0(x.value)}`} />
            ))}
            <p>Trend: {arrow(v.trend.dir)} · last-7 {n0(v.trend.currAvg)} vs prior-7 {n0(v.trend.priorAvg)}
              {Number.isFinite(v.trend.band) ? ` · band ±${n0(v.trend.band)}` : ""}</p>
          </div>
        );
      })}
    </Wrap>
  );
}

// A rolling-window line: the average + the daily values it averaged.
function Roll({ d, r, fmt, label }) {
  return (
    <p style={{ margin: "2px 0" }}>
      <b>{d}-day avg: {fmt(r.avg)}</b> over {r.values.length} day(s) — [{r.values.map(label).join(", ") || "none"}]
    </p>
  );
}

function Wrap({ children }) {
  return (
    <div style={{ font: "13px/1.5 ui-monospace, Menlo, monospace", padding: 20, maxWidth: 900 }}>
      <p style={{ background: "#ffe8a3", padding: "6px 10px", fontWeight: 700 }}>
        ⚠ TEMPORARY S5 DEBUG READOUT — not the real UI, not in the nav. (#health-debug)
      </p>
      {children}
    </div>
  );
}
