// CookTimer — the big countdown display for the hero step.
// Static for step 1 (no real clock). The ± buttons are present but inert.

function fmtBig(secs) {
  if (secs == null || secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CookTimer({ remaining, onAdjust }) {
  if (remaining == null) return null;

  return (
    <div className="cc-timer">
      <div className="cc-timer-display tnum">{fmtBig(remaining)}</div>
      <div className="cc-timer-adjust">
        <button type="button" className="cc-timer-btn" onClick={() => onAdjust?.(-60)}>
          −1 min
        </button>
        <button type="button" className="cc-timer-btn" onClick={() => onAdjust?.(60)}>
          +1 min
        </button>
      </div>
    </div>
  );
}
