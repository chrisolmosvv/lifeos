import { useState } from "react";
import "../kit/goalEditor.css";

// FocusGoalsEditor (spec §8) — the daily + weekly focus targets, shown inside the
// shared Popover primitive and written through the existing goals log (health_goals,
// goal_type 'focus_daily'/'focus_weekly', direction 'up', unit 'seconds'). Mirrors
// SleepGoalEditor's shape (presets + custom hours, save only changed sections, clear
// both), reusing goalEditor.css. Targets are stored in SECONDS to match the calc layer.
//
// Props: dailySeconds, weeklySeconds (existing targets or null),
//   onSubmit(list), onClearAll(), onClose().
const DAY_PRESETS = [2, 4, 6, 8]; // hours
const WEEK_PRESETS = [10, 20, 30, 40];

const toH = (s) => (s == null ? null : +(s / 3600).toFixed(2));
const fromH = (h) => (h === "" || h == null ? null : Math.round(Number(h) * 3600));

export default function FocusGoalsEditor({ dailySeconds, weeklySeconds, onSubmit, onClearAll, onClose }) {
  const [day, setDay] = useState(toH(dailySeconds));
  const [week, setWeek] = useState(toH(weeklySeconds));
  const [confirming, setConfirming] = useState(false);

  const dayChanged = fromH(day) !== dailySeconds;
  const weekChanged = fromH(week) !== weeklySeconds;
  const dayBad = day != null && !(Number(day) > 0);
  const weekBad = week != null && !(Number(week) > 0);
  const canSave = (dayChanged || weekChanged) && !dayBad && !weekBad;
  const hasAny = dailySeconds != null || weeklySeconds != null;

  function save() {
    const list = [];
    if (dayChanged && day != null && !dayBad)
      list.push({ goal_type: "focus_daily", target_value: fromH(day), unit: "seconds", direction: "up" });
    if (weekChanged && week != null && !weekBad)
      list.push({ goal_type: "focus_weekly", target_value: fromH(week), unit: "seconds", direction: "up" });
    onSubmit(list);
  }

  const dayCustom = day != null && !DAY_PRESETS.includes(day) ? day : "";
  const weekCustom = week != null && !WEEK_PRESETS.includes(week) ? week : "";

  return (
    <div className="goal-editor">
      <p className="goal-section-label">Focus each day (at least)</p>
      <div className="goal-chips">
        {DAY_PRESETS.map((p) => (
          <button key={p} type="button" className={day === p ? "goal-chip is-on" : "goal-chip"} onClick={() => setDay(p)}>{p}h</button>
        ))}
        <input className="goal-chip-custom" type="number" inputMode="decimal" step="0.5" min="0" placeholder="custom h"
          value={dayCustom} onChange={(e) => setDay(e.target.value === "" ? null : Number(e.target.value))} />
      </div>
      {dayBad && <p className="goal-error">Enter a sensible number of hours.</p>}

      <p className="goal-section-label goal-section-label--gap">Focus each week (at least)</p>
      <div className="goal-chips">
        {WEEK_PRESETS.map((p) => (
          <button key={p} type="button" className={week === p ? "goal-chip is-on" : "goal-chip"} onClick={() => setWeek(p)}>{p}h</button>
        ))}
        <input className="goal-chip-custom" type="number" inputMode="decimal" step="1" min="0" placeholder="custom h"
          value={weekCustom} onChange={(e) => setWeek(e.target.value === "" ? null : Number(e.target.value))} />
      </div>
      {weekBad && <p className="goal-error">Enter a sensible number of hours.</p>}

      {confirming ? (
        <div className="goal-confirm">
          <span className="goal-confirm-q">Clear focus targets?</span>
          <button type="button" className="goal-btn goal-btn--ghost" onClick={() => setConfirming(false)}>Keep</button>
          <button type="button" className="goal-btn goal-btn--danger" onClick={onClearAll}>Clear</button>
        </div>
      ) : (
        <div className="goal-actions">
          {hasAny && (
            <button type="button" className="goal-btn goal-btn--ghost goal-clear" onClick={() => setConfirming(true)}>Clear</button>
          )}
          <span className="goal-spacer" />
          <button type="button" className="goal-btn goal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="goal-btn goal-btn--primary" disabled={!canSave} onClick={save}>
            {hasAny ? "Update" : "Set targets"}
          </button>
        </div>
      )}
    </div>
  );
}
