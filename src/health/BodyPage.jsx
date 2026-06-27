import { useEffect, useState } from "react";
import { amsTodayYMD } from "../gym/gymDates";
import { fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { metricView as bodyView, BODY_METRICS } from "./healthBody";
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

// Which metrics sit in each labelled group (order = display order).
const COMPOSITION = ["weight", "body_fat", "lean_mass"];
const VITALS = ["resting_heart_rate", "respiratory_rate"];

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

  // Placeholder group (piece 1 only — pieces 2–3 fill in the real tiles).
  function placeholderGroup(label, metrics) {
    return (
      <section className="body-group">
        <h2 className="body-group-label">{label}</h2>
        <p className="body-view-stub">{metrics.join(" · ")} — coming next</p>
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
      ) : (
        <>
          {placeholderGroup("Composition", COMPOSITION)}
          {placeholderGroup("Vitals", VITALS)}
        </>
      )}
    </div>
  );
}
