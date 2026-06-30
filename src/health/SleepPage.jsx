import { useCallback, useEffect, useMemo, useState } from "react";
import { amsTodayYMD, shiftYMD, humanDayLong } from "../gym/gymDates";
import { fetchSleep, fetchBody, fetchGoals } from "./healthLoad";
import { resolveGoals } from "./healthGoals";
import { sleepView, nightOn } from "./healthSleep";
import { rangeBedWakeAverages } from "./healthRhythm";
import { dailyValueOn } from "./healthBody";
import { useGoalWrites } from "./useGoalWrites";
import SleepNight from "./SleepNight";
import SleepRange from "./SleepRange";
import SleepGoalEditor from "./SleepGoalEditor";
import RangeSwitcher from "../kit/RangeSwitcher";
import Breadcrumb from "../kit/Breadcrumb";
import Skeleton from "../kit/Skeleton";
import InlineError from "../kit/InlineError";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "../kit/sleepPage.css";

// SleepPage — the full Sleep front page (V2 broadsheet). Reached from the Health Hub's
// Sleep card. Chrome: a breadcrumb (Health / Sleep) top-left + a shared RangeSwitcher
// top-right (Last night / Week / Month / 90-day). Data loads ONCE per open
// (compute-on-read); switching ranges is a client-side cross-fade, no refetch. Loading
// shows a skeleton broadsheet; a fetch failure shows an inline error + retry.

const START = "2026-01-01"; // backfill start — the whole record
const RANGES = [
  { id: "night", label: "Last night" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "90", label: "90-day" },
];
const RANGE_DAYS = { week: 7, month: 30, "90": 90 };

export default function SleepPage({ onBack }) {
  const [view, setView] = useState("night"); // 'night' | 'week' | 'month' | '90'
  const [drilledNight, setDrilledNight] = useState(null); // a past night's ymd, or null
  const [state, setState] = useState({ loading: true });
  const [goalMap, setGoalMap] = useState(new Map());
  const gw = useGoalWrites(goalMap, setGoalMap);

  const load = useCallback(() => {
    let alive = true;
    setState({ loading: true });
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

  useEffect(() => load(), [load]);

  const sv = useMemo(
    () => (state.sleep ? sleepView(state.sleep, goalMap, state.now) : null),
    [state.sleep, state.now, goalMap],
  );

  function renderNight(breadcrumb, switcher) {
    const { sleep, resp, today } = state;
    const isLN = sv.lastNight && sv.lastNight.nightDate === today;
    const detail = isLN ? sv.lastNight : null;
    const nightRow = detail ? sleep.find((r) => r.night_date === detail.nightDate) : null;
    const rhythm = rangeBedWakeAverages(sleep, shiftYMD(today, -6), today);
    return (
      <SleepNight
        detail={detail}
        isLastNight={true}
        segments={nightRow?.segments ?? null}
        goalMinutes={goalMap.get("sleep_duration")?.target_value ?? null}
        bedtimeGoalMin={goalMap.get("bedtime")?.target_value ?? null}
        bedtimeVsGoal={sv.bedtimeVsGoal}
        consistency={sv.bedtime}
        rhythm={rhythm}
        weekRows={sleep}
        today={today}
        breadcrumb={breadcrumb}
        switcher={switcher}
        respValue={detail ? dailyValueOn(resp, detail.nightDate) : null}
        onEditSleepGoal={(el) => gw.openSleepEditor(el)}
        onNudgeToWeek={() => setView("week")}
      />
    );
  }

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

  function renderDrilledNight() {
    const { sleep, resp, today } = state;
    const nightRow = (sleep || []).find((r) => r.night_date === drilledNight) || null;
    return (
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
        today={today}
        respValue={dailyValueOn(resp, drilledNight)}
        onEditSleepGoal={null}
        onNudgeToWeek={null}
      />
    );
  }

  // Breadcrumb: Health / Sleep [/ the drilled night].
  const crumbs = [{ label: "Health", onClick: onBack }];
  if (drilledNight) {
    crumbs.push({ label: "Sleep", onClick: () => setDrilledNight(null) });
    crumbs.push({ label: humanDayLong(drilledNight) });
  } else {
    crumbs.push({ label: "Sleep" });
  }

  const fadeKey = drilledNight ? `drill-${drilledNight}` : view;
  const breadcrumbEl = <Breadcrumb crumbs={crumbs} />;
  const switcherEl = (
    <RangeSwitcher
      ranges={RANGES}
      value={view}
      ariaLabel="Sleep range"
      onChange={(id) => {
        setView(id);
        setDrilledNight(null);
      }}
    />
  );
  // The main "Last night" view carries the chrome INSIDE its columns (V2 visual lock);
  // every other state (loading / error / drill-in / week / month / 90) uses a top band.
  const isNightMain = !state.loading && !state.error && !drilledNight && view === "night";

  return (
    <div className={isNightMain ? "sleep-page sleep-page--fit" : "sleep-page"}>
      {!isNightMain && (
        <div className="sleep-chrome">
          {breadcrumbEl}
          {switcherEl}
        </div>
      )}

      {state.loading ? (
        <Skeleton cols={3} />
      ) : state.error ? (
        <InlineError message={state.error} onRetry={load} />
      ) : isNightMain ? (
        <div className="sleep-fade" key={fadeKey}>
          {renderNight(breadcrumbEl, switcherEl)}
        </div>
      ) : (
        <div className="sleep-fade" key={fadeKey}>
          {drilledNight ? renderDrilledNight() : renderRange(RANGE_DAYS[view])}
        </div>
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
