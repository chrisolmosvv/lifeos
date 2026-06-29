import { useEffect, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros } from "./recipeCalc";
import { entryMacros } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import IngredientPicker from "./IngredientPicker";
import "./cookbook.css";

// RecipeEditor — create + edit + the F8 IMPORT review (same form). Title only is required. The
// editor is the import "review screen": `initialDraft` pre-fills it; auto-matched ingredients show
// their matched food NAME + kcal in the row (the spot-check — a wrong match is catchable by eye);
// a flagged ingredient (no clear match) shows "needs a match" with a tap → the F6 search pre-filled
// with the parsed name, or "keep as text". Save → onSave(recipe incl source_url, ingredients, steps).
export default function RecipeEditor({ recipeId, initialDraft, initialItemsById, onSave, onCancel, onDelete, saving }) {
  const [title, setTitle] = useState(initialDraft?.title || "");
  const [servings, setServings] = useState(initialDraft?.servings ?? "");
  const [prep, setPrep] = useState(initialDraft?.prep_minutes ?? "");
  const [cook, setCook] = useState(initialDraft?.cook_minutes ?? "");
  const [ingredients, setIngredients] = useState(initialDraft?.ingredients || []);
  const [steps, setSteps] = useState(initialDraft?.steps || []);
  const [itemsById, setItemsById] = useState(initialItemsById || {});
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.source_url ?? null);
  const [picker, setPicker] = useState(null); // null | { index: number|null, query }
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
        setSourceUrl(r.recipe.source_url ?? null);
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

  const openPicker = (index) => setPicker({ index, query: index != null ? (ingredients[index]?.parsedName || ingredients[index]?.raw_text || "") : "" });
  const onPick = (ing, food) => {
    setIngredients((xs) => (picker.index == null ? [...xs, ing] : xs.map((x, i) => (i === picker.index ? ing : x))));
    if (food?.food_item_id) setItemsById((m) => ({ ...m, [food.food_item_id]: food }));
    setPicker(null);
  };
  const keepAsText = (i) => setIngredients((xs) => xs.map((x, j) => (j === i ? { ...x, no_macros: true, food_item_id: null } : x)));
  const removeIng = (i) => setIngredients((xs) => xs.filter((_, j) => j !== i));
  const moveStep = (i, d) => setSteps((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const info = (ing) => {
    if (ing.food_item_id && itemsById[ing.food_item_id]) {
      const item = itemsById[ing.food_item_id];
      const kcal = ing.amount != null ? entryMacros(item, Number(ing.amount), "g").kcal : null;
      return { status: "matched", name: item.name, kcal };
    }
    if (ing.no_macros) return { status: "text" };
    return { status: "flag" };
  };

  const valid = title.trim() !== "";
  const submit = () =>
    onSave(
      { title: title.trim(), servings: servings === "" ? null : Number(servings), prep_minutes: prep === "" ? null : Number(prep), cook_minutes: cook === "" ? null : Number(cook), source_url: sourceUrl },
      ingredients.map((i) => ({ food_item_id: i.food_item_id ?? null, raw_text: i.raw_text ?? null, amount: i.amount ?? null, unit: i.unit ?? null, manual_macros: i.manual_macros ?? null, no_macros: !!i.no_macros })),
      steps.filter((s) => s.text.trim() !== "").map((s) => ({ text: s.text.trim() })),
    );

  if (loading) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Loading recipe…</span></div>;

  return (
    <div className="red">
      <button type="button" className="red-back" onClick={onCancel}>‹ Cookbook</button>
      {sourceUrl && <p className="red-source">imported {(() => { try { return `from ${new URL(sourceUrl).hostname}`; } catch { return "from a link"; } })()}</p>}

      <input className="red-title" type="text" placeholder="Recipe title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="red-meta">
        <label>Servings <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="1" /></label>
        <label>Prep min <input type="number" min="0" value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
        <label>Cook min <input type="number" min="0" value={cook} onChange={(e) => setCook(e.target.value)} /></label>
      </div>

      <h3 className="red-h">Ingredients</h3>
      <ul className="red-ings">
        {ingredients.map((ing, i) => {
          const m = info(ing);
          return (
            <li key={i} className="red-ing">
              <span className="red-ing-text">
                {ing.raw_text || "ingredient"}
                {m.status === "matched" && <span className="red-ing-match"> · {m.name}{m.kcal != null ? ` · ${Math.round(m.kcal)} kcal` : " · set amount"}</span>}
                {m.status === "flag" && <span className="red-ing-flag"> · needs a match</span>}
                {m.status === "text" && <span className="red-mark"> · no macros</span>}
              </span>
              <span className="red-ing-ctl">
                <button type="button" onClick={() => openPicker(i)}>{m.status === "matched" ? "change" : "match"}</button>
                {m.status === "flag" && <button type="button" onClick={() => keepAsText(i)}>text</button>}
                <button type="button" className="red-x" aria-label="Remove" onClick={() => removeIng(i)}>×</button>
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="red-add" onClick={() => openPicker(null)}>+ ingredient</button>

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
      <button type="button" className="red-add" onClick={() => setSteps((xs) => [...xs, { text: "" }])}>+ step</button>

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

      {picker && <IngredientPicker initialQuery={picker.query} onAdd={onPick} onClose={() => setPicker(null)} />}
    </div>
  );
}
