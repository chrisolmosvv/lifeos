import { useEffect, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros } from "./recipeCalc";
import { entryMacros } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import { ensureFoodItem } from "./recipeWrite";
import { updateDisplayName } from "./foodWrite";
import Finder from "./finder/Finder";
import { recipeFinderConfig } from "./finder/finderConfig";
import ManualMacrosPanel from "./ManualMacrosPanel";
import "./cookbook.css";

// RecipeEditor (V2 P6) — create + edit + the import review (same form), now TWO-COLUMN (ingredients +
// live macros left, steps right). Ingredient add/match MOUNTS the converged finder (recipeFinderConfig
// — portions ON, no-macros/free-text hatch ON, meals OFF) — the SAME <Finder> as the logger, not a
// clone (IngredientPicker retired). A matched ingredient shows its food + kcal (spot-check); a flagged
// one shows "needs a match" → the finder (pre-filled) or "text" (no_macros). Edit-rewrites-children
// is preserved (the write layer). Save → onSave(recipe incl source_url, ingredients, steps).
export default function RecipeEditor({ recipeId, initialDraft, initialItemsById, onSave, onCancel, onDelete, saving }) {
  const [title, setTitle] = useState(initialDraft?.title || "");
  const [servings, setServings] = useState(initialDraft?.servings ?? "");
  const [prep, setPrep] = useState(initialDraft?.prep_minutes ?? "");
  const [cook, setCook] = useState(initialDraft?.cook_minutes ?? "");
  const [ingredients, setIngredients] = useState(initialDraft?.ingredients || []);
  const [steps, setSteps] = useState(initialDraft?.steps || []);
  const [itemsById, setItemsById] = useState(initialItemsById || {});
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.source_url ?? null);
  const [finderAt, setFinderAt] = useState(null); // null | { index: number|null, query }
  const [manualAt, setManualAt] = useState(null); // null | index — the [manual] macros rescue
  const [renameAt, setRenameAt] = useState(null); // null | { foodItemId, value }
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
        setIngredients(r.ingredients.map((i) => ({ food_item_id: i.food_item_id, raw_text: i.raw_text, amount: i.amount, unit: i.unit, no_macros: i.no_macros, manual_macros: i.manual_macros, step_position: i.step_position ?? null })));
        setSteps((r.steps || []).map((s) => ({ text: typeof s.text === "string" ? s.text : String(s.text ?? ""), timer_seconds: s.timer_seconds ?? null, tag: s.tag ?? null, depends_on: s.depends_on ?? null })));
        setItemsById(r.itemsById || {});
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [recipeId]);

  const servNum = Number(servings) > 0 ? Number(servings) : 1;
  const macros = recipeMacros(ingredients, servNum, itemsById);

  const openFinder = (index) => setFinderAt({ index, query: index != null ? (ingredients[index]?.parsedName || ingredients[index]?.raw_text || "") : "" });
  const applyIng = (ing) => setIngredients((xs) => (finderAt.index == null ? [...xs, ing] : xs.map((x, i) => (i === finderAt.index ? ing : x))));
  // Finder recipe-context outputs: a matched food (cache → food_item_id + resolved grams) …
  const onResolve = async (food, detail) => {
    try {
      const item = await ensureFoodItem(food);
      setItemsById((m) => ({ ...m, [item.id]: { ...food, food_item_id: item.id } }));
      const displayName = food.display_name || item.display_name || food.name;
      applyIng({ food_item_id: item.id, raw_text: displayName, amount: detail.grams, unit: "g", no_macros: false });
    } catch { /* leave the finder open to retry */ return; }
    setFinderAt(null);
  };
  // … or a free-text no-macros line.
  const onResolveText = (text) => { applyIng({ food_item_id: null, raw_text: text, amount: null, unit: null, no_macros: true }); setFinderAt(null); };
  const keepAsText = (i) => setIngredients((xs) => xs.map((x, j) => (j === i ? { ...x, no_macros: true, food_item_id: null } : x)));
  const setManual = (i, m) => { setIngredients((xs) => xs.map((x, j) => (j === i ? { ...x, manual_macros: m, no_macros: false, food_item_id: null } : x))); setManualAt(null); };
  const removeIng = (i) => setIngredients((xs) => xs.filter((_, j) => j !== i));
  const moveStep = (i, d) => setSteps((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const foodName = (id) => {
    const item = itemsById[id];
    if (!item) return "";
    return item.display_name || item.name;
  };

  const info = (ing) => {
    if (ing.food_item_id && itemsById[ing.food_item_id]) {
      const kcal = ing.amount != null ? entryMacros(itemsById[ing.food_item_id], Number(ing.amount), "g").kcal : null;
      return { status: "matched", name: foodName(ing.food_item_id), foodItemId: ing.food_item_id, kcal };
    }
    if (ing.manual_macros && Number.isFinite(ing.manual_macros.kcal)) return { status: "manual", kcal: ing.manual_macros.kcal };
    if (ing.no_macros) return { status: "text" };
    return { status: "flag" };
  };

  // Rename a food's display_name (shared edit — affects this food everywhere)
  const saveRename = async () => {
    if (!renameAt) return;
    const val = renameAt.value.trim();
    if (!val) { setRenameAt(null); return; }
    try {
      await updateDisplayName(renameAt.foodItemId, val);
      setItemsById((m) => {
        const item = m[renameAt.foodItemId];
        if (!item) return m;
        return { ...m, [renameAt.foodItemId]: { ...item, display_name: val, name: val } };
      });
    } catch { /* swallow — the name stays as-is */ }
    setRenameAt(null);
  };

  const valid = title.trim() !== "";
  const submit = () =>
    onSave(
      { title: title.trim(), servings: servings === "" ? null : Number(servings), prep_minutes: prep === "" ? null : Number(prep), cook_minutes: cook === "" ? null : Number(cook), source_url: sourceUrl },
      ingredients.map((i) => ({ food_item_id: i.food_item_id ?? null, raw_text: i.raw_text ?? null, amount: i.amount ?? null, unit: i.unit ?? null, manual_macros: i.manual_macros ?? null, no_macros: !!i.no_macros, step_position: i.step_position ?? null })),
      steps.filter((s) => String(s.text ?? "").trim() !== "").map((s) => ({ text: String(s.text ?? "").trim(), timer_seconds: s.timer_seconds ?? null, tag: s.tag ?? null, depends_on: s.depends_on ?? null })),
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

      <div className="red-cols">
        <div className="red-col">
          <h3 className="red-h">Ingredients</h3>
          <ul className="red-ings">
            {ingredients.map((ing, i) => {
              const m = info(ing);
              const isRenaming = renameAt && m.foodItemId && renameAt.foodItemId === m.foodItemId;
              return (
                <li key={i} className="red-ing">
                  <span className="red-ing-text">
                    {ing.raw_text || "ingredient"}
                    {m.status === "matched" && !isRenaming && (
                      <span className="red-ing-match">
                        {" · "}{m.name}
                        <button type="button" className="red-rename" aria-label="Rename food"
                          onClick={() => setRenameAt({ foodItemId: m.foodItemId, value: m.name })}>✎</button>
                        {m.kcal != null ? ` · ${Math.round(m.kcal)} kcal` : " · set amount"}
                      </span>
                    )}
                    {m.status === "matched" && isRenaming && (
                      <span className="red-ing-match">
                        {" · "}
                        <input className="red-rename-input" type="text" value={renameAt.value} autoFocus
                          onChange={(e) => setRenameAt((r) => ({ ...r, value: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenameAt(null); }}
                          onBlur={saveRename} />
                      </span>
                    )}
                    {m.status === "manual" && <span className="red-ing-match"> · ~ {Math.round(m.kcal)} kcal (estimated)</span>}
                    {m.status === "flag" && <span className="red-ing-flag"> · needs a match</span>}
                    {m.status === "text" && <span className="red-mark"> · no macros</span>}
                  </span>
                  <span className="red-ing-ctl">
                    <button type="button" onClick={() => openFinder(i)}>{m.status === "matched" ? "change" : "search"}</button>
                    {(m.status === "flag" || m.status === "manual") && <button type="button" onClick={() => setManualAt(i)}>manual</button>}
                    {m.status === "flag" && <button type="button" onClick={() => keepAsText(i)}>skip</button>}
                    <button type="button" className="red-x" aria-label="Remove" onClick={() => removeIng(i)}>×</button>
                  </span>
                </li>
              );
            })}
          </ul>
          <button type="button" className="red-add" onClick={() => openFinder(null)}>+ ingredient</button>
          <div className="red-macros">
            Per serving: {fmtNum("kcal", macros.perServing.kcal)} kcal · P{fmtNum("protein", macros.perServing.protein)} C{fmtNum("carbs", macros.perServing.carbs)} F{fmtNum("fat", macros.perServing.fat)}
            {macros.unestimatedCount > 0 && <span className="red-approx"> · ~{macros.unestimatedCount} unestimated</span>}
          </div>
        </div>

        <div className="red-col">
          <h3 className="red-h">Steps</h3>
          <ol className="red-steps">
            {steps.map((s, i) => (
              <li key={i} className="red-step">
                <textarea rows={2} value={typeof s.text === "string" ? s.text : ""} placeholder={`Step ${i + 1}`} onChange={(e) => setSteps((xs) => xs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <div className="red-step-ctl">
                  <button type="button" onClick={() => moveStep(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => moveStep(i, 1)} aria-label="Move down">↓</button>
                  <button type="button" onClick={() => setSteps((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="red-add" onClick={() => setSteps((xs) => [...xs, { text: "" }])}>+ step</button>
        </div>
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

      {finderAt && (
        <Finder finderConfig={recipeFinderConfig} title="Add ingredient" initialQuery={finderAt.query}
          onResolve={onResolve} onResolveText={onResolveText} onClose={() => setFinderAt(null)} />
      )}
      {manualAt != null && (
        <ManualMacrosPanel name={ingredients[manualAt]?.raw_text} initial={ingredients[manualAt]?.manual_macros}
          onSave={(m) => setManual(manualAt, m)} onClose={() => setManualAt(null)} />
      )}
    </div>
  );
}
