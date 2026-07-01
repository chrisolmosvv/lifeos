import { useRef } from "react";
import { itemToFood } from "./foodShape";

// QuickAddStrip (V2 P5 + P8) — recent MEALS + favourited MEALS + favourited FOODS (meals-first; never
// recent foods). A MEAL chip: TAP = one-tap re-log (P5, 1 serving); LONG-PRESS = the staging sheet to
// adjust servings (P8). A FOOD chip opens the amount step. ★ marks favourites.
function MealChip({ item, onTap, onLongPress }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const down = () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; onLongPress(item); }, 450); };
  const up = () => clearTimeout(timer.current);
  const click = () => { if (!fired.current) onTap(item); }; // long-press already handled → suppress the tap
  return (
    <button type="button" className="qa-chip" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onClick={click}>
      {item.favourite ? <span className="qa-star">★</span> : null}{item.recipe.title}
    </button>
  );
}

export default function QuickAddStrip({ items, onPickMeal, onLongPressMeal, onPickFood }) {
  if (!items?.length) return null;
  return (
    <div className="qa">
      <span className="qa-label">Quick add</span>
      <div className="qa-row">
        {items.map((it) =>
          it.type === "meal" ? (
            <MealChip key={`m:${it.recipe.id}`} item={it} onTap={onPickMeal} onLongPress={onLongPressMeal} />
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
