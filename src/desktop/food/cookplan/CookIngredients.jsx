// LifeOS — Food → cook plan INGREDIENTS panel (3a display · 3e in-cook editing). Collapsible list
// of every ingredient with its servings-scaled amount. During a cook (editable) each row also gets
// −/+ amount nudges and an "omit" toggle — recorded as events (amount_changed / ingredient_omitted)
// so they survive a reload and surface in the end-of-cook review. Editing operates on the recipe's
// BASE amount (what gets saved), not the scaled display.

import { useState } from "react";
import { scaledAmount } from "../../../spine/logic/cookPlanView";

export default function CookIngredients({ ingredients, scale, editable, omitted, amounts, onOmit, onAmount }) {
  const [open, setOpen] = useState(false);
  const list = ingredients || [];
  if (list.length === 0) return null;
  const ov = amounts || {};
  const isOmit = (i) => omitted?.has(String(i));

  return (
    <section className="cp-ings">
      <button type="button" className="cp-ings-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="cp-ings-caret" aria-hidden="true">{open ? "▾" : "▸"}</span>
        Ingredients
        <span className="cp-ings-count tnum">{list.length}</span>
      </button>
      {open && (
        <ul className="cp-ings-list">
          {list.map((ing, i) => {
            if (editable) {
              const amt = ov[String(i)]?.amount ?? ing.amount;
              const unit = ov[String(i)]?.unit ?? ing.unit;
              const step = unit === "g" ? 25 : 1;
              const nudge = (d) => onAmount?.(i, (Number(amt) || 0) + d * step, unit ?? null, ov[String(i)]?.grams ?? ing.grams ?? null);
              return (
                <li key={i} className={`cp-ings-item${isOmit(i) ? " is-omit" : ""}`}>
                  <span className="cp-ings-amt tnum">{amt != null ? `${amt}${unit ? ` ${unit}` : ""}` : "—"}</span>
                  <span className="cp-ings-text">{ing.raw_text}</span>
                  <span className="cp-ings-edit">
                    <button type="button" className="cp-nudge" onClick={() => nudge(-1)} disabled={isOmit(i)}>−</button>
                    <button type="button" className="cp-nudge" onClick={() => nudge(1)} disabled={isOmit(i)}>+</button>
                    <button type="button" className={`cp-omit${isOmit(i) ? " is-on" : ""}`} onClick={() => onOmit?.(i)}>{isOmit(i) ? "left out" : "omit"}</button>
                  </span>
                </li>
              );
            }
            const amt = scaledAmount(ing, scale);
            return (
              <li key={i} className="cp-ings-item">
                {amt && <span className="cp-ings-amt tnum">{amt.qty}{amt.unit ? ` ${amt.unit}` : ""}</span>}
                <span className="cp-ings-text">{ing.raw_text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
