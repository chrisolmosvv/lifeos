// LifeOS — Food → SHARED sizing controls (3i). ONE control used by BOTH the cook page and the import
// review, so the two can never drift apart: −  ·  Fit recipe to size  ·  +  and a SETTABLE percentage.
// Type a number and press Enter (or leave the field) → the page resizes; the hook clamps silently, so
// 400 becomes the max rather than an error, and an unparseable entry reverts to the current value.
// "Fit recipe to size" returns to AUTOMATIC — that button carries the auto/manual signal (it's
// highlighted while fit is deciding; the percentage turns solid ink once the owner has overridden it).

import { useEffect, useRef, useState } from "react";
import "../cookPlan.css"; // the .cpq-size-* styles (one global bundle; free where already imported)

export default function SizeControls({ pct, isManual, onDec, onInc, onFit, onSet }) {
  const [draft, setDraft] = useState(String(pct));
  const editing = useRef(false);
  // While auto-fit is settling, keep the field showing what it chose — but never yank the number out
  // from under the owner mid-type.
  useEffect(() => { if (!editing.current) setDraft(String(pct)); }, [pct]);

  const commit = () => {
    editing.current = false;
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) onSet(n); else setDraft(String(pct)); // gibberish → revert, no complaint
  };

  return (
    <div className="cpq-size">
      <button type="button" className="cpq-size-btn" onClick={onDec} aria-label="Smaller text">−</button>
      <button type="button" className={`cpq-size-fit${isManual ? "" : " is-auto"}`} onClick={onFit}>Fit recipe to size</button>
      <button type="button" className="cpq-size-btn" onClick={onInc} aria-label="Larger text">+</button>
      <span className="cpq-size-field">
        <input type="text" inputMode="numeric" aria-label="Text size percent"
          className={`cpq-size-pct tnum${isManual ? " is-manual" : ""}`} value={draft}
          onFocus={() => { editing.current = true; }}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { setDraft(String(pct)); e.currentTarget.blur(); } }} />
        <span className="cpq-size-sign">%</span>
      </span>
    </div>
  );
}
