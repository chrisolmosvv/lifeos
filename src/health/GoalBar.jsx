import { metaFor, fmtFull, fmtDelta } from "./bodyFormat";

// GoalBar / GoalPrompt — the shared progress-bar + "set a goal" prompt for the Body
// page, extracted from BodyComposition so weight AND body_fat render the SAME bar
// (S9). Pure presentation: it draws goalProgress() output; the goal MARKER is the one
// terracotta touch (a target cue), the bar/prompt are tappable to open the editor
// (hover = terracotta affordance — both sanctioned uses).

// A goal exists + has readings → the filled bar. (The markup is byte-identical to the
// S7 weight bar so the verified bar doesn't regress; it's just parametrised by metric.)
export function GoalBar({ metric, goalProg, onEdit }) {
  return (
    <button type="button" className="body-goal body-goal--btn" onClick={(e) => onEdit?.(e.currentTarget)}>
      <span className="body-tile-label">{metaFor(metric).label} goal</span>
      <div className="body-goal-track">
        <span className="body-goal-fill" style={{ width: `${(goalProg.fraction * 100).toFixed(1)}%` }} />
        <span className="body-goal-marker" title={`goal ${fmtFull(metric, goalProg.target)}`} />
      </div>
      <span className="body-goal-caption">
        {goalProg.met
          ? `goal met (${fmtFull(metric, goalProg.target)})`
          : `${fmtDelta(metric, goalProg.remaining)} to goal ${fmtFull(metric, goalProg.target)}`}
      </span>
    </button>
  );
}

// A goal exists but no readings yet → a calm "waiting" line (still tappable to edit).
export function GoalWaiting({ metric, onEdit }) {
  return (
    <button type="button" className="body-goalprompt body-goalprompt--btn" onClick={(e) => onEdit?.(e.currentTarget)}>
      {metaFor(metric).label} goal set — waiting for data.
    </button>
  );
}

// No goal → the prompt to set one.
export function GoalPrompt({ text, onEdit }) {
  return (
    <button type="button" className="body-goalprompt body-goalprompt--btn" onClick={(e) => onEdit?.(e.currentTarget)}>
      {text}
    </button>
  );
}
