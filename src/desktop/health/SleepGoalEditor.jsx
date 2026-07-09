import { useState } from "react";
import { vsGoal } from "../../spine/logic/healthGoals";
import { clockFromMin } from "../../spine/logic/healthFormat";
import "../kit/goalEditor.css";

// SleepGoalEditor — the COMBINED sleep-goals popover (S9): sets sleep DURATION and
// BEDTIME together. Duration = "at least" (direction up); bedtime = "by" (by_time) —
// both implicit, never picked. Each has quick presets + a custom field. Save writes
// only the sections that changed; Clear (with confirm) clears BOTH. Bedtime is stored
// as minutes-after-midnight, Amsterdam (the locked by_time standard).
//
// Props: durationGoalMin, bedtimeGoalMin (existing targets or null), currentDurationMin,
//   currentBedtimeMin (recent averages or null, for the already-met guard),
//   onSubmit(list), onClearAll(), onClose().

const DUR_PRESETS = [420, 450, 480, 510]; // 7 / 7.5 / 8 / 8.5 h, in minutes
const BED_PRESETS = [1350, 1380, 1410]; //   22:30 / 23:00 / 23:30

const hoursLabel = (min) => `${+(min / 60).toFixed(2)}h`;
const toTimeInput = (min) =>
  min == null ? "" : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fromTimeInput = (v) => {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const met = (current, target, direction) =>
  current != null && vsGoal(current, { target_value: target, direction })?.met;

export default function SleepGoalEditor({
  durationGoalMin, bedtimeGoalMin, currentDurationMin, currentBedtimeMin, onSubmit, onClearAll, onClose,
}) {
  const [durMin, setDurMin] = useState(durationGoalMin ?? null);
  const [bedMin, setBedMin] = useState(bedtimeGoalMin ?? null);
  const [confirming, setConfirming] = useState(false);

  // Only a CHANGED section is validated — an unchanged already-met existing goal must
  // not block editing the other section.
  const durChanged = durMin != null && durMin !== durationGoalMin;
  const bedChanged = bedMin != null && bedMin !== bedtimeGoalMin;
  const durMet = durChanged && met(currentDurationMin, durMin, "up");
  const bedMet = bedChanged && met(currentBedtimeMin, bedMin, "by_time");
  const durBad = durChanged && (durMin <= 0 || durMin > 1440 || durMet);
  const bedBad = bedChanged && bedMet;

  const canSave = (durChanged || bedChanged) && !durBad && !bedBad;
  const hasAnyGoal = durationGoalMin != null || bedtimeGoalMin != null;

  function save() {
    const list = [];
    if (durChanged && !durBad)
      list.push({ goal_type: "sleep_duration", target_value: durMin, unit: "minutes", direction: "up" });
    if (bedChanged && !bedBad)
      list.push({ goal_type: "bedtime", target_value: bedMin, unit: "minutes", direction: "by_time" });
    onSubmit(list);
  }

  const customDurHours = durMin != null && !DUR_PRESETS.includes(durMin) ? +(durMin / 60).toFixed(2) : "";

  return (
    <div className="goal-editor">
      <p className="goal-section-label">Sleep at least</p>
      <div className="goal-chips">
        {DUR_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={durMin === p ? "goal-chip is-on" : "goal-chip"}
            onClick={() => setDurMin(p)}
          >
            {hoursLabel(p)}
          </button>
        ))}
        <input
          className="goal-chip-custom"
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0"
          placeholder="custom h"
          value={customDurHours}
          onChange={(e) => setDurMin(e.target.value === "" ? null : Math.round(Number(e.target.value) * 60))}
        />
      </div>
      {durBad && <p className="goal-error">{durMet ? "You already sleep that much on average." : "Enter a sensible length."}</p>}

      <p className="goal-section-label goal-section-label--gap">In bed by</p>
      <div className="goal-chips">
        {BED_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={bedMin === p ? "goal-chip is-on" : "goal-chip"}
            onClick={() => setBedMin(p)}
          >
            {clockFromMin(p)}
          </button>
        ))}
        <input
          className="goal-chip-custom"
          type="time"
          value={toTimeInput(BED_PRESETS.includes(bedMin) ? null : bedMin)}
          onChange={(e) => setBedMin(fromTimeInput(e.target.value))}
        />
      </div>
      {bedBad && <p className="goal-error">You're already in bed by then on average.</p>}

      {confirming ? (
        <div className="goal-confirm">
          <span className="goal-confirm-q">Clear sleep goals?</span>
          <button type="button" className="goal-btn goal-btn--ghost" onClick={() => setConfirming(false)}>Keep</button>
          <button type="button" className="goal-btn goal-btn--danger" onClick={onClearAll}>Clear</button>
        </div>
      ) : (
        <div className="goal-actions">
          {hasAnyGoal && (
            <button type="button" className="goal-btn goal-btn--ghost goal-clear" onClick={() => setConfirming(true)}>
              Clear
            </button>
          )}
          <span className="goal-spacer" />
          <button type="button" className="goal-btn goal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="goal-btn goal-btn--primary" disabled={!canSave} onClick={save}>
            {hasAnyGoal ? "Update" : "Set goals"}
          </button>
        </div>
      )}
    </div>
  );
}
