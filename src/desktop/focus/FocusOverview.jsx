import { amsClockMinutes, humanDayShort } from "../../spine/logic/gymDates";
import { dayArcs, dayLedger, dayFocusTotal, dayRestTotal } from "./focusCalc.js";
import { rangeBars, weekRingStrip, weekVsTrailingAvg } from "./focusTrend.js";
import { formatDuration } from "./focusFormat.js";
import FocusDial from "./FocusDial";
import FocusChart from "./FocusChart";
import FocusRangeControls from "./FocusRangeControls";
import FocusLedger from "./FocusLedger";
import WeekRingStrip from "./WeekRingStrip";

// FocusOverview (redesign, piece 1) — the Today face, now a TWO-COLUMN layout:
//   LEFT   — the dial, with "Start a session" + a quiet "add past · targets" line under it.
//   (hairline divider)
//   RIGHT  — the week chart on top (chart-led) over the session ledger below.
//   FOOT   — the full-width week ring-strip.
// This piece lands the arrangement + the split (the chart is now its own FocusChart).
// The dial rotation, the chart detail, the range controls, the ring-strip rework and
// the running-state Start arrive in later pieces. Strict zero-scroll: the parent caps
// the height; chart + ledger share the right column; the ledger overflows to "see all".
//
// Props: rawRows, today (ymd), now (ms), colorFor(id), filterCat, onPickCategory,
//   onClear, onSeeAll, dailySeconds, weeklySeconds, onSetTarget, onStart, onAddPast,
//   targetsRef (anchors the Targets popover, owned by the page).
export default function FocusOverview({
  rawRows, today, now, colorFor, nameFor, catRank, filterCat, onPickCategory, onClear, onSeeAll,
  filterDay, onPickDay, onClearDay,
  dailySeconds, weeklySeconds, onSetTarget, onStart, onAddPast, targetsRef,
  range, windowNow, canForward, onRange, onStepBack, onStepFwd, onExpand,
}) {
  // The chart's rolling window (mode + how far back) is owned by the page; we just draw
  // it. One rangeBars call feeds both the chart and the window label under it.
  const chartData = rangeBars(rawRows, { range, now: windowNow });
  const windowLabel = chartData.days.length
    ? `${humanDayShort(chartData.days[0].ymd)} – ${humanDayShort(chartData.days[chartData.days.length - 1].ymd)}`
    : "";

  // The ledger follows the week-strip day selection (the DIAL stays on today, ruling B).
  const selectedDay = filterDay || today;
  const ledgerTitle = filterDay && filterDay !== today ? humanDayShort(filterDay) : "Today";
  const arcs = dayArcs(rawRows, today);
  const allRows = dayLedger(rawRows, selectedDay);
  const rows = filterCat ? allRows.filter((r) => r.categoryId === filterCat) : allRows;
  const focusTotal = dayFocusTotal(rawRows, today);
  const restTotal = dayRestTotal(rawRows, today);
  const trend = weekVsTrailingAvg(rawRows, { now });
  const strip = weekRingStrip(rawRows, { now });

  const nowMin = amsClockMinutes(now);
  const goalMet = dailySeconds != null && focusTotal >= dailySeconds;
  const dialEmpty = focusTotal === 0 && arcs.focus.length === 0 && arcs.rest.length === 0;

  // Centre = two lines: the big focus total (Fraunces) + one muted line "of 6h · 35m rest"
  // (goal, if set; rest, if any). No target yet → a quiet "set a target" in the goal's place.
  const centre = (
    <>
      <div className={"dial-total" + (goalMet ? " is-met" : "")}>{formatDuration(focusTotal)}</div>
      <div className="dial-sub">
        {dailySeconds != null ? (
          <span>of {formatDuration(dailySeconds)}</span>
        ) : (
          <button className="dial-settarget" onClick={onSetTarget}>set a target</button>
        )}
        {restTotal > 0 && <span className="dial-rest"> · {formatDuration(restTotal)} rest</span>}
      </div>
    </>
  );

  return (
    <>
      <div className="focus-ovw-body">
        <div className="focus-ovw-left">
          <div className="focus-ovw-dialwrap">
            {dialEmpty ? (
              <FocusDial focusArcs={[]} restArcs={[]} nowMin={nowMin} colorFor={colorFor}
                filterCat={null} onPickCategory={onPickCategory}>
                <div className="dial-invite">No focus yet today<br /><span>press Start a session</span></div>
              </FocusDial>
            ) : (
              <FocusDial focusArcs={arcs.focus} restArcs={arcs.rest} nowMin={nowMin} colorFor={colorFor}
                filterCat={filterCat} onPickCategory={onPickCategory}>
                {centre}
              </FocusDial>
            )}
          </div>
          <button className="focus-ovw-start" onClick={onStart}>▶ Start a session</button>
          <div className="focus-ovw-quicklinks">
            <button className="focus-linkbtn" onClick={onAddPast}>add past</button>
            <span aria-hidden="true">·</span>
            <button ref={targetsRef} className="focus-linkbtn" onClick={onSetTarget}>targets</button>
          </div>
        </div>

        <div className="focus-ovw-right">
          <FocusChart data={chartData} today={today} range={range} colorFor={colorFor} nameFor={nameFor} catRank={catRank}
            filterCat={filterCat} onPickCategory={onPickCategory} filterDay={filterDay} />
          <FocusRangeControls range={range} windowLabel={windowLabel} canForward={canForward}
            onStepBack={onStepBack} onStepFwd={onStepFwd} onRange={onRange} onExpand={onExpand} />
          <FocusLedger rows={rows} title={ledgerTitle} colorFor={colorFor} onPickCategory={onPickCategory}
            onSeeAll={onSeeAll} filterActive={filterCat != null} onClear={onClear} />
        </div>
      </div>

      <WeekRingStrip strip={strip} dailyGoalSeconds={dailySeconds} weeklyGoalSeconds={weeklySeconds} trend={trend}
        todayYmd={today} selectedDay={filterDay} onPickDay={onPickDay} onClearDay={onClearDay} />
    </>
  );
}
