// LifeOS — Food → cook plan MASTHEAD (3d · 3h). One tight strip: back · title · Ingredients ·
// then a hairline-divided metric row: total planned (or elapsed once cooking) · ON THE TABLE · servings.
// ON THE TABLE (3h): with NO target it shows the live PROJECTION ("if you start now" → moves as things
// drift), muted, with a "tap to set a target" hint. With a target set it shows that target in terracotta,
// the on-time / late / early drift beneath, and a "clear" — a projection and a target never look alike.

import { useState } from "react";

export default function CookMasthead({
  title, cuisine, metricLabel, metricValue,
  projVal, targetVal, onSetTarget, onClearTarget, serveDrift, serveState,
  servings, baseServ, onDec, onInc, onBack, onIngredients, onEdit,
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="cpq-mast">
      <div className="cpq-mast-top">
        <button type="button" className="cpq-back" onClick={onBack}>‹ Cookbook</button>
        <h1 className="cpq-title">{title}{cuisine ? <span className="cpq-cuisine"> · {cuisine}</span> : null}</h1>
        {onEdit && <button type="button" className="cpq-ings-btn" onClick={onEdit}>Edit</button>}
        <button type="button" className="cpq-ings-btn" onClick={onIngredients}>Ingredients</button>
      </div>

      <div className="cpq-metrics">
        <div className="cpq-metric">
          <span className="cpq-metric-val tnum">{metricValue}</span>
          <span className="cpq-metric-lbl">{metricLabel}</span>
        </div>
        <div className="cpq-metric cpq-metric--serve">
          <label className="cpq-metric-lbl cpq-serve-lbl">On the table</label>
          {editing ? (
            <input type="time" className="cpq-serve-in tnum" autoFocus defaultValue={targetVal || projVal}
              onChange={(e) => e.target.value && onSetTarget(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }} />
          ) : (
            <button type="button" className={`cpq-serve-time tnum ${targetVal ? "is-target" : "is-proj"}`} onClick={() => setEditing(true)}>
              {targetVal || projVal || "—"}
            </button>
          )}
          {targetVal ? (
            <span className="cpq-serve-sub">
              {serveDrift && <span className={`cpq-serve-drift cpq-serve-drift--${serveState}`}>{serveDrift}</span>}
              <button type="button" className="cpq-serve-clear" onClick={() => { onClearTarget(); setEditing(false); }}>clear</button>
            </span>
          ) : (
            <span className="cpq-serve-sub cpq-serve-proj-lbl">projected · tap to set a target</span>
          )}
        </div>
        <div className="cpq-metric cpq-metric--serv">
          <div className="cpq-serv-row">
            <button type="button" className="cpq-serv-btn" onClick={onDec} aria-label="Fewer servings">−</button>
            <span className="cpq-serv-val tnum">{servings}</span>
            <button type="button" className="cpq-serv-btn" onClick={onInc} aria-label="More servings">+</button>
          </div>
          <span className="cpq-metric-lbl">serving{servings === 1 ? "" : "s"}{servings !== baseServ ? ` · from ${baseServ}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
