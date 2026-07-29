import { useMemo } from "react";
import { consistencyGrid } from "../../spine/logic/gymConsistency";
import { routineWorkouts } from "../../spine/logic/gymRoutine";
import { sessionDayMap, monthGrid, rangeGrid, monthsInWindow, heroInfo, TODAY_WINDOW_DAYS } from "../../spine/logic/gymCalendar";
import { amsTodayYMD, shiftYMD } from "../../spine/logic/gymDates";
import GymMonth from "./GymMonth";

// LifeOS — Gym V2 (Piece 10): the Consistency hero — real CALENDAR months. AT TODAY a single
// current-month grid; at 3/6/12 months a tiled row of mini-months (each with a session-count
// badge). SCOPED to Training's selected routine (lifted to Health.jsx): "All" = binary (any
// training day terracotta); a specific routine = THREE-STATE cells (selected routine = full
// terracotta, a different routine = light tint, none = grey). The hero number + caption reframe
// per window/routine (gymCalendar.heroInfo). The STREAK stays WEEKLY (unchanged unit — reuses
// consistencyGrid on routine-filtered workouts), just scoped when a routine is selected.

// Piece 14: Consistency has a stable 300px width, so tiles are 1fr (fill the column width) and the
// grid spreads vertically to fill the height.
// Follow-up: column count = ceil(√N) rather than a fixed per-window map. This keeps 6mo→3 and 1yr→4
// (unchanged: √6→3, √12→4) but drops 3mo to 2 columns — so 3 tiles lay out 2-over-1 instead of a
// single squashed row, giving each mini-month ~1.5× the width (and a second row to fill the height).
const tileCols = (n) => Math.max(1, Math.ceil(Math.sqrt(n)));

export default function GymConsistency({ built, win = "today", routine = "all" }) {
  const today = amsTodayYMD();
  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const g = useMemo(() => consistencyGrid(wk, { weeks: 13 }), [wk]); // weekly streak + avg (scoped)
  const dayMap = useMemo(() => sessionDayMap(built || []), [built]);
  const hero = useMemo(() => heroInfo(dayMap, routine, win), [dayMap, routine, win]);
  const months = useMemo(() => {
    // Today = a single ROLLING 30-day range grid (Piece 17); 3/6/12mo = the tiled calendar months.
    if (win === "today") {
      const start = shiftYMD(today, -(TODAY_WINDOW_DAYS - 1));
      return [rangeGrid(dayMap, { start, end: today, selectedRoutine: routine, today })];
    }
    return monthsInWindow(win).map((mm) => monthGrid(dayMap, { ...mm, selectedRoutine: routine, today }));
  }, [dayMap, win, routine, today]);

  const tiled = win !== "today";

  return (
    <section className="gym-zone gym-consist">
      <span className="gym-kicker">Consistency</span>
      <div className="gym-consist-hero">
        <b className="gym-consist-num">{hero.number}</b>
        <div className="gym-consist-herometa">
          <span className="gym-consist-cap">{hero.caption}</span>
          {win === "today" && <span className="gym-consist-avg">avg {g.average.toFixed(1)}/week · 13 weeks</span>}
          {g.streak > 0 && (
            <span className="gym-streak"><i className="gym-streak-dot" aria-hidden="true" />{g.streak}-week streak</span>
          )}
        </div>
      </div>

      {tiled ? (
        <div className="gym-cal-tiles" style={{ gridTemplateColumns: `repeat(${tileCols(months.length)}, 1fr)` }}>
          {months.map((m) => <GymMonth key={`${m.year}-${m.month}`} month={m} tile showBadge />)}
        </div>
      ) : (
        <div className="gym-cal-single"><GymMonth month={months[0]} /></div>
      )}
    </section>
  );
}
