// LifeOS — Food → cook plan INGREDIENTS panel (Piece 3a, dormant). A collapsible list of every
// ingredient with its servings-scaled amount (grams where present, else the stored amount+unit).
// Display only — scaling is compute-on-read, nothing is stored.

import { useState } from "react";
import { scaledAmount } from "../../../spine/logic/cookPlanView";

export default function CookIngredients({ ingredients, scale }) {
  const [open, setOpen] = useState(false);
  const list = ingredients || [];
  if (list.length === 0) return null;

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
