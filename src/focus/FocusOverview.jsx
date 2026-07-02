import { amsClockMinutes } from "../gym/gymDates.js";
import { dayArcs, dayLedger, dayFocusTotal, dayRestTotal } from "./focusCalc.js";
import { weekRingStrip, weekVsTrailingAvg } from "./focusTrend.js";
import { formatDuration, trendLine } from "./focusFormat.js";
import FocusDial from "./FocusDial";
import FocusLedger from "./FocusLedger";
import WeekRingStrip from "./WeekRingStrip";

// FocusOverview (spec §6–§8/§L) — the Today face: the medium dial (left) + the
// height-filling ledger (right) over the full-width week ring-strip foot. Computes
// the piece-1 getters directly (they're pure + cheap) so the page stays lean. Strict
// zero-scroll: the parent caps the height; the ledger overflows to "see all".
//
// Props: rawRows, today (ymd), now (ms), colorFor(id), filterCat, onPickCategory,
//   onClear, onSeeAll, dailySeconds, weeklySeconds, onSetTarget.
export default function FocusOverview({
  rawRows, today, now, colorFor, filterCat, onPickCategory, onClear, onSeeAll,
  dailySeconds, weeklySeconds, onSetTarget,
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
        <div className="focus-ovw-dial">
          {focusTotal === 0 && arcs.focus.length === 0 && arcs.rest.length === 0 ? (
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

        <FocusLedger rows={rows} colorFor={colorFor} onPickCategory={onPickCategory}
          onSeeAll={onSeeAll} filterActive={filterCat != null} onClear={onClear} />
      </div>

      <WeekRingStrip strip={strip} dailyGoalSeconds={dailySeconds} weeklyGoalSeconds={weeklySeconds}
        weekTotalSeconds={trend.thisWeekSeconds} todayYmd={today} />
    </>
  );
}
