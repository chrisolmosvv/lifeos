import { useState } from "react";
import { clockTime, hm } from "../health/healthFormat";

// Hypnogram — the hero's stage graph. Two modes:
//   GRAPH (blocks present): a time-axis graph, each segment a coloured block placed
//     by clock time. An understated goal marker sits at (first segment + goal mins) —
//     an approximate "where the goal length lands" reference; if the night fell short
//     the blocks stop before it, if it ran long the marker sits inside.
//   BAND (no segments — older rows): a single proportion bar from the stage totals.
// Interactive: hover/tap/focus a piece → the detail line shows stage, time, duration.
// Pure presentation; all numbers come from S5 / the parsed segments.
export default function Hypnogram({ blocks, band, inBedAt, wokeAt, goalMinutes }) {
  const [active, setActive] = useState(null);
  const hasGraph = Array.isArray(blocks) && blocks.length > 0;

  if (!hasGraph) {
    const segs = band || [];
    if (segs.length === 0) return <p className="hyp-empty">No stage breakdown for this night.</p>;
    return (
      <div className="hyp">
        <div className="hyp-band" role="img" aria-label="Sleep stage proportions">
          {segs.map((s, i) => (
            <button
              key={s.stage}
              type="button"
              className={`hyp-seg hyp-${s.cls} ${active === i ? "is-active" : ""}`}
              style={{ width: `${s.pct}%` }}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`${s.label} ${s.min} minutes`}
            />
          ))}
        </div>
        <p className="hyp-note">Proportions only — this night has no minute-by-minute data.</p>
        <div className="hyp-detail">
          {active != null && segs[active] ? (
            <>
              <span className={`hyp-dot hyp-${segs[active].cls}`} />
              {segs[active].label} · {segs[active].min} min · {segs[active].pct}%
            </>
          ) : (
            <span className="hyp-detail-hint">Tap a band for detail</span>
          )}
        </div>
      </div>
    );
  }

  const axisStart = blocks[0].startMs;
  const lastEnd = blocks[blocks.length - 1].endMs;
  const goalMs = Number.isFinite(goalMinutes) && goalMinutes > 0 ? axisStart + goalMinutes * 60000 : null;
  const axisEnd = goalMs ? Math.max(lastEnd, goalMs) : lastEnd;
  const span = Math.max(1, axisEnd - axisStart);
  const pos = (ms) => ((ms - axisStart) / span) * 100;

  return (
    <div className="hyp">
      <div className="hyp-track" role="img" aria-label="Hypnogram">
        {blocks.map((b, i) => (
          <button
            key={i}
            type="button"
            className={`hyp-block hyp-${b.cls} ${active === i ? "is-active" : ""}`}
            style={{ left: `${pos(b.startMs)}%`, width: `${Math.max(0.5, pos(b.endMs) - pos(b.startMs))}%` }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${b.label} ${clockTime(b.startMs)} to ${clockTime(b.endMs)}`}
          />
        ))}
        {goalMs != null && (
          <span className="hyp-goal" style={{ left: `${pos(goalMs)}%` }}>
            <span className="hyp-goal-label">goal</span>
          </span>
        )}
      </div>
      <div className="hyp-axis">
        <span>{clockTime(inBedAt ?? blocks[0].startMs)}</span>
        <span>{clockTime(wokeAt ?? lastEnd)}</span>
      </div>
      <div className="hyp-detail">
        {active != null && blocks[active] ? (
          <>
            <span className={`hyp-dot hyp-${blocks[active].cls}`} />
            {blocks[active].label} · {clockTime(blocks[active].startMs)}–{clockTime(blocks[active].endMs)} · {hm(blocks[active].durMin)}
          </>
        ) : (
          <span className="hyp-detail-hint">Tap a segment for stage, time + duration</span>
        )}
      </div>
    </div>
  );
}
