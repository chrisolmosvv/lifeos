// LifeOS — Food → cook plan ON NOW (3d → 3f). Every running step as its own WORKSTATION card, side
// by side: the large terracotta countdown (brick + counting up when overrun), the step's full text
// (so the cook never looks elsewhere), its ingredient chips (tap → the editor: change amount, mark
// left out, tick used — all recorded as proposal events), and its controls (−1m / +1m / Stop). When
// nothing runs: a calm "ready when you are" prompt of startable steps.

import { STATION, fmtRemaining } from "../../../spine/logic/cookPlanView";

export default function CookOnNow({ running, ready, onAdjust, onStop, onStart, usedSet, onEditChip }) {
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
              <span className={`cpq-card-clock tnum${timer.reachedZero ? " is-over" : ""}`}>{fmtRemaining(timer.remaining)}</span>
            </div>
            <p className="cpq-card-text">{step?.text}</p>
            {linked && linked.length > 0 && (
              <div className="cpq-card-chips">
                {linked.map(({ ing, idx }) => (
                  <button key={idx} type="button" className={`cpq-chip${usedSet?.has(String(idx)) ? " is-used" : ""}`} onClick={(e) => onEditChip(idx, e)}>{ing.raw_text}</button>
                ))}
              </div>
            )}
            <div className="cpq-card-adj">
              <button type="button" className="cpq-adj" onClick={() => onAdjust(index, -60)}>−1m</button>
              <button type="button" className="cpq-adj" onClick={() => onAdjust(index, 60)}>+1m</button>
              <button type="button" className="cpq-adj cpq-adj--stop" onClick={() => onStop(index)}>Stop</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
