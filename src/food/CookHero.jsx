// CookHero — the big calm directive: one step, readable across a kitchen.
// Fraunces for the instruction, Inter for controls + metadata.
// Step 3: live timer support — big countdown for parked steps shown inline,
// "Start timer" button for active steps with a duration.

import CookTimer from "./CookTimer";

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };
const HEADSUP_THRESHOLD = 180; // 3 minutes

function fmtMSS(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function shortLabel(text) {
  return (text || "").split(/\s+/).slice(0, 5).join(" ");
}

export default function CookHero({ hero, parked, totalSteps, heroTimer, onMarkDone, onStartTimer, onAdjustTimer }) {
  if (!hero) return null;
  const { index, step } = hero;
  const tag = step.tag ? TAG_LABEL[step.tag] || step.tag : null;
  const hasDuration = step.timer_seconds > 0;

  // The single terracotta mark: the soonest parked item within threshold
  const urgent = parked
    .filter((p) => p.remaining != null && p.remaining > 0 && p.remaining <= HEADSUP_THRESHOLD)
    .sort((a, b) => a.remaining - b.remaining)[0];

  return (
    <div className="cc-hero">
      <div className="cc-hero-meta">
        <span className="cc-hero-num">{index + 1}</span>
        <span className="cc-hero-of">of {totalSteps}</span>
        {tag && <span className="cc-hero-tag">{tag}</span>}
      </div>

      <p className="cc-hero-text">{step.text}</p>

      {/* Live countdown when this step has a running timer */}
      {heroTimer && !heroTimer.done && (
        <CookTimer remaining={heroTimer.remaining} onAdjust={(d) => onAdjustTimer?.(index, d)} />
      )}

      {urgent && (
        <div className="cc-headsup">
          <span className="cc-headsup-dot">●</span>
          <span className="cc-headsup-label">
            {shortLabel(urgent.step.text)} needs you in {fmtMSS(urgent.remaining)}
          </span>
        </div>
      )}

      <div className="cc-hero-actions">
        {/* "Start timer" for active steps with a duration but no running timer */}
        {hasDuration && !heroTimer && (
          <button type="button" className="cc-start-timer" onClick={() => onStartTimer?.(index, step.timer_seconds)}>
            Start {fmtDur(step.timer_seconds)} timer
          </button>
        )}
        <button type="button" className="cc-done-btn" onClick={onMarkDone}>
          Mark done →
        </button>
      </div>
    </div>
  );
}
