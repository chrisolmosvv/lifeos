// LifeOS — Food → cook plan, one step ROW. Full method text (never clipped), planned duration,
// station colour, activity tag, a quiet prep marker, and the ingredients this step uses.
// 3b: LIVE — a per-step timer (start → live countdown → stop/resume), overrun counts UP past zero,
// and the row reflects the step's derived state (waiting / active / done). Position comes from the
// timer alone; there is no "mark done".

import { STATION, TAG_LABEL, fmtDur, fmtRemaining, scaledAmount } from "../../../spine/logic/cookPlanView";

export default function CookPlanStep({ n, step, linked, scale, timer, liveState, usedSet, critical, floatMin, deadline, urgency, blocked, onStart, onStop, onResume, onTick }) {
  const st = STATION[step?.station] || null;
  const tag = step?.tag ? TAG_LABEL[step.tag] || step.tag : null;
  const dur = fmtDur(step?.timer_seconds);
  const hasDur = step?.timer_seconds > 0;
  const started = !!timer;
  const stateClass = liveState === "active" ? " is-active" : liveState === "done" ? " is-done" : "";

  return (
    <li className={`cp-step${stateClass}`}>
      <div className="cp-step-head">
        <span className="cp-step-num tnum">{n}</span>
        {st && (
          <span className="cp-step-station">
            <span className="cp-station-dot" style={{ background: st.color }} aria-hidden="true" />
            <span style={{ color: st.color }}>{st.label}</span>
          </span>
        )}
        {tag && <span className="cp-step-tag">{tag}</span>}
        {step?.is_prep && <span className="cp-step-prep">prep</span>}
        {dur && <span className="cp-step-dur tnum">{dur}</span>}
      </div>

      <div className="cp-step-sched">
        {critical ? <span className="cp-clock-mark">sets the clock</span> : floatMin > 0 && <span className="cp-slack">{floatMin}m slack</span>}
        {deadline && <span className={`cp-deadline${urgency ? ` cp-deadline--${urgency}` : ""}`}>start by {deadline}</span>}
      </div>

      <p className="cp-step-text">{step?.text}</p>

      {blocked && (
        <p className="cp-blocked">waiting on {blocked.nums.join(", ")} · frees up {blocked.freesUp}</p>
      )}

      {hasDur && (
        <div className="cp-step-timer">
          {!started && (
            <button type="button" className="cp-timer-start" onClick={() => onStart?.()}>Start {dur} timer</button>
          )}
          {started && timer.running && (
            <>
              <span className={`cp-timer-live tnum${timer.reachedZero ? " is-over" : ""}`}>{fmtRemaining(timer.remaining)}</span>
              <button type="button" className="cp-timer-btn" onClick={() => onStop?.()}>Stop</button>
            </>
          )}
          {started && !timer.running && (
            <>
              <span className={`cp-timer-live is-paused tnum${timer.reachedZero ? " is-over" : ""}`}>{fmtRemaining(timer.remaining)}</span>
              <button type="button" className="cp-timer-btn" onClick={() => onResume?.()}>Resume</button>
            </>
          )}
        </div>
      )}

      {linked && linked.length > 0 && (
        <ul className="cp-step-ings">
          {linked.map(({ ing, idx }) => {
            const amt = scaledAmount(ing, scale);
            const used = usedSet?.has(String(idx));
            return (
              <li key={idx} className={`cp-step-ing${used ? " is-used" : ""}`}>
                <button type="button" className="cp-step-ing-btn" onClick={() => onTick?.(idx)}>
                  {amt && <span className="cp-step-ing-amt tnum">{amt.qty}{amt.unit ? ` ${amt.unit}` : ""}</span>}
                  <span className="cp-step-ing-text">{ing.raw_text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
