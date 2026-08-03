// LifeOS — Food → import review, one STEP (4b, mock U). The step editor is the point of this pass:
// full text always visible in a box that GROWS as you type (never clipped), the duration, the tag
// (load-bearing — it decides overlap), the station (colour only), a quiet hold-tolerance, a
// terse/original toggle, and the prep marker until approved. Editing the terse text is what saves.

import { useEffect, useRef } from "react";
import { STATION } from "../../../spine/logic/cookPlanView";

const TAGS = [["hands_on", "Hands-on"], ["hands_free", "Hands-free"], ["active_heat", "Active heat"]];
const STATIONS = ["bench", "hob", "oven", "rest"];
const HOLDS = [["immediate", "use at once"], ["short", "keeps a little"], ["indefinite", "keeps"]];

export default function StepRow({ n, step, showOrig, onText, onDur, onTag, onStation, onHold, onApprove, onToggleOrig, onDelete, edit = false }) {
  const ta = useRef(null);
  const grow = () => { const el = ta.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
  useEffect(grow, [step.text, showOrig]);
  const st = STATION[step.station];
  const min = Math.round((step.timer_seconds || 0) / 60);
  const unapproved = step.is_prep && !step.approved;

  return (
    <div className="iv-st">
      <div className="iv-sbar" style={{ background: st ? st.color : "var(--rule)" }} />
      <div className="iv-sno">{String(n).padStart(2, "0")}</div>
      <div className="iv-sbody">
        <textarea ref={ta} className="iv-stx" rows={1} value={showOrig ? (step.original || step.text) : step.text}
          onChange={(e) => { if (!showOrig) onText(e.target.value); }} onInput={grow} readOnly={showOrig} />
        <div className="iv-sub2">
          {step.is_prep && !edit && <button type="button" className={`iv-invent${step.approved ? " ok" : ""}`} onClick={onApprove}>{step.approved ? "✓ added prep step" : "added by the importer — approve"}</button>}
          {step.original && <button type="button" className="iv-restore" onClick={onToggleOrig}>{showOrig ? "use the terse version" : "show the original wording"}</button>}
        </div>
      </div>
      <div className="iv-sright">
        <div className="iv-dur"><input className="iv-tmin" value={min} onChange={(e) => onDur(Math.max(1, parseInt(e.target.value) || 1))} /><span className="iv-tunit"> min</span></div>
        <select className="iv-tagsel" value={step.tag || "hands_on"} onChange={(e) => onTag(e.target.value)}>{TAGS.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select>
        <div className="iv-quiet">
          <select className="iv-stnsel" value={step.station || "bench"} onChange={(e) => onStation(e.target.value)}>{STATIONS.map((s) => <option key={s} value={s}>{STATION[s].label}</option>)}</select>
          <select className="iv-holdsel" value={step.hold_tolerance || "short"} onChange={(e) => onHold(e.target.value)}>{HOLDS.map((h) => <option key={h[0]} value={h[0]}>{h[1]}</option>)}</select>
        </div>
      </div>
      <button type="button" className={`iv-del${unapproved ? " iv-del--inv" : ""}`} onClick={onDelete} aria-label="Delete step">×</button>
    </div>
  );
}
