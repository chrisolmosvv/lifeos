import { amsClockMinutes } from "../gym/gymDates.js";
import { dayArcs, dayLedger, dayFocusTotal, dayRestTotal } from "./focusCalc.js";
import { weekRingStrip, weekVsTrailingAvg } from "./focusTrend.js";
import { formatDuration, trendLine } from "./focusFormat.js";
import FocusDial from "./FocusDial";
import FocusChart from "./FocusChart";
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
  rawRows, today, now, colorFor, filterCat, onPickCategory, onClear, onSeeAll,
  dailySeconds, weeklySeconds, onSetTarget, onStart, onAddPast, targetsRef,
}) {
  const arcs = dayArcs(rawRows, today);
  const allRows = dayLedger(rawRows, today);
  const rows = filterCat ? allRows.filter((r) => r.categoryId === filterCat) : allRows;
  const focusTotal = dayFocusTotal(rawRows, today);
  const restTotal = dayRestTotal(rawRows, today);
  const trend = weekVsTrailingAvg(rawRows, { now });
  const tl = trendLine(trend);
  const strip = weekRingStrip(rawRows, { now });

  const nowMin = amsClockMinutes(now);
  const goalFraction = dailySeconds ? focusTotal / dailySeconds : null;
  const goalMet = dailySeconds != null && focusTotal >= dailySeconds;
  const dialEmpty = focusTotal === 0 && arcs.focus.length === 0 && arcs.rest.length === 0;

  const centre = (
    <>
      <div className={"dial-total" + (goalMet ? " is-met" : "")}>{formatDuration(focusTotal)}</div>
      {dailySeconds != null ? (
        <div className="dial-goal-label">/ {formatDuration(dailySeconds)}</div>
      ) : (
        <button className="dial-settarget" onClick={onSetTarget}>set a target</button>
      )}
      <div className="dial-sub">
        {tl.delta ? tl.delta : tl.note}
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
                filterCat={null} onPickCategory={onPickCategory} goalFraction={goalFraction} goalMet={goalMet}>
                <div className="dial-invite">No focus yet today<br /><span>press Start a session</span></div>
              </FocusDial>
            ) : (
              <FocusDial focusArcs={arcs.focus} restArcs={arcs.rest} nowMin={nowMin} colorFor={colorFor}
                filterCat={filterCat} onPickCategory={onPickCategory} goalFraction={goalFraction} goalMet={goalMet}>
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
          <FocusChart rawRows={rawRows} today={today} now={now} colorFor={colorFor}
            filterCat={filterCat} onPickCategory={onPickCategory} />
          <FocusLedger rows={rows} colorFor={colorFor} onPickCategory={onPickCategory}
            onSeeAll={onSeeAll} filterActive={filterCat != null} onClear={onClear} />
        </div>
      </div>

      <WeekRingStrip strip={strip} dailyGoalSeconds={dailySeconds} weeklyGoalSeconds={weeklySeconds}
        weekTotalSeconds={trend.thisWeekSeconds} todayYmd={today} />
    </>
  );
}
