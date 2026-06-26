import { useEffect, useState } from "react";
import { amsTodayYMD } from "../gym/gymDates";
import { fetchSleep, fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { sleepView } from "./healthSleep";
import { dailyValueOn } from "./healthBody";
import SleepNight from "./SleepNight";
import "../kit/sleepPage.css";

// SleepPage — the full Sleep front page, reached from the Health Hub's Sleep card
// (replacing the old stub). A Night / Week / Month segmented control swaps the whole
// view (one range at a time); the page always OPENS on Night. Data loads ONCE per
// open (compute-on-read) — switching ranges is client-side, no refetch. The
// "← Health" back returns to the hub, same pattern as the Gym page.
//
// PIECE 1 (scaffold): loads the data + renders the control/spinner/back; the Night
// and Week/Month views are placeholders, filled in pieces 2–3. `drilledNight` (a
// past night's date opened from a Week/Month bar) is wired now so piece 3 can use it.

const START = "2026-01-01"; // backfill start — the whole record
const RANGES = [
  { id: "night", label: "Night" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function SleepPage({ onBack }) {
  const [view, setView] = useState("night"); // 'night' | 'week' | 'month'
  const [drilledNight, setDrilledNight] = useState(null); // a past night's ymd, or null
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, sleep, resp] = await Promise.all([
        fetchGoals(),
        fetchSleep(START, today),
        fetchBody("respiratory_rate", START, today),
      ]);
      const goalMap = resolveGoals(goals);
      const sv = sleepView(sleep, goalMap, now);
      if (alive) setState({ loading: false, now, today, sleep, resp, goalMap, sv });
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
  }, []);

  // The Night view = last night (today's wake date). We DON'T fall back to an older
  // night here — no data → the empty state nudges to the Week view.
  function renderNight() {
    const { sv, sleep, resp, goalMap, today } = state;
    const isLN = sv.lastNight && sv.lastNight.nightDate === today;
    const detail = isLN ? sv.lastNight : null;
    const nightRow = detail ? sleep.find((r) => r.night_date === detail.nightDate) : null;
    return (
      <SleepNight
        detail={detail}
        isLastNight={true}
        segments={nightRow?.segments ?? null}
        goalMinutes={goalMap.get("sleep_duration")?.target_value ?? null}
        bedtimeVsGoal={sv.bedtimeVsGoal}
        consistency={sv.bedtime}
        weekRows={sleep}
        respValue={detail ? dailyValueOn(resp, detail.nightDate) : null}
        hasGoal={goalMap.has("sleep_duration") || goalMap.has("bedtime")}
        onNudgeToWeek={() => setView("week")}
      />
    );
  }

  return (
    <div className="sleep-page">
      <button type="button" className="hub-back" onClick={onBack}>
        ← Health
      </button>

      <div className="sleep-tabs" role="tablist" aria-label="Sleep range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === view}
            className={r.id === view ? "sleep-tab is-active" : "sleep-tab"}
            onClick={() => {
              setView(r.id);
              setDrilledNight(null); // leaving for another range clears any drill-in
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {state.loading ? (
        <div className="sleep-loading">
          <span className="hub-spinner" aria-hidden="true" />
          <span>Reading your sleep…</span>
        </div>
      ) : state.error ? (
        <p className="sleep-error">Couldn’t load your sleep. {state.error}</p>
      ) : view === "night" ? (
        renderNight()
      ) : view === "week" ? (
        <div className="sleep-view-stub">Week view — built in piece 3.</div>
      ) : (
        <div className="sleep-view-stub">Month view — built in piece 3.</div>
      )}
    </div>
  );
}
