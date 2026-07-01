import { itemToFood } from "./foodShape";

// QuickAddStrip (V2 P5) — the "Log again" strip: recent MEALS + favourited MEALS + favourited FOODS
// (meals-first; NEVER recent single foods — that was the noise the finder session removed). A MEAL
// chip re-logs in ONE tap (onPickMeal → a frozen recipe_cook snapshot); a FOOD chip opens the
// pre-filled amount step (onPickFood → the finder preset, a food needs an amount). ★ marks favourites.
// `items` is a pre-ordered list of { type:'meal', recipe, favourite } | { type:'food', row }.
export default function QuickAddStrip({ items, onPickMeal, onPickFood }) {
  if (!items?.length) return null;
  return (
    <div className="qa">
      <span className="qa-label">Quick add</span>
      <div className="qa-row">
        {items.map((it) =>
          it.type === "meal" ? (
            <button key={`m:${it.recipe.id}`} type="button" className="qa-chip" onClick={() => onPickMeal(it)}>
              {it.favourite ? <span className="qa-star">★</span> : null}{it.recipe.title}
            </button>
          ) : (
            <button key={`f:${it.row.id}`} type="button" className="qa-chip" onClick={() => onPickFood(itemToFood(it.row))}>
              {it.row.is_favourite ? <span className="qa-star">★</span> : null}{it.row.name}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
