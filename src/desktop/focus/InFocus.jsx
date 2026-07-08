import { elapsedClock } from "./focusFormat.js";
import SplitFlap from "./SplitFlap";

// In-focus (surface 3, spec §4/§L) — the split-flap over a slim progress line, the
// subject above, controls below. The mode reads two ways: the slim line LABELS the state
// AND the flap shifts register (break = muted, overtime = terracotta) via `live.register`.
// INTERVALS are hand-bounded: the flap counts up + HOLDS at the target with a muted
// "+over" beside it, and a terracotta "Enter break / End break" button (live.phase) lets
// the owner switch phase by hand — no auto-switch. Count-up/-down show no over/button.
//
// Props: live (from computeLive), subjectLabel, paused, onPause, onResume, onStop,
//        onSwitchPhase (intervals — close this phase, open the opposite kind).
export default function InFocus({ live, subjectLabel, paused, onPause, onResume, onStop, onSwitchPhase }) {
  if (!live) return null;
  const showBar = live.progress != null;
  const phaseLabel = live.phase === "break" ? "End break" : "Enter break";
  return (
    <div className={"focus-live focus-live--" + live.register}>
      <div className="focus-subject-line">{subjectLabel}</div>

      <div className="focus-flap-row">
        <SplitFlap seconds={live.display} register={live.register} />
        {live.over != null && <span className="focus-over tnum">· +{elapsedClock(live.over)}</span>}
      </div>

      <div className="focus-slim">
        <span className="focus-slim-label">{paused ? "Paused" : live.slim}</span>
        {showBar && (
          <span className="focus-progress" aria-hidden="true">
            <span className="focus-progress-fill" style={{ width: `${Math.round((live.progress || 0) * 100)}%` }} />
          </span>
        )}
      </div>

      <div className="focus-controls">
        {paused ? (
          <button className="focus-btn-ghost" onClick={onResume}>Resume</button>
        ) : (
          <button className="focus-btn-ghost" onClick={onPause}>Pause</button>
        )}
        {live.phase != null && !paused && (
          <button className="focus-btn-phase" onClick={onSwitchPhase}>{phaseLabel}</button>
        )}
        <button className="focus-btn-stop" onClick={onStop}>Stop</button>
      </div>
    </div>
  );
}
