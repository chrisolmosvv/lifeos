import { useEffect, useState } from "react";
import { amsTodayYMD } from "../gym/gymDates";
import { ageLabel } from "./healthFormat";
import { fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { metricView as bodyView, BODY_METRICS } from "./healthBody";
import { composition, goalProgress, baselineBand } from "./healthBodyRange";
import { fmtFull } from "./bodyFormat";
import BodyTile from "./BodyTile";
import BodyComposition from "./BodyComposition";
import "../kit/bodyPage.css";

// BodyPage — the full Body front page, reached from the Health Hub's Body card
// (replacing the old "coming soon" stub). A Latest / Week / Month / 90-day range
// switcher reframes the WHOLE page (one range at a time); the page always OPENS on
// Latest. Data loads ONCE per open (compute-on-read) — switching ranges is
// client-side, no refetch. The "← Health" back returns to the hub, exactly like the
// Sleep page.
//
// PIECE 1 (scaffold): loads the five body metrics + goals, runs the S5 calc per
// metric, and renders the range switcher / spinner / back with EMPTY placeholders
// for the two groups. The real Composition + Vitals tiles land in pieces 2–3.

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

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, ...bodyRows] = await Promise.all([
        fetchGoals(),
        ...BODY_METRICS.map((m) => fetchBody(m, START, today)),
      ]);
      const goalMap = resolveGoals(goals);
      const rowsByMetric = {};
      const body = {};
      BODY_METRICS.forEach((m, i) => {
        rowsByMetric[m] = bodyRows[i];
        body[m] = bodyView(m, bodyRows[i], goalMap.get(m), now);
      });
      if (alive) setState({ loading: false, now, today, goalMap, rowsByMetric, body });
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
    const { body, rowsByMetric, goalMap, today, now } = state;
    const v = (m) => body[m];
    const series90 = (m) => v(m).rolling?.[90]?.values || [];

    const comp = composition(
      v("weight").latestRaw?.value,
      v("body_fat").latestRaw?.value,
      v("lean_mass").latestRaw?.value,
    );
    const wGoalProg = goalProgress(rowsByMetric.weight, goalMap.get("weight") ?? null, { end: today });

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
          <BodyComposition comp={comp} goalProg={wGoalProg} />
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

  // Week / Month / 90 ranges reframe the page — piece 3. Placeholder until then.
  function placeholderRange() {
    return (
      <section className="body-group">
        <p className="body-view-stub">Range view — coming next.</p>
      </section>
    );
  }

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
        placeholderRange()
      )}
    </div>
  );
}
