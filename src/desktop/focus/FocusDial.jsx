import { useEffect, useState } from "react";

// FocusDial (spec §6/§L, redesign P2) — a 24-hour ring: saved FOCUS sessions as
// category-colour arcs, REST as ghost/hatched arcs, a faint now-tick, hairline hour
// ticks every 3h (the four cardinals labelled), and MIDNIGHT at the BOTTOM (noon at
// the top). Arcs sweep in clockwise on mount (pen-stroke, staggered; reduced-motion →
// instant). Tapping an arc filters by its category (the parent dims the others). The
// centre content is passed in. The old inner goal-progress ring was removed — the goal
// now lives only in the centre text.
//
// Props: focusArcs/restArcs [{id,categoryId,startMin,endMin}], nowMin, colorFor(id),
//   filterCat, onPickCategory(id), children.
const CX = 100, CY = 100, R = 84;
const MIN = 1440;

// The SINGLE clock→screen mapping. The +90 offset puts 0° (midnight) at the BOTTOM;
// noon at the top, 06:00 left, 18:00 right. EVERYTHING on the ring (arcs, now-tick,
// hour ticks) goes through this, so the whole dial rotates together — nothing is
// hand-placed by angle.
const polar = (r, deg) => {
  const a = ((deg + 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
function arcPath(r, a0, a1) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = (a1 - a0) % 360 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
const toDeg = (min) => (min / MIN) * 360;

// Hour ticks every 3h (eight); labels only for the four cardinals (00·06·12·18).
const TICK_DEG = [0, 45, 90, 135, 180, 225, 270, 315];
const CARDINALS = [
  { deg: 0, label: "00" }, { deg: 90, label: "06" },
  { deg: 180, label: "12" }, { deg: 270, label: "18" },
];

export default function FocusDial({ focusArcs, restArcs, nowMin, colorFor, filterCat, onPickCategory, children }) {
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
    <svg className="focus-dial" viewBox="-12 -12 224 224" role="img" aria-label="Today's focus by hour">
      {/* faint full-day track */}
      <circle cx={CX} cy={CY} r={R} className="dial-track" fill="none" />

      {/* hour ticks every 3h + the four cardinal labels (00 bottom · 06 left · 12 top · 18 right) */}
      {TICK_DEG.map((deg) => {
        const [ix, iy] = polar(R + 5, deg);
        const [ox, oy] = polar(R + 9, deg);
        return <line key={"t" + deg} x1={ix} y1={iy} x2={ox} y2={oy} className="dial-hour" />;
      })}
      {CARDINALS.map(({ deg, label }) => {
        const [lx, ly] = polar(R + 17, deg);
        return (
          <text key={label} x={lx} y={ly} className="dial-hourlbl" textAnchor="middle" dominantBaseline="central">
            {label}
          </text>
        );
      })}

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
