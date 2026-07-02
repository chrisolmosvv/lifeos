// FocusRangeControls (overview redesign, piece 4) — the quiet single line UNDER the
// chart's day-letters: the rolling-window label with step-arrows (left), the
// Week·Month·90d mode toggle (right), and a small "expand" (far right) that opens the
// existing full-screen range view. It owns no state — the page holds the window; this
// just renders it and fires the handlers. Small / muted / hairline — not a toolbar.
//
// Props: range ('week'|'month'|'ninety'), windowLabel ("30 Jun – 6 Jul"), canForward
//   (bool — false at the current window), onStepBack, onStepFwd, onRange(id), onExpand.
const MODES = [
  { id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "ninety", label: "90d" },
];

export default function FocusRangeControls({ range, windowLabel, canForward, onStepBack, onStepFwd, onRange, onExpand }) {
  return (
    <div className="focus-rangebar">
      <div className="focus-rangebar-window">
        <button type="button" className="focus-rangebar-arrow" onClick={onStepBack} aria-label="Earlier window">‹</button>
        <span className="focus-rangebar-label">{windowLabel}</span>
        <button type="button" className="focus-rangebar-arrow" onClick={onStepFwd} disabled={!canForward} aria-label="Later window">›</button>
      </div>

      <div className="focus-rangebar-modes" role="tablist" aria-label="Chart range">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={m.id === range}
            className={"focus-rangebar-mode" + (m.id === range ? " is-active" : "")}
            onClick={() => onRange(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <button type="button" className="focus-rangebar-expand" onClick={onExpand}>expand</button>
    </div>
  );
}
