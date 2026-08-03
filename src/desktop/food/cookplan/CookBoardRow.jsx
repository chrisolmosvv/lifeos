// LifeOS — Food → cook plan BOARD ROW (3d, mock Q). Columns: a filled station-colour block with the
// step number · the full step text with ingredient chips + a status line beneath · START BY (a
// Fraunces clock time with a small-caps label) · TAKES (the duration + the start/stop/reopen control,
// with −/+ estimate nudges on hover for a waiting step). Nothing here reacts to the tick except the
// running state; the countdown itself lives in the On-now card.

import { STATION, fmtDur } from "../../../spine/logic/cookPlanView";

export default function CookBoardRow({
  n, step, linked, liveState, timer, deadline, deadlineLabel, blocked, critical, floatMin,
  onStart, onStop, onResume, onAdjustEst, usedSet, onTick,
}) {
  const st = STATION[step?.station];
  const dur = fmtDur(step?.timer_seconds);
  const hasDur = step?.timer_seconds > 0;
  const started = !!timer;
  const running = timer?.running;

  const subline = blocked
    ? <span className="cpq-row-sub">waiting on {blocked.nums.map((x) => String(x).padStart(2, "0")).join(" · ")} · frees up {blocked.freesUp}</span>
    : liveState === "waiting"
      ? (critical ? <span className="cpq-row-sub cpq-sub-clock">sets the clock</span>
                  : <span className="cpq-row-sub">nothing in your way{floatMin > 0 ? ` · ${floatMin}m of room` : ""}</span>)
      : null;

  return (
    <li className={`cpq-row is-${liveState}`}>
      <div className="cpq-row-block" style={{ background: st ? st.color : "#8A857E" }}>
        <span className="tnum">{n}</span>
      </div>

      <div className="cpq-row-body">
        <p className="cpq-row-text">{step?.text}</p>
        {linked && linked.length > 0 && (
          <div className="cpq-row-chips">
            {linked.map(({ ing, idx }) => (
              <button key={idx} type="button" className={`cpq-chip${usedSet?.has(String(idx)) ? " is-used" : ""}`} onClick={() => onTick(idx)}>{ing.raw_text}</button>
            ))}
          </div>
        )}
        {subline}
      </div>

      <div className="cpq-row-startby">
        {!started ? (
          <>
            <span className="cpq-startby-time">{deadline}</span>
            <span className="cpq-startby-lbl">{deadlineLabel}</span>
          </>
        ) : running ? <span className="cpq-startby-lbl">running</span> : <span className="cpq-startby-lbl">done</span>}
      </div>

      <div className="cpq-row-takes">
        <span className="cpq-takes-dur tnum">{dur || "—"}</span>
        {hasDur && !started && (
          <span className="cpq-takes-ctl">
            <button type="button" className="cpq-nudge" onClick={() => onAdjustEst(-60)} aria-label="Less">−</button>
            <button type="button" className="cpq-nudge" onClick={() => onAdjustEst(60)} aria-label="More">+</button>
            <button type="button" className="cpq-go" onClick={onStart}>Start</button>
          </span>
        )}
        {running && <button type="button" className="cpq-go" onClick={onStop}>Stop</button>}
        {started && !running && <button type="button" className="cpq-go cpq-reopen" onClick={onResume}>Reopen</button>}
      </div>
    </li>
  );
}
