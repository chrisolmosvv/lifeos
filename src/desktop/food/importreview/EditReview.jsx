// LifeOS — Food → EDIT a saved recipe THROUGH the review screen (Piece 6). The owner's ruling: Edit
// re-opens the SAME three-pass review, for that recipe. A saved recipe isn't an import draft, so this
// thin loader fetches it (whole rows — grams/station/hold/is_prep/step_position intact) and shapes it
// into the draft ImportReview already understands, then hands off. reviewed_at decides the mode:
//   • reviewed_at set   → a finished recipe → EDIT mode (scaffolding off; updateRecipe keeps it reviewed)
//   • reviewed_at null  → an unreviewed import → the FULL review (flags + prep approval), marked
//                          reviewed on save — exactly what reviewing that draft means.

import { useEffect, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import ImportReview from "./ImportReview";

export default function EditReview({ recipeId, onBack, onSaved }) {
  const [loaded, setLoaded] = useState(null); // null | { draft, itemsById, reviewed }

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    fetchRecipe(recipeId)
      .then(({ recipe, ingredients, steps, itemsById }) => {
        if (!alive) return;
        const draft = {
          title: recipe.title, cuisine: recipe.cuisine,
          servings: recipe.servings, default_servings: recipe.default_servings,
          prep_minutes: recipe.prep_minutes, cook_minutes: recipe.cook_minutes,
          source_url: recipe.source_url,
          ingredients, // whole rows — food_item_id/raw_text/amount/unit/manual_macros/no_macros/step_position/grams
          steps,       // whole rows — text/timer_seconds/tag/depends_on/station/hold_tolerance/is_prep (0-based deps, as stored)
        };
        setLoaded({ draft, itemsById: itemsById || {}, reviewed: !!recipe.reviewed_at });
      })
      .catch(() => alive && onBack());
    return () => { alive = false; };
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;

  return (
    <ImportReview draft={loaded.draft} itemsById={loaded.itemsById} editId={recipeId} reviewed={loaded.reviewed}
      onBack={onBack} onSaved={onSaved} />
  );
}
