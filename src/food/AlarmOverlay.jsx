import { useEffect } from "react";
import { startAlarm, stopAlarm } from "./cookAlarm";

// AlarmOverlay — the dismiss-required alarm when a timer reaches zero.
// Fires a looping two-tone Web Audio beep until dismissed. Actions:
// +2 min (extend and close), Dismiss (stop), +5 min (extend and close).
// Escape key also dismisses.

export default function AlarmOverlay({ stepLabel, onDismiss, onExtend }) {
  // Start/stop the audio loop when the overlay appears/disappears
  useEffect(() => {
    if (!stepLabel) return;
    startAlarm();
    return () => stopAlarm();
  }, [stepLabel]);

  // Escape key dismisses
  useEffect(() => {
    if (!stepLabel) return;
    const handler = (e) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stepLabel, onDismiss]);

  if (!stepLabel) return null;

  return (
    <div className="cc-alarm">
      <div className="cc-alarm-inner">
        <div className="cc-alarm-ring">Timer done</div>
        <p className="cc-alarm-label">{stepLabel}</p>
        <div className="cc-alarm-actions">
          <button type="button" className="cc-alarm-ext" onClick={() => onExtend?.(120)}>
            + 2 min
          </button>
          <button type="button" className="cc-alarm-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className="cc-alarm-ext" onClick={() => onExtend?.(300)}>
            + 5 min
          </button>
        </div>
      </div>
    </div>
  );
}
