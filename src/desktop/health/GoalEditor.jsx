import { useState } from "react";
import { metaFor, fmtFull } from "../../spine/logic/bodyFormat";
import "../kit/goalEditor.css";

// GoalEditor — the body of the goal popover. PIECE 2 handles the VALUE goals
// (weight / body_fat): a number field + ± steppers, inline validation with Save
// disabled until valid, and a confirm-on-clear step. The sleep duration+bedtime
// editor is added in piece 3. Direction is INFERRED from the current reading vs the
// target and handed back to the caller, which freezes it on the stored row.
//
// Props: metric, current (latest daily-average value, or null if no readings),
//   goal (the existing resolved goal or null), onSubmit({target_value,unit,direction}),
//   onClear(), onClose().

// Validate a value-target goal. Returns {valid, direction?, msg?, waiting?}.
//   blocks: empty / ≤0 / over max (fat ≤100) / target = current / already-met.
//   "already-met" can only occur via equality once direction is inferred from the
//   side, but we check it explicitly so the same rule serves any fixed-direction
//   metric later.
function validateValue(metric, raw, current, max) {
  if (raw === "" || raw == null) return { valid: false };
  const target = Number(raw);
  if (!Number.isFinite(target)) return { valid: false, msg: "Enter a number." };
  if (target <= 0) return { valid: false, msg: "Enter a number above 0." };
  if (max != null && target > max) return { valid: false, msg: `Must be ${max} or less.` };
  if (current != null) {
    if (target === current) return { valid: false, msg: "That's your current reading — pick a different target." };
    const direction = target < current ? "down" : "up";
    const met = direction === "down" ? current <= target : current >= target;
    if (met) return { valid: false, msg: "You've already reached that." };
    return { valid: true, direction };
  }
  return { valid: true, direction: "down", waiting: true }; // no readings → allow; bar waits
}

export default function GoalEditor({ metric, current, goal, onSubmit, onClear, onClose }) {
  const meta = metaFor(metric);
  const [val, setVal] = useState(goal?.target_value != null ? String(goal.target_value) : "");
  const [confirming, setConfirming] = useState(false);
  const step = 0.1; // weight 0.1 kg, body_fat 0.1 %
  const max = metric === "body_fat" ? 100 : null;
  const res = validateValue(metric, val, current, max);

  const bump = (d) => {
    const base = val !== "" && Number.isFinite(Number(val)) ? Number(val) : current ?? 0;
    setVal((Math.round((base + d) * 10) / 10).toString());
  };

  return (
    <div className="goal-editor">
      <div className="goal-row">
        <button type="button" className="goal-step" onClick={() => bump(-step)} aria-label="decrease">−</button>
        <input
          className="goal-num"
          type="number"
          inputMode="decimal"
          step={step}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
        <span className="goal-unit">{meta.unit}</span>
        <button type="button" className="goal-step" onClick={() => bump(step)} aria-label="increase">+</button>
      </div>

      {current != null && (
        <p className="goal-hint">
          now {fmtFull(metric, current)}
          {res.valid && res.direction ? ` · aiming ${res.direction}` : ""}
        </p>
      )}
      {res.waiting && <p className="goal-hint">no readings yet — the bar fills once data arrives.</p>}
      {!res.valid && res.msg && <p className="goal-error">{res.msg}</p>}

      {confirming ? (
        <div className="goal-confirm">
          <span className="goal-confirm-q">Clear this goal?</span>
          <button type="button" className="goal-btn goal-btn--ghost" onClick={() => setConfirming(false)}>Keep</button>
          <button type="button" className="goal-btn goal-btn--danger" onClick={onClear}>Clear</button>
        </div>
      ) : (
        <div className="goal-actions">
          {goal && (
            <button type="button" className="goal-btn goal-btn--ghost goal-clear" onClick={() => setConfirming(true)}>
              Clear
            </button>
          )}
          <span className="goal-spacer" />
          <button type="button" className="goal-btn goal-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="goal-btn goal-btn--primary"
            disabled={!res.valid}
            onClick={() => onSubmit({ target_value: Number(val), unit: meta.unit, direction: res.direction })}
          >
            {goal ? "Update" : "Set goal"}
          </button>
        </div>
      )}
    </div>
  );
}
