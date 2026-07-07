// CookHero — the big calm directive: one step, readable across a kitchen.
// Fraunces for the instruction, Inter for controls + metadata.
// Step 7 P3: per-step ingredient trim (linked only) + "All ingredients" toggle.

import { useState } from "react";
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

export default function CookHero({ hero, parked, totalSteps, heroTimer, ingredients, tickedSet, onMarkDone, onStartTimer, onAdjustTimer, onTickIngredient }) {
  const [showAll, setShowAll] = useState(false);
  if (!hero) return null;
  const { index, step } = hero;
  const tag = step.tag ? TAG_LABEL[step.tag] || step.tag : null;
  const hasDuration = step.timer_seconds > 0;

  // The single terracotta mark: the soonest parked item within threshold
  const urgent = parked
    .filter((p) => p.remaining != null && p.remaining > 0 && p.remaining <= HEADSUP_THRESHOLD)
    .sort((a, b) => a.remaining - b.remaining)[0];

  // Per-step trim: linked ingredients for THIS step only (step_position === index).
  // Fallback: if no linked ingredients exist (bare/unenriched recipe, or all are general),
  // show the full list — a bare recipe behaves exactly as before, never a blank.
  const all = ingredients ? ingredients.map((ing, i) => ({ ing, idx: i })) : [];
  const linked = all.filter(({ ing }) => ing.step_position === index);
  const hasLinks = all.some(({ ing }) => ing.step_position != null);
  const trimmed = linked.length > 0;
  const visibleIngs = (!hasLinks || showAll) ? all : trimmed ? linked : all;
  const showIngs = visibleIngs.length > 0;

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

      {/* Ingredient tags — tappable to mark used; trimmed to this step's linked ingredients */}
      {showIngs && (
        <div className="cc-hero-ings">
          {visibleIngs.map(({ ing, idx }) => {
            const used = tickedSet?.has(String(idx));
            return (
              <button key={idx} type="button"
                className={`cc-hero-ing${used ? " is-used" : ""}`}
                onClick={() => onTickIngredient?.(idx)}>
                {ing.raw_text}
              </button>
            );
          })}
          {trimmed && hasLinks && (
            <button type="button" className="cc-hero-ing cc-hero-ing--toggle"
              onClick={() => setShowAll((v) => !v)}>
              {showAll ? "This step" : "All ingredients"}
            </button>
          )}
        </div>
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
