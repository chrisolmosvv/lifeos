// RecipeOverview — the "View full recipe" panel. Skeleton for step 1;
// full build (tickable ingredients, servings, method, timing strip) is step 2.

export default function RecipeOverview({ recipe, ingredients, steps, open, onClose }) {
  if (!open) return null;

  return (
    <div className="cc-overview">
      <div className="cc-overview-head">
        <h2 className="cc-overview-title">{recipe.title}</h2>
        <button type="button" className="cc-overview-close" onClick={onClose}>Close</button>
      </div>
      <div className="cc-overview-body">
        <div className="cc-overview-section">
          <div className="cc-overview-label">Ingredients</div>
          <ul className="cc-overview-ings">
            {ingredients.map((ing, i) => (
              <li key={i} className="cc-overview-ing">{ing.raw_text}</li>
            ))}
          </ul>
        </div>
        <div className="cc-overview-section">
          <div className="cc-overview-label">Method</div>
          <ol className="cc-overview-steps">
            {steps.map((s, i) => (
              <li key={i} className="cc-overview-step">{s.text}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
