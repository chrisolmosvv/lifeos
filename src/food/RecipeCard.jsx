import { recipeMacros } from "./recipeCalc";
import { fmtNum } from "./foodFormat";

// RecipeCard (V2 P6) — a typographic grid card, TYPE-AWARE via recipeKind (passed in, derived — never
// re-derived here): a recipe shows time · servings · kcal/serv; a meal shows a "Meal" tag + servings +
// kcal/serv (no time — it's assembled, not cooked); a draft reads quiet italic "draft". ★ toggles
// is_favourite. kcal/serv computes on read via recipeMacros (unforked, display only).
export default function RecipeCard({ recipe, kind, ingredients, itemsById, favourite, notYetCooked, onOpen, onToggleFav }) {
  const base = recipe.servings || 1;
  const m = recipeMacros(ingredients || [], base, itemsById || {});
  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const approx = m.unestimatedCount > 0;
  const serv = `${base} serving${base === 1 ? "" : "s"}`;
  const kcal = `${approx ? "~" : ""}${fmtNum("kcal", m.perServing.kcal)} kcal/serv`;

  return (
    <div className={`rc rc--${kind}`}>
      <button type="button" className={favourite ? "rc-fav is-on" : "rc-fav"} aria-label="Toggle favourite" onClick={onToggleFav}>{favourite ? "★" : "☆"}</button>
      <button type="button" className="rc-open" onClick={onOpen}>
        <span className="rc-title">{recipe.title || "Untitled"}</span>
        <span className="rc-stats">
          {kind === "draft" ? (
            <span className="rc-draft">draft</span>
          ) : kind === "meal" ? (
            <>
              <span className="rc-meal-tag">Meal</span>
              <span>{serv}</span>
              <span>{kcal}</span>
            </>
          ) : (
            <>
              {time ? <span>{time} min</span> : null}
              <span>{serv}</span>
              <span>{kcal}</span>
            </>
          )}
          {notYetCooked && <span className="rc-uncooked">not yet cooked</span>}
        </span>
      </button>
    </div>
  );
}
