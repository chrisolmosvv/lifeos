import { useEffect, useState } from "react";
import Health from "../Health";
import SleepPage from "./SleepPage";
import BodyPage from "./BodyPage";
import HubGymSection from "./HubGymSection";
import HubSleepSection from "./HubSleepSection";
import HubBodySection from "./HubBodySection";
import { dateLine, asOf } from "../../spine/logic/healthFormat";
import { amsTodayYMD } from "../../spine/logic/gymDates";
import { fetchSleep, fetchBody, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { sleepView } from "../../spine/logic/healthSleep";
import { BODY_METRICS } from "../../spine/logic/healthBody";
import { loadGymData } from "../../spine/data/gymLoad";
import { buildWorkouts } from "../../spine/logic/gymCalc";
import "../kit/healthHub.css";
import "./hubFrame.css";

const START = "2026-01-01"; // backfill start — covers 30- and 90-day windows plus a stale reading

// HealthHub — the Health section's landing screen. Loads sleep/body/gym FRESH on every
// open (compute-on-read), then hands the RAW rows to three rich sections laid out in a
// 2×2 frame (Gym spans the top; Sleep bottom-left; Body bottom-right). Each section owns
// its own calc (via the shared calc layer, so numbers match the detail pages) and taps
// through to its detail page — Gym → Health.jsx, Sleep → SleepPage, Body → BodyPage —
// via local `sub` state (unchanged). The mobile Health page is a separate file.
export default function HealthHub() {
  const [sub, setSub] = useState("hub"); // 'hub' | 'gym' | 'sleep' | 'body'
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (sub !== "hub") return; // only the hub view loads; recompute each time we land on it
    let alive = true;
    setState({ loading: true });
    const now = Date.now();
    const end = amsTodayYMD(now);
    (async () => {
      const [goals, sleep, gym, ...bodyRows] = await Promise.all([
        fetchGoals(),
        fetchSleep(START, end),
        loadGymData(),
        ...BODY_METRICS.map((m) => fetchBody(m, START, end)),
      ]);

      const goalMap = resolveGoals(goals);
      const sv = sleepView(sleep, goalMap, now);
      const built = buildWorkouts(gym.workouts, gym.exercises, gym.sets, gym.templatesById);
      const byMetric = {};
      BODY_METRICS.forEach((m, i) => { byMetric[m] = bodyRows[i]; });

      // "As of" = the most recent UNDERLYING reading timestamp across everything loaded
      // (when data was last received), not when this calc ran.
      const last = built[0] || null;
      const bodyLatest = bodyRows
        .flat()
        .map((r) => r?.reading_at)
        .filter(Boolean)
        .reduce((a, b) => (a && new Date(a) >= new Date(b) ? a : b), null);
      const stamps = [sv.lastNight?.wokeAt, last?.ended_at || last?.started_at, bodyLatest].filter(Boolean);
      const asOfTs = stamps.length
        ? stamps.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
        : null;

      if (alive) setState({ loading: false, now, sv, sleepRows: sleep, built, byMetric, goalMap, asOfTs });
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => { alive = false; };
  }, [sub]); // recompute each time we land back on the hub (fresh on open)

  if (sub === "gym") return <Health onBack={() => setSub("hub")} />;
  if (sub === "sleep") return <SleepPage onBack={() => setSub("hub")} />;
  if (sub === "body") return <BodyPage onBack={() => setSub("hub")} />;

  return (
    <div className="hub">
      <div className="hub-dateline">{dateLine()}</div>
      {state.loading ? (
        <div className="hub-loading">
          <span className="hub-spinner" aria-hidden="true" />
          <span>Reading your health…</span>
        </div>
      ) : state.error ? (
        <p className="hub-error">Couldn’t load your health data. {state.error}</p>
      ) : (
        <>
          <div className="hub-asof">{state.asOfTs ? `as of ${asOf(state.asOfTs)}` : "no data yet"}</div>
          <div className="hub-frame">
            <HubGymSection built={state.built} now={state.now} onOpen={() => setSub("gym")} />
            <HubSleepSection sv={state.sv} rows={state.sleepRows} now={state.now} onOpen={() => setSub("sleep")} />
            <HubBodySection
              weightRows={state.byMetric.weight}
              bodyFatRows={state.byMetric.body_fat}
              goalMap={state.goalMap}
              now={state.now}
              onOpen={() => setSub("body")}
            />
          </div>
        </>
      )}
    </div>
  );
}
