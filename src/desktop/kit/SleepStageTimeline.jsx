import { useState } from "react";
import { clockTime, hm } from "../../spine/logic/healthFormat";

// LifeOS — Sleep: the lane-per-stage timeline (V2 "Stage timeline" hero). One lane per
// stage (Awake / REM / Core / Deep, top→bottom), each block placed by clock time on a
// shared night axis, with faint vertical HOUR gridlines behind the lanes. Signature to
// Sleep; reuses parseSegments output ({ cls, startMs, endMs, durMin, label }).
//
// Lanes fill the height the parent gives them (flex). The readout line below is EMPTY
// at rest (the journey column already states in-bed/woke/duration); hovering/focusing a
// block shows "stage · clock range · duration", and mouse-out simply CLEARS it.

const LANES = [
  { cls: "awake", label: "Awake" },
  { cls: "rem", label: "REM" },
  { cls: "core", label: "Core" },
  { cls: "deep", label: "Deep" },
];
const HOUR = 3600000;

export default function SleepStageTimeline({ blocks }) {
  const [active, setActive] = useState(null); // the active block's id "cls:index"

  const axisStart = blocks[0].startMs;
  const axisEnd = blocks[blocks.length - 1].endMs;
  const span = Math.max(1, axisEnd - axisStart);
  const pos = (ms) => ((ms - axisStart) / span) * 100;

  // Faint vertical gridline at each whole clock hour inside the span.
  const gridlines = [];
  for (let h = Math.ceil(axisStart / HOUR) * HOUR; h < axisEnd; h += HOUR) {
    gridlines.push(pos(h));
  }

  const activeBlock = active ? blocks.find((b, i) => `${b.cls}:${i}` === active) ?? null : null;

  return (
    <div className="stl">
      <div className="stl-lanes" role="img" aria-label="Sleep stage timeline" onMouseLeave={() => setActive(null)}>
        <div className="stl-grid" aria-hidden="true">
          {gridlines.map((left, i) => (
            <span className="stl-gridline" key={i} style={{ left: `${left}%` }} />
          ))}
        </div>
        {LANES.map((lane) => (
          <div className="stl-lane" key={lane.cls}>
            <span className="stl-lane-label">{lane.label}</span>
            <div className="stl-lane-bar">
              {blocks.map((b, i) =>
                b.cls === lane.cls ? (
                  <button
                    key={i}
                    type="button"
                    className={`stl-block hyp-${b.cls} ${active === `${b.cls}:${i}` ? "is-active" : ""}`}
                    style={{ left: `${pos(b.startMs)}%`, width: `${Math.max(0.6, pos(b.endMs) - pos(b.startMs))}%` }}
                    onMouseEnter={() => setActive(`${b.cls}:${i}`)}
                    onFocus={() => setActive(`${b.cls}:${i}`)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(`${b.cls}:${i}`)}
                    aria-label={`${b.label} ${clockTime(b.startMs)} to ${clockTime(b.endMs)}`}
                  />
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="stl-caption hyp-detail">
        {activeBlock && (
          <>
            <span className={`hyp-dot hyp-${activeBlock.cls}`} />
            {activeBlock.label} · {clockTime(activeBlock.startMs)}–{clockTime(activeBlock.endMs)} · {hm(activeBlock.durMin)}
          </>
        )}
      </div>
    </div>
  );
}
