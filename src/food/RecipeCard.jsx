import { recipeMacros } from "./recipeCalc";
import { fmtNum } from "./foodFormat";

// RecipeCard — a typographic library card (no photos): title over a quiet stat line
// (time · servings · kcal/serving). kcal/serving is computed on read via recipeMacros from the
// recipe's ingredients + itemsById; a recipe with unestimated ingredients shows a ~ on the figure.
export default function RecipeCard({ recipe, ingredients, itemsById, onOpen }) {
  const base = recipe.servings || 1;
  const m = recipeMacros(ingredients || [], base, itemsById || {});
  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const isDraft = (ingredients || []).length === 0;
  const approx = m.unestimatedCount > 0;

  return (
    <button type="button" className="rc" onClick={onOpen}>
      <span className="rc-title">{recipe.title}</span>
      <span className="rc-stats">
        {isDraft ? (
          <span className="rc-draft">draft</span>
        ) : (
          <>
            {time ? <span>{time} min</span> : null}
            <span>{base} serving{base === 1 ? "" : "s"}</span>
            <span>{approx ? "~" : ""}{fmtNum("kcal", m.perServing.kcal)} kcal/serv</span>
          </>
        )}
      </span>
    </button>
  );
}
