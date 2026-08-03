// LifeOS — Food → cook plan BAND (3d, mock Q). The whole cook to scale in PACKED rows (overlapping
// work stacks; not fixed station lanes). Each step is a station-coloured block positioned by the
// resource-aware schedule, its number inside, a progress fill as its timer runs. Zero-float steps
// ("sets the clock") sit at full opacity; steps with float trail a dotted tail = their spare time.
// A terracotta now-line sweeps across once the cook has begun.

import { STATION } from "../../../spine/logic/cookPlanView";

// Greedy interval packing: each block drops into the first row whose last block already ended.
function pack(blocks) {
  const rows = []; // each: last end offset
  const placed = [];
  for (const b of blocks) {
    let r = rows.findIndex((end) => end <= b.start);
    if (r < 0) { r = rows.length; rows.push(0); }
    rows[r] = b.end + b.float; // reserve through the dotted tail too
    placed.push({ ...b, row: r });
  }
  return { placed, rowCount: Math.max(rows.length, 1) };
}

export default function CookBand({ steps, schedule, finish, timerByRef, cookStartMs, nowMs }) {
  if (!finish || finish <= 0) return null;
  const blocks = schedule
    .filter((s) => s.duration > 0)
    .map((s) => ({ index: s.index, start: s.earliestStart, end: s.earliestEnd, dur: s.duration, float: s.float, critical: s.critical, step: steps[s.index], timer: timerByRef[String(s.index)] }))
    .sort((a, b) => a.start - b.start);
  const { placed, rowCount } = pack(blocks);
  const nowPct = cookStartMs ? Math.max(0, Math.min(100, ((nowMs - cookStartMs) / (finish * 1000)) * 100)) : null;

  return (
    <div className="cpq-band" style={{ "--rows": rowCount }} aria-hidden="true">
      {placed.map((b) => {
        const st = STATION[b.step?.station];
        const color = st ? st.color : "#8A857E";
        const progress = b.timer && b.dur > 0 ? Math.max(0, Math.min(1, b.timer.elapsed / b.dur)) : 0;
        return (
          <div key={b.index} className={`cpq-block${b.critical ? " is-critical" : ""}`}
            style={{ top: `calc(${b.row} * (var(--blk) + 3px))`, left: `${(b.start / finish) * 100}%`, width: `${Math.max((b.dur / finish) * 100, 1.5)}%`, "--blk-color": color }}>
            <span className="cpq-block-fill" style={{ width: `${progress * 100}%` }} />
            <span className="cpq-block-num tnum">{b.index + 1}</span>
            {b.float > 0 && <span className="cpq-block-tail" style={{ width: `${(b.float / b.dur) * 100}%` }} />}
          </div>
        );
      })}
      {nowPct != null && <span className="cpq-nowline" style={{ left: `${nowPct}%` }} />}
    </div>
  );
}
