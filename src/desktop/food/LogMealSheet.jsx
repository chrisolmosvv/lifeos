import { useState } from "react";
import { MEAL_SLOTS } from "../../spine/logic/foodCalc";
import { fmtNum } from "../../spine/logic/foodFormat";
import "./logMealSheet.css";

// LogMealSheet (V2 P8) — the ONE cook→log staging sheet: a calm card that rises from the bottom over a
// DIMMED page (no shadow — it lifts via the backdrop + a hairline top edge). SERVINGS LEADS (a large
// tactile stepper — the one real decision); the SLOT is a quiet changeable line beneath (tap-to-cycle
// in meal order, pre-picked to time-of-day). A rolling kcal·P/C/F Fraunces line is the only motion
// (reads perServing — recipeMacros.perServing, NEVER forked). Confirm NAMES its destination; no cancel
// (tap-outside dismisses). PRESENTATION ONLY — it calls onLog(servings, slot); the caller freezes the
// snapshot + writes (logSnapshot / fw.addEntry). Three entry points share this one sheet via props.
//
// Props: perServing {7}, unestimatedCount, defaultServings, defaultSlot, cookedEyebrow, onLog, onClose.
const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

export default function LogMealSheet({ perServing, unestimatedCount = 0, defaultServings = 1, defaultSlot, cookedEyebrow = false, onLog, onClose }) {
  const [servings, setServings] = useState(defaultServings || 1);
  const [slot, setSlot] = useState(defaultSlot || "snacks");
  const at = (k) => (perServing?.[k] || 0) * servings;
  const cycleSlot = () => setSlot((s) => MEAL_SLOTS[(MEAL_SLOTS.indexOf(s) + 1) % MEAL_SLOTS.length]);

  return (
    <div className="lms-backdrop" onMouseDown={onClose}>
      <div className="lms" role="dialog" aria-modal="true" aria-label="Log this meal" onMouseDown={(e) => e.stopPropagation()}>
        <span className="lms-grip" aria-hidden="true" />
        <span className="lms-eyebrow">{cookedEyebrow ? "Cooked — log it" : "Log this meal"}</span>

        <div className="lms-serv">
          <button type="button" className="lms-step" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer">−</button>
          <span className="lms-serv-n">{servings}</span>
          <button type="button" className="lms-step" onClick={() => setServings((s) => s + 1)} aria-label="More">+</button>
          <span className="lms-serv-label">serving{servings === 1 ? "" : "s"}</span>
        </div>

        <p className="lms-preview" key={servings}>
          {fmtNum("kcal", at("kcal"))} kcal · P{fmtNum("protein", at("protein"))} C{fmtNum("carbs", at("carbs"))} F{fmtNum("fat", at("fat"))}
        </p>
        {unestimatedCount > 0 && <p className="lms-approx">~ approximate — {unestimatedCount} unestimated</p>}

        <button type="button" className="lms-slot" onClick={cycleSlot}>to {SLOT_LABELS[slot]} ↻</button>
        <button type="button" className="lms-log" onClick={() => onLog(servings, slot)}>Log to {SLOT_LABELS[slot]}</button>
      </div>
    </div>
  );
}
