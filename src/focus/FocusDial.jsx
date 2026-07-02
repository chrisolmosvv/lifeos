import { useEffect, useState } from "react";

// FocusDial (spec §6/§L) — a 24-hour ring: saved FOCUS sessions as category-colour
// arcs, REST as ghost/hatched arcs, a faint now-tick, and (when a daily goal is set)
// a thin inner progress ring that turns terracotta when met. Arcs sweep in clockwise
// on mount (pen-stroke, staggered; reduced-motion → instant). Tapping an arc filters
// by its category (the parent dims the others). The centre content is passed in.
//
// Props: focusArcs/restArcs [{id,categoryId,startMin,endMin}], nowMin, colorFor(id),
//   filterCat, onPickCategory(id), goalFraction (0..1|null), goalMet, children.
const CX = 100, CY = 100, R = 84, RP = 66;
const MIN = 1440;

const polar = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
function arcPath(r, a0, a1) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = (a1 - a0) % 360 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
const toDeg = (min) => (min / MIN) * 360;

export default function FocusDial({ focusArcs, restArcs, nowMin, colorFor, filterCat, onPickCategory, goalFraction, goalMet, children }) {
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const arcs = [...restArcs.map((a) => ({ ...a, rest: true })), ...focusArcs.map((a) => ({ ...a, rest: false }))];
  const empty = arcs.length === 0;
  const nowDeg = nowMin != null ? toDeg(nowMin) : null;
  const [ntx, nty] = nowDeg != null ? polar(R + 8, nowDeg) : [0, 0];
  const [nix, niy] = nowDeg != null ? polar(R - 8, nowDeg) : [0, 0];

  return (
    <svg className="focus-dial" viewBox="0 0 200 200" role="img" aria-label="Today's focus by hour">
      {/* faint full-day track */}
      <circle cx={CX} cy={CY} r={R} className="dial-track" fill="none" />

      {/* goal progress ring (only with a daily goal) */}
      {goalFraction != null && (
        <>
          <circle cx={CX} cy={CY} r={RP} className="dial-goal-track" fill="none" />
          {goalFraction > 0 && (
            <path d={arcPath(RP, 0, Math.max(0.5, Math.min(1, goalFraction) * 359.9))} fill="none"
              className={"dial-goal" + (goalMet ? " is-met" : "")} />
          )}
          {/* the goal tick at the top (100% mark) */}
          <line x1={CX} y1={CY - RP - 5} x2={CX} y2={CY - RP + 5} className={"dial-goal-tick" + (goalMet ? " is-met" : "")} />
        </>
      )}

      {/* the session arcs */}
      {arcs.map((a, i) => {
        const dimmed = filterCat != null && a.categoryId !== filterCat;
        const hex = a.rest ? "var(--ink-muted)" : colorFor(a.categoryId);
        return (
          <path
            key={(a.rest ? "r" : "f") + a.id + i}
            d={arcPath(R, toDeg(a.startMin), toDeg(a.endMin))}
            fill="none"
            pathLength="100"
            className={"dial-arc" + (a.rest ? " is-rest" : "") + (dimmed ? " is-dim" : "") + (swept ? " is-in" : "")}
            style={{ stroke: hex, transitionDelay: `${Math.min(i * 60, 600)}ms` }}
            onClick={a.categoryId ? () => onPickCategory(a.categoryId) : undefined}
          />
        );
      })}

      {empty && <circle cx={CX} cy={CY} r={R} className="dial-empty" fill="none" />}

      {/* now-tick */}
      {nowDeg != null && <line x1={ntx} y1={nty} x2={nix} y2={niy} className="dial-now" />}

      {/* centre content (total / goal / trend / rest) */}
      <foreignObject x="30" y="58" width="140" height="84">
        <div className="dial-centre">{children}</div>
      </foreignObject>
    </svg>
  );
}
