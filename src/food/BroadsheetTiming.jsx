// BroadsheetTiming (Piece 4) — real parallel timing lanes. Vertical timeline (top → down),
// proportional heights (fixed px-per-minute), lanes as side-by-side columns, shared time ruler,
// tag encoded as hairline weight. Convergence steps span full width. Scrolls internally when
// the timeline is taller than the column. Compute-on-read from cookSchedule + cookLanes.
import { useMemo } from "react";
import { cookSchedule } from "./cookSchedule";
import { assignLanes } from "./cookLanes";
import { parseDuration } from "./cookTimers";
import "./broadsheet.css";

const PX_PER_MIN = 14; // fixed scale: each minute = 14px of height
const MIN_BLOCK_H = 24; // floor for legibility on tiny steps

const fmtDur = (secs) => {
  if (secs == null || secs <= 0) return "";
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h${Math.round((secs % 3600) / 60)}m`;
  return `${Math.round(secs / 60)}m`;
};

const fmtTotal = (secs) => {
  if (!secs) return "";
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m`;
  return `${Math.round(secs / 60)} min`;
};

// Pick sparse ruler ticks that suit the total duration (e.g. every 5m, 10m, or 15m)
function rulerTicks(finish) {
  if (finish <= 0) return [];
  const totalMin = finish / 60;
  const interval = totalMin <= 15 ? 5 : totalMin <= 45 ? 10 : 15;
  const ticks = [];
  for (let m = 0; m <= totalMin; m += interval) ticks.push(m);
  return ticks;
}

const TAG_WEIGHT = { hands_free: "bs-wt-light", hands_on: "bs-wt-medium", active_heat: "bs-wt-heavy" };

export default function BroadsheetTiming({ steps }) {
  const { schedule, finish, lanes, laneCount, mergeSteps } = useMemo(() => {
    const input = (steps || []).map((s, i) => ({
      index: i,
      durationSeconds: s.timer_seconds ?? parseDuration(typeof s.text === "string" ? s.text : ""),
      deps: s.depends_on || undefined,
    }));
    const sched = cookSchedule(input);
    const { lanes, laneCount, mergeSteps } = assignLanes(steps);
    return { ...sched, lanes, laneCount, mergeSteps };
  }, [steps]);

  const ticks = rulerTicks(finish);
  const totalH = Math.max((finish / 60) * PX_PER_MIN, 100);

  // Convert seconds → px position/height with the min-height floor
  const toY = (sec) => (sec / 60) * PX_PER_MIN;
  const blockH = (dur) => Math.max(MIN_BLOCK_H, (dur / 60) * PX_PER_MIN);

  return (
    <div className="bs-col bs-col-timing">
      <div className="bs-col-head">
        <span className="bs-col-title">Timing</span>
        {finish > 0 && <span className="bs-timing-total tnum">{fmtTotal(finish)}</span>}
      </div>

      <div className="bs-lanes-frame" style={{ height: `${totalH}px` }}>
        {/* Shared time ruler */}
        <div className="bs-ruler">
          {ticks.map((m) => (
            <div key={m} className="bs-ruler-tick" style={{ top: `${toY(m * 60)}px` }}>
              <span className="bs-ruler-label tnum">{m}m</span>
            </div>
          ))}
        </div>

        {/* Lane columns */}
        <div className="bs-lanes" style={{ gridTemplateColumns: `repeat(${laneCount}, 1fr)` }}>
          {schedule.map((s) => {
            const step = steps[s.index];
            const tag = step?.tag || "hands_on";
            const wtClass = TAG_WEIGHT[tag] || "bs-wt-medium";
            const isMerge = mergeSteps.has(s.index);
            const label = (typeof step?.text === "string" ? step.text : "").slice(0, 20);
            const top = toY(s.startOffset);
            const h = blockH(s.duration);

            return (
              <div
                key={s.index}
                className={`bs-lane-block ${wtClass}${isMerge ? " bs-merge" : ""}`}
                style={{
                  top: `${top}px`,
                  height: `${h}px`,
                  gridColumn: isMerge ? `1 / -1` : `${lanes[s.index] + 1}`,
                  gridRow: "1",
                }}
              >
                <span className="bs-lane-num">{s.index + 1}</span>
                <span className="bs-lane-dur tnum">{fmtDur(s.duration)}</span>
                {h >= 36 && label && <span className="bs-lane-label">{label}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
