import { useEffect, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros } from "./recipeCalc";
import { fmtNum } from "./foodFormat";
import IngredientPicker from "./IngredientPicker";
import "./cookbook.css";

// RecipeEditor — create + edit (same form, pre-filled on edit). Title only is required (rough
// drafts ok). Ingredients are added via the F6 search + the portions amount step (IngredientPicker);
// steps are text fields (add / reorder / remove). Per-serving macros update LIVE via recipeMacros
// as ingredients change. Save → onSave(recipe, ingredients, steps); Delete (confirm) → onDelete().
export default function RecipeEditor({ recipeId, onSave, onCancel, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("");
  const [prep, setPrep] = useState("");
  const [cook, setCook] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [itemsById, setItemsById] = useState({});
  const [picker, setPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [loading, setLoading] = useState(!!recipeId);

  useEffect(() => {
    if (!recipeId) return;
    let alive = true;
    fetchRecipe(recipeId)
      .then((r) => {
        if (!alive) return;
        setTitle(r.recipe.title || "");
        setServings(r.recipe.servings ?? "");
        setPrep(r.recipe.prep_minutes ?? "");
        setCook(r.recipe.cook_minutes ?? "");
        setIngredients(r.ingredients.map((i) => ({ food_item_id: i.food_item_id, raw_text: i.raw_text, amount: i.amount, unit: i.unit, no_macros: i.no_macros, manual_macros: i.manual_macros })));
        setSteps((r.steps || []).map((s) => ({ text: s.text })));
        setItemsById(r.itemsById || {});
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [recipeId]);

  const servNum = Number(servings) > 0 ? Number(servings) : 1;
  const macros = recipeMacros(ingredients, servNum, itemsById);

  const addIngredient = (ing, food) => {
    setIngredients((xs) => [...xs, ing]);
    if (food?.food_item_id) setItemsById((m) => ({ ...m, [food.food_item_id]: food }));
    setPicker(false);
  };
  const addStep = () => setSteps((xs) => [...xs, { text: "" }]);
  const moveStep = (i, d) => setSteps((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const valid = title.trim() !== "";
  const submit = () =>
    onSave(
      { title: title.trim(), servings: servings === "" ? null : Number(servings), prep_minutes: prep === "" ? null : Number(prep), cook_minutes: cook === "" ? null : Number(cook) },
      ingredients.map((i) => ({ ...i, raw_text: i.raw_text ?? null })),
      steps.filter((s) => s.text.trim() !== "").map((s) => ({ text: s.text.trim() })),
    );

  if (loading) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Loading recipe…</span></div>;

  return (
    <div className="red">
      <button type="button" className="red-back" onClick={onCancel}>‹ Cookbook</button>

      <input className="red-title" type="text" placeholder="Recipe title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="red-meta">
        <label>Servings <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="1" /></label>
        <label>Prep min <input type="number" min="0" value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
        <label>Cook min <input type="number" min="0" value={cook} onChange={(e) => setCook(e.target.value)} /></label>
      </div>

      <h3 className="red-h">Ingredients</h3>
      <ul className="red-ings">
        {ingredients.map((ing, i) => (
          <li key={i} className="red-ing">
            <span className="red-ing-text">{ing.raw_text || "ingredient"}{ing.no_macros ? <span className="red-mark"> · no macros</span> : null}</span>
            <button type="button" className="red-x" aria-label="Remove" onClick={() => setIngredients((xs) => xs.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <button type="button" className="red-add" onClick={() => setPicker(true)}>+ ingredient</button>

      <h3 className="red-h">Steps</h3>
      <ol className="red-steps">
        {steps.map((s, i) => (
          <li key={i} className="red-step">
            <textarea rows={2} value={s.text} placeholder={`Step ${i + 1}`} onChange={(e) => setSteps((xs) => xs.map((x, j) => (j === i ? { text: e.target.value } : x)))} />
            <div className="red-step-ctl">
              <button type="button" onClick={() => moveStep(i, -1)} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveStep(i, 1)} aria-label="Move down">↓</button>
              <button type="button" onClick={() => setSteps((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="red-add" onClick={addStep}>+ step</button>

      <div className="red-macros">
        Per serving: {fmtNum("kcal", macros.perServing.kcal)} kcal · P{fmtNum("protein", macros.perServing.protein)} C{fmtNum("carbs", macros.perServing.carbs)} F{fmtNum("fat", macros.perServing.fat)}
        {macros.unestimatedCount > 0 && <span className="red-approx"> · ~{macros.unestimatedCount} unestimated</span>}
      </div>

      <div className="red-actions">
        {recipeId && (confirmDel ? (
          <span className="red-confirm">Delete recipe? <button type="button" onClick={() => setConfirmDel(false)}>Keep</button><button type="button" className="red-danger" onClick={onDelete}>Delete</button></span>
        ) : (
          <button type="button" className="red-delete" onClick={() => setConfirmDel(true)}>Delete</button>
        ))}
        <span className="red-spacer" />
        <button type="button" className="red-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="red-save" disabled={!valid || saving} onClick={submit}>{saving ? "Saving…" : "Save"}</button>
      </div>

      {picker && <IngredientPicker onAdd={addIngredient} onClose={() => setPicker(false)} />}
    </div>
  );
}
