import { useEffect, useState } from "react";
import Health from "../Health";
import SleepPage from "./SleepPage";
import BodyPage from "./BodyPage";
import HubSleepCard from "./HubSleepCard";
import HubBodyCard from "./HubBodyCard";
import HubGymCard from "./HubGymCard";
import { dateLine, asOf } from "../../spine/logic/healthFormat";
import { amsTodayYMD } from "../../spine/logic/gymDates";
import { fetchSleep, fetchBody, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { sleepView } from "../../spine/logic/healthSleep";
import { metricView as bodyView, BODY_METRICS } from "../../spine/logic/healthBody";
import { loadGymData } from "../../spine/data/gymLoad";
import { buildWorkouts, boxScore } from "../../spine/logic/gymCalc";
import { recentSessions } from "../../spine/logic/gymSessions";
import "../kit/healthHub.css";

const START = "2026-01-01"; // backfill start — covers a stale latest reading too

// HealthHub — the Health section's landing screen. Loads sleep/body/gym FRESH on
// every open (compute-on-read), runs the S5 calc layer + gym calc, and renders the
// three cards over a quiet dateline + an "as of" freshness line. It wraps the
// existing Gym front page (Health.jsx) UNCHANGED behind a "← Health" back link;
// Sleep/Body open "coming soon" stubs (S6/S7 replace those).
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
      const body = {};
      BODY_METRICS.forEach((m, i) => {
        body[m] = bodyView(m, bodyRows[i], goalMap.get(m), now);
      });

      const built = buildWorkouts(gym.workouts, gym.exercises, gym.sets, gym.templatesById);
      const box = boxScore(built, 7, now);
      const sessions = recentSessions(built);
      const last = built[0] || null;
      const gymCard = {
        volume: box.volume,
        sessions: box.sessions,
        lastWorkoutAt: last?.started_at || null,
        lastMinutes: sessions[0]?.minutes ?? null,
      };

      // "As of" = the most recent UNDERLYING reading timestamp across the metrics
      // (when data was last received), not when this calc ran.
      const stamps = [
        sv.lastNight?.wokeAt,
        last?.ended_at || last?.started_at,
        ...BODY_METRICS.map((m) => body[m].latestRaw?.at),
      ].filter(Boolean);
      const asOfTs = stamps.length
        ? stamps.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
        : null;

      if (alive) setState({ loading: false, now, sv, body, gym: gymCard, asOfTs });
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
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
          <div className="hub-cards">
            <HubSleepCard sleep={state.sv} onClick={() => setSub("sleep")} />
            <HubBodyCard body={state.body} now={state.now} onClick={() => setSub("body")} />
            <HubGymCard gym={state.gym} now={state.now} onClick={() => setSub("gym")} />
          </div>
        </>
      )}
    </div>
  );
}
