import { useEffect, useMemo, useState } from "react";
import { amsTodayYMD, shiftYMD, humanDayLong } from "../gym/gymDates";
import { fetchSleep, fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { sleepView, nightOn, rangeBedWakeAverages } from "./healthSleep";
import { dailyValueOn } from "./healthBody";
import { useGoalWrites } from "./useGoalWrites";
import SleepNight from "./SleepNight";
import SleepRange from "./SleepRange";
import SleepGoalEditor from "./SleepGoalEditor";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
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
  // Goals in their own state so an in-app edit (S9) updates without a refetch.
  const [goalMap, setGoalMap] = useState(new Map());
  const gw = useGoalWrites(goalMap, setGoalMap);

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
      if (alive) {
        setGoalMap(resolveGoals(goals));
        setState({ loading: false, now, today, sleep, resp });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => {
      alive = false;
    };
  }, []);

  // Recompute the view-model when the data OR the goals change, so an in-app goal
  // edit reflects at once (streak, bedtime-vs-target) without a refetch.
  const sv = useMemo(
    () => (state.sleep ? sleepView(state.sleep, goalMap, state.now) : null),
    [state.sleep, state.now, goalMap],
  );

  // The Night view = last night (today's wake date). We DON'T fall back to an older
  // night here — no data → the empty state nudges to the Week view.
  function renderNight() {
    const { sleep, resp, today } = state;
    const isLN = sv.lastNight && sv.lastNight.nightDate === today;
    const detail = isLN ? sv.lastNight : null;
    const nightRow = detail ? sleep.find((r) => r.night_date === detail.nightDate) : null;
    return (
      <SleepNight
        detail={detail}
        isLastNight={true}
        segments={nightRow?.segments ?? null}
        goalMinutes={goalMap.get("sleep_duration")?.target_value ?? null}
        bedtimeGoalMin={goalMap.get("bedtime")?.target_value ?? null}
        bedtimeVsGoal={sv.bedtimeVsGoal}
        consistency={sv.bedtime}
        weekRows={sleep}
        respValue={detail ? dailyValueOn(resp, detail.nightDate) : null}
        onEditSleepGoal={(el) => gw.openSleepEditor(el)}
        onNudgeToWeek={() => setView("week")}
      />
    );
  }

  // Week (7) / Month (30) range view.
  function renderRange(days) {
    const { sleep, today } = state;
    return (
      <SleepRange
        days={days}
        rows={sleep}
        goal={goalMap.get("sleep_duration") ?? null}
        today={today}
        rolling={sv.rolling}
        streak={sv.streak}
        onDrill={setDrilledNight}
      />
    );
  }

  // A specific past night opened from a range bar — the full Night view for that
  // night (consistency hidden: it's a rolling "as of now" metric, not per-night).
  function renderDrilledNight() {
    const { sleep, resp } = state;
    const nightRow = (sleep || []).find((r) => r.night_date === drilledNight) || null;
    return (
      <div>
        <button type="button" className="sleep-link" onClick={() => setDrilledNight(null)}>
          ← Back to {view}
        </button>
        <SleepNight
          detail={nightOn(sleep, drilledNight)}
          isLastNight={false}
          heading={humanDayLong(drilledNight)}
          segments={nightRow?.segments ?? null}
          goalMinutes={goalMap.get("sleep_duration")?.target_value ?? null}
          bedtimeGoalMin={goalMap.get("bedtime")?.target_value ?? null}
          bedtimeVsGoal={null}
          consistency={null}
          showConsistency={false}
          weekRows={sleep}
          respValue={dailyValueOn(resp, drilledNight)}
          onEditSleepGoal={null}
          onNudgeToWeek={null}
        />
      </div>
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
        drilledNight ? renderDrilledNight() : renderRange(7)
      ) : drilledNight ? (
        renderDrilledNight()
      ) : (
        renderRange(30)
      )}

      {gw.editor?.sleep && (
        <Popover anchorRef={gw.anchorRef} title="Sleep goals" onClose={gw.closeEditor}>
          <SleepGoalEditor
            durationGoalMin={goalMap.get("sleep_duration")?.target_value ?? null}
            bedtimeGoalMin={goalMap.get("bedtime")?.target_value ?? null}
            currentDurationMin={sv?.rolling?.[7]?.avg ?? null}
            currentBedtimeMin={
              rangeBedWakeAverages(state.sleep || [], shiftYMD(state.today, -6), state.today)?.bedAvgMin ?? null
            }
            onSubmit={(list) => gw.submitGoals(list)}
            onClearAll={() => gw.clearGoals(["sleep_duration", "bedtime"])}
            onClose={gw.closeEditor}
          />
        </Popover>
      )}
      {gw.toast && <Toast text={gw.toast} onDismiss={gw.dismissToast} />}
    </div>
  );
}
