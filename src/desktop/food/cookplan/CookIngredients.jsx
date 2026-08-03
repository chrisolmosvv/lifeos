// LifeOS — Food → cook plan INGREDIENTS panel (3a display · 3f/3g editing). FLAT — one click from the
// masthead shows the list (the old nested toggle is gone). Each row shows the buy-form amount, the
// ingredient, its edible grams and full macros; a tick strikes a used ingredient; tapping a row opens
// the SAME cook-variant Finder (change amount/unit, mark left out, tick used) the On-now card uses —
// every edit a proposal that moves the live ledger and reaches the finish review. Reuses buildReview.

import { buildReview } from "../../../spine/logic/importReviewLogic";
import "../importreview/importReview.css"; // 3g: shared macro colours (iv-mp/iv-mc/iv-mf)

export default function CookIngredients({ ingredients, itemsById, srcServings, serv, usedSet, omittedSet, onEdit }) {
  const list = ingredients || [];
  if (list.length === 0) return null;
  const { rows } = buildReview(list, itemsById, srcServings, serv);

  return (
    <section className="cp-ings">
      <div className="cp-ings-head">Ingredients <span className="cp-ings-count tnum">{list.length}</span></div>
      <ul className="cp-ings-list">
        {rows.map((row) => {
          const used = usedSet?.has(String(row.i));
          const omit = omittedSet?.has(String(row.i));
          const unit = row.unit && row.unit !== "item" ? ` ${row.unit}` : "";
          return (
            <li key={row.i} className={`cp-ings-item${used ? " is-used" : ""}${omit ? " is-omit" : ""}`}>
              <button type="button" className="cp-ings-btn" onClick={(e) => onEdit(row.i, e)}>
                <span className="cp-ings-amt tnum">{row.amount != null ? `${row.amount}${unit}` : "—"}</span>
                <span className="cp-ings-text">{row.orig}{omit ? " · left out" : ""}</span>
                <span className="cp-ings-g tnum">{row.grams != null ? `${row.grams}g` : ""}</span>
                <span className="cp-ings-kc tnum">{row.kcal}</span>
                <span className="cp-ings-mm iv-mp tnum">{row.protein}</span>
                <span className="cp-ings-mm iv-mc tnum">{row.carbs}</span>
                <span className="cp-ings-mm iv-mf tnum">{row.fat}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
