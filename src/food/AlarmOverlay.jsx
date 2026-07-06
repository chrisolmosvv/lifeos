// AlarmOverlay — the dismiss-required alarm when a timer reaches zero.
// Static look for step 1 (no audio, no auto-fire). The real Web Audio loop is step 3.

export default function AlarmOverlay({ stepLabel, onDismiss }) {
  if (!stepLabel) return null;

  return (
    <div className="cc-alarm">
      <div className="cc-alarm-inner">
        <div className="cc-alarm-ring">Timer done</div>
        <p className="cc-alarm-label">{stepLabel}</p>
        <button type="button" className="cc-alarm-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
