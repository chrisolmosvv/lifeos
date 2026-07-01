import { useCallback, useEffect, useMemo, useState } from "react";
import { amsTodayYMD, shiftYMD, humanDayLong, humanDayShort } from "../gym/gymDates";
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
import "./healthChrome.css";
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
  { id: "90", label: "90 days" },
];
const RANGE_DAYS = { week: 7, month: 30, "90": 90 };

export default function SleepPage({ onBack }) {
  const [view, setView] = useState("night"); // 'night' | 'week' | 'month' | '90'
  const [drilledNight, setDrilledNight] = useState(null); // a past night's ymd, or null
  const [weekAnchor, setWeekAnchor] = useState(null); // a week-start ymd when drilled from 90-day
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

  function renderRange(days, breadcrumb, switcher) {
    const { sleep, today } = state;
    // end = today by default; a past week-end when drilled into a week from 90-day.
    const end = weekAnchor ? shiftYMD(weekAnchor, 6) : today;
    return (
      <SleepRange
        days={days}
        rows={sleep}
        goal={goalMap.get("sleep_duration") ?? null}
        end={end}
        rolling={sv.rolling}
        breadcrumb={breadcrumb}
        switcher={switcher}
        onDrill={setDrilledNight}
        onWeekDrill={(weekStart) => {
          setWeekAnchor(weekStart);
          setView("week");
        }}
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

  // Breadcrumb: Health / Sleep [/ week of X] [/ the drilled night]. The "week of X" crumb
  // appears when drilled into a week from the 90-day view; clicking "Sleep" returns to the
  // 90-day it came from, "week of X" returns to that anchored week.
  const crumbs = [{ label: "Health", onClick: onBack }];
  if (weekAnchor) {
    crumbs.push({
      label: "Sleep",
      onClick: () => {
        setView("90");
        setWeekAnchor(null);
        setDrilledNight(null);
      },
    });
    crumbs.push({
      label: `week of ${humanDayShort(weekAnchor)}`,
      onClick: drilledNight ? () => setDrilledNight(null) : undefined,
    });
    if (drilledNight) crumbs.push({ label: humanDayLong(drilledNight) });
  } else if (drilledNight) {
    crumbs.push({ label: "Sleep", onClick: () => setDrilledNight(null) });
    crumbs.push({ label: humanDayLong(drilledNight) });
  } else {
    crumbs.push({ label: "Sleep" });
  }

  const fadeKey = drilledNight ? `drill-${drilledNight}` : weekAnchor ? `wk-${weekAnchor}-${view}` : view;
  const breadcrumbEl = <Breadcrumb crumbs={crumbs} />;
  const switcherEl = (
    <RangeSwitcher
      ranges={RANGES}
      value={view}
      ariaLabel="Sleep range"
      onChange={(id) => {
        setView(id);
        setDrilledNight(null);
        setWeekAnchor(null);
      }}
    />
  );
  // The "Last night" view AND the Week/Month/90 aggregates carry the chrome INSIDE their
  // own layout (the --fit, zero-scroll model); only loading / error / a night drill-in
  // fall back to a top chrome band + natural height.
  const isAgg = view === "week" || view === "month" || view === "90";
  const isFitMain = !state.loading && !state.error && !drilledNight && (view === "night" || isAgg);

  return (
    <div className={isFitMain ? "sleep-page health-fit" : "sleep-page"}>
      {!isFitMain && (
        <div className="health-chrome">
          {breadcrumbEl}
          {switcherEl}
        </div>
      )}

      {state.loading ? (
        <Skeleton cols={3} />
      ) : state.error ? (
        <InlineError message={state.error} onRetry={load} />
      ) : drilledNight ? (
        <div className="health-fade" key={fadeKey}>
          {renderDrilledNight()}
        </div>
      ) : view === "night" ? (
        <div className="health-fade" key={fadeKey}>
          {renderNight(breadcrumbEl, switcherEl)}
        </div>
      ) : (
        <div className="health-fade" key={fadeKey}>
          {renderRange(RANGE_DAYS[view], breadcrumbEl, switcherEl)}
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
