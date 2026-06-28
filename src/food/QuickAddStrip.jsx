import { itemToFood } from "./foodShape";

// QuickAddStrip — one blended row of favourites + recents (the F5 reserved spot). Tapping a
// chip opens the pre-filled amount step (the same flow as a search pick, but the food is
// already a saved food_items row → no re-cache). Favourites carry a small star. `foods` is a
// pre-blended, pre-ordered list of food_items rows (favourites first, then recents).
export default function QuickAddStrip({ foods, onPick }) {
  if (!foods?.length) return null;
  return (
    <div className="qa">
      <span className="qa-label">Quick add</span>
      <div className="qa-row">
        {foods.map((row) => (
          <button key={row.id} type="button" className="qa-chip" onClick={() => onPick(itemToFood(row))}>
            {row.is_favourite ? <span className="qa-star">★</span> : null}
            {row.name}
          </button>
        ))}
      </div>
    </div>
  );
}
