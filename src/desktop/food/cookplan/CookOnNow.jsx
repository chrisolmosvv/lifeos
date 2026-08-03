// LifeOS — Food → cook plan ON NOW (3d, mock Q). Every running step as its own card, side by side:
// a large terracotta countdown (brick + counting up when overrun), its station + number, its
// ingredient chips, and −1m / +1m controls. When nothing runs: a calm "ready when you are" prompt
// naming the steps you can start now, each clickable.

import { STATION, fmtRemaining } from "../../../spine/logic/cookPlanView";

export default function CookOnNow({ running, ready, onAdjust, onStart, usedSet, onTick }) {
  if (running.length === 0) {
    return (
      <div className="cpq-onnow cpq-onnow--idle">
        <span className="cpq-idle-lead">Nothing on the go.</span>
        {ready.length > 0 ? (
          <span className="cpq-idle-ready">
            Ready when you are:{" "}
            {ready.map((r, k) => (
              <button key={r.index} type="button" className="cpq-ready-num tnum" onClick={() => onStart(r.index)}>
                {k > 0 ? " · " : ""}{String(r.index + 1).padStart(2, "0")}
              </button>
            ))}
          </span>
        ) : <span className="cpq-idle-ready">Start any step to begin.</span>}
      </div>
    );
  }

  return (
    <div className="cpq-onnow">
      {running.map(({ index, step, timer, linked }) => {
        const st = STATION[step?.station];
        return (
          <div key={index} className="cpq-card" style={{ "--blk-color": st ? st.color : "#8A857E" }}>
            <div className="cpq-card-head">
              <span className="cpq-card-num tnum">{String(index + 1).padStart(2, "0")}</span>
              {st && <span className="cpq-card-station" style={{ color: st.color }}>{st.label}</span>}
            </div>
            <div className={`cpq-card-clock tnum${timer.reachedZero ? " is-over" : ""}`}>{fmtRemaining(timer.remaining)}</div>
            {linked && linked.length > 0 && (
              <div className="cpq-card-chips">
                {linked.map(({ ing, idx }) => (
                  <button key={idx} type="button" className={`cpq-chip${usedSet?.has(String(idx)) ? " is-used" : ""}`} onClick={() => onTick(idx)}>{ing.raw_text}</button>
                ))}
              </div>
            )}
            <div className="cpq-card-adj">
              <button type="button" className="cpq-adj" onClick={() => onAdjust(index, -60)}>−1m</button>
              <button type="button" className="cpq-adj" onClick={() => onAdjust(index, 60)}>+1m</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
