import SplitFlap from "./SplitFlap";

// In-focus (surface 3, spec §4/§L) — the split-flap over a slim progress line, the
// subject above, pause/resume + stop below. The mode reads two ways: the slim line
// LABELS the state (Counting down / Break / Overtime…) AND the flap shifts register
// (break = muted, overtime = terracotta) via `live.register`. Controls are pause/
// resume + stop only — to change subject you stop and start fresh (§4).
//
// Props: live (from computeLive), subjectLabel, paused (bool), onPause, onResume, onStop.
export default function InFocus({ live, subjectLabel, paused, onPause, onResume, onStop }) {
  if (!live) return null;
  const showBar = live.progress != null;
  return (
    <div className={"focus-live focus-live--" + live.register}>
      <div className="focus-subject-line">{subjectLabel}</div>

      <SplitFlap seconds={live.display} register={live.register} />

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
        <button className="focus-btn-stop" onClick={onStop}>Stop</button>
      </div>
    </div>
  );
}
