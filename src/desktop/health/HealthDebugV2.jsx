import { useEffect, useState } from "react";
import { amsTodayYMD } from "../../spine/logic/gymDates";
import { fetchActivity, fetchBody } from "../../spine/data/healthLoad";
import {
  metricView as activityView,
  aggregateDaily,
  aggMode,
  ACTIVITY_SUM_METRICS,
  ACTIVITY_AVG_METRICS,
} from "../../spine/logic/healthActivity";
import { metricView as bodyView } from "../../spine/logic/healthBody";
import { fixedBand } from "../../spine/logic/healthBodyRange";

// ⚠️ THROWAWAY — Health V2 P0c verify harness. Mounted behind the #health-debug-v2
// hash hook in LoggedIn.jsx. Prints every computed number next to its raw inputs so
// the owner can hand-check on a Mac. DELETE this file + the two hook lines after verify.

const START = "2026-01-01";
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : "—");
const ACT_METRICS = [...ACTIVITY_SUM_METRICS, ...ACTIVITY_AVG_METRICS];
const BODY_NEW = ["bmi", "blood_oxygen"];

function rawHoursByDay(rows) {
  const m = new Map();
  for (const r of rows || []) {
    if (!m.has(r.day)) m.set(r.day, []);
    m.get(r.day).push(`${String(r.hour).padStart(2, "0")}h:${r.value}`);
  }
  return m;
}

function ActivityBlock({ metric, rows, now }) {
  const mode = aggMode(metric);
  const daily = aggregateDaily(rows, mode);
  const vm = activityView(metric, rows, now);
  const raw = rawHoursByDay(rows);
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: "8px 0" }}>
        {metric} <small>[{mode}] · {rows.length} rows · unit {vm.unit ?? "—"}</small>
      </h3>
      {rows.length === 0 ? (
        <div style={{ color: "#a33" }}>SPARSE: 0 rows → no daily values (expected for resting_energy).</div>
      ) : (
        <>
          <div>
            today-so-far: {vm.todaySoFar ? `${r2(vm.todaySoFar.value)} (${vm.todaySoFar.hours}h)` : "—"} ·{" "}
            latest-completed: {vm.latestCompleted ? `${r2(vm.latestCompleted.value)} @ ${vm.latestCompleted.ymd}` : "—"} ·{" "}
            trend: {vm.trend.dir ?? "—"} {vm.trend.dir ? `(${r2(vm.trend.diff)})` : ""}
          </div>
          <div>rolling avg — 7: {r2(vm.rolling[7].avg)} · 30: {r2(vm.rolling[30].avg)} · 90: {r2(vm.rolling[90].avg)}</div>
          <table style={{ fontSize: 12, marginTop: 4, borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={cell}>day</th><th style={cell}>daily value</th><th style={cell}>hrs used</th><th style={cell}>raw hours (hour:value)</th></tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.ymd}>
                  <td style={cell}>{d.ymd}</td>
                  <td style={cell}><b>{r2(d.value)}</b></td>
                  <td style={cell}>{d.hours}</td>
                  <td style={cell}>{(raw.get(d.ymd) || []).join("  ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function BodyBlock({ metric, rows, now, today }) {
  const vm = bodyView(metric, rows, null, now);
  const band = fixedBand(metric, vm.latestDaily?.value);
  const raw = new Map();
  for (const r of rows || []) {
    if (!raw.has(r.metric_date)) raw.set(r.metric_date, []);
    raw.get(r.metric_date).push(r.value);
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: "8px 0" }}>{metric} <small>· {rows.length} rows · unit {vm.unit ?? "—"}</small></h3>
      {rows.length === 0 ? (
        <div style={{ color: "#a33" }}>SPARSE: 0 rows → no value.</div>
      ) : (
        <>
          <div>
            latest-raw: {vm.latestRaw ? `${r2(vm.latestRaw.value)} @ ${vm.latestRaw.at}` : "—"} ·{" "}
            latest-daily-avg: {vm.latestDaily ? `${r2(vm.latestDaily.value)} @ ${vm.latestDaily.ymd}` : "—"} ·{" "}
            trend: {vm.trend.dir ?? "—"} {vm.trend.dir ? `(${r2(vm.trend.diff)})` : ""}
          </div>
          <div>rolling avg — 7: {r2(vm.rolling[7].avg)} · 30: {r2(vm.rolling[30].avg)} · 90: {r2(vm.rolling[90].avg)}</div>
          <div>
            FIXED BAND {band ? `${band.lo}–${band.hi}` : "—"} → verdict:{" "}
            <b>{band?.verdict ?? "—"}</b> (value {r2(band?.value)})
          </div>
          <table style={{ fontSize: 12, marginTop: 4, borderCollapse: "collapse" }}>
            <thead><tr><th style={cell}>day</th><th style={cell}>daily-avg</th><th style={cell}>raw readings</th></tr></thead>
            <tbody>
              {[...raw.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, vals]) => (
                <tr key={day}>
                  <td style={cell}>{day}</td>
                  <td style={cell}><b>{r2(vals.reduce((a, b) => a + b, 0) / vals.length)}</b></td>
                  <td style={cell}>{vals.join("  ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const cell = { border: "1px solid #ccc", padding: "2px 6px", textAlign: "left", verticalAlign: "top" };

export default function HealthDebugV2() {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const act = {};
      for (const m of ACT_METRICS) act[m] = await fetchActivity(m, START, today);
      const body = {};
      for (const m of BODY_NEW) body[m] = await fetchBody(m, START, today);
      setState({ loading: false, now, today, act, body });
    })().catch((e) => setState({ loading: false, error: e.message || String(e) }));
  }, []);

  if (state.loading) return <div style={{ padding: 20 }}>Loading health V2 debug…</div>;
  if (state.error) return <div style={{ padding: 20, color: "#a33" }}>Error: {state.error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: "monospace", maxWidth: 900 }}>
      <h1>Health V2 P0c debug — {state.today}</h1>
      <p>AVG metrics average over ACTIVE (value&gt;0) hours only. Hand-check daily value vs raw hours.</p>
      <h2>Activity (activity_hourly)</h2>
      {ACT_METRICS.map((m) => (
        <ActivityBlock key={m} metric={m} rows={state.act[m]} now={state.now} />
      ))}
      <h2>Body point readings (body_metrics)</h2>
      {BODY_NEW.map((m) => (
        <BodyBlock key={m} metric={m} rows={state.body[m]} now={state.now} today={state.today} />
      ))}
    </div>
  );
}
