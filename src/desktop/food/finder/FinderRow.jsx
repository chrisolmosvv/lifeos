import { fmtNum } from "../../../spine/logic/foodFormat";

// FinderRow — one result row: name · brand · a quiet tabular macro line (kcal · P/C/F per 100g).
// No chips, no confidence dots — the zone collapse is the signal. `active` marks the keyboard
// highlight (Enter picks it). Reads the record; never mutates it.
export default function FinderRow({ food, active, onPick }) {
  const p = food.per100g || {};
  return (
    <button type="button" className={active ? "fdr-row is-active" : "fdr-row"} onClick={() => onPick(food)}>
      <span className="fdr-name">
        {food.display_name || food.name}
        {food.brand ? <span className="fdr-brand"> · {food.brand}</span> : null}
      </span>
      <span className="fdr-macros">
        {p.kcal != null ? `${Math.round(p.kcal)} kcal` : "—"} · P{fmtNum("protein", p.protein)} C
        {fmtNum("carbs", p.carbs)} F{fmtNum("fat", p.fat)}
      </span>
    </button>
  );
}
