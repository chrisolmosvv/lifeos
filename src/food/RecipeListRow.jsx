import { recipeMacros } from "./recipeCalc";
import { fmtNum } from "./foodFormat";

// RecipeListRow (V2 P6) — the full-width broadsheet-index variant of a library entry (list view).
// Same type-awareness as RecipeCard (recipeKind passed in): a quiet tabular row — ★ · title · type/
// time · servings · kcal/serv. Shares the card's compute-on-read (recipeMacros, unforked).
export default function RecipeListRow({ recipe, kind, ingredients, itemsById, favourite, notYetCooked, active, onOpen, onToggleFav }) {
  const base = recipe.servings || 1;
  const m = recipeMacros(ingredients || [], base, itemsById || {});
  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const approx = m.unestimatedCount > 0;

  return (
    <li className={active ? "rl-row is-active" : "rl-row"}>
      <button type="button" className={favourite ? "rl-fav is-on" : "rl-fav"} aria-label="Toggle favourite" onClick={onToggleFav}>{favourite ? "★" : "☆"}</button>
      <button type="button" className="rl-open" onClick={onOpen}>
        <span className="rl-title">{recipe.title || "Untitled"}{notYetCooked && <span className="rl-uncooked"> · not yet cooked</span>}</span>
        <span className="rl-meta">
          {kind === "draft" ? "draft"
            : kind === "meal" ? `meal · ${base} serving${base === 1 ? "" : "s"}`
            : `${time ? `${time} min · ` : ""}${base} serving${base === 1 ? "" : "s"}`}
        </span>
        <span className="rl-kcal">{kind === "draft" ? "" : `${approx ? "~" : ""}${fmtNum("kcal", m.perServing.kcal)} kcal/serv`}</span>
      </button>
    </li>
  );
}
