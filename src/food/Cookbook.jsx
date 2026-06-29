import { useEffect, useMemo, useState } from "react";
import { fetchCookbook } from "./recipeLoad";
import { useRecipeWrites } from "./useRecipeWrites";
import RecipeCard from "./RecipeCard";
import RecipePage from "./RecipePage";
import RecipeEditor from "./RecipeEditor";
import ImportScreen from "./ImportScreen";
import Toast from "../kit/Toast";
import "./cookbook.css";

// Cookbook — the Cookbook-tab orchestrator (fills FoodPage's Cookbook tab). Holds the view state:
// the library GRID, a RECIPE PAGE, or the EDITOR. The grid sorts by added / cooked / A–Z (default
// "added"; "cooked" now reads last_cooked_at — the F9 cook→log link). Recipe macros for the cards
// compute on read via recipeMacros. A cross-tab Log→Cookbook jump opens a recipe via openRecipeId.
const SORTS = [
  { id: "added", label: "Added" },
  { id: "cooked", label: "Cooked" },
  { id: "az", label: "A–Z" },
];

export default function Cookbook({ openRecipeId, onConsumeOpen }) {
  const [data, setData] = useState({ recipes: [], ingredientsByRecipe: {}, itemsById: {} });
  const [view, setView] = useState({ kind: "grid" }); // grid | {kind:'recipe',id} | {kind:'editor',id|null}
  const [sort, setSort] = useState("added");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false); // a cook was logged — refresh the grid on return
  const rw = useRecipeWrites();

  const load = async () => {
    setLoading(true);
    setData(await fetchCookbook());
    setLoading(false);
  };
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  // Cross-tab deep-link: the Log ledger's "View recipe" sets openRecipeId + switches to this tab;
  // open that recipe, then clear the parent's pending id so a later re-tap re-fires.
  useEffect(() => {
    if (openRecipeId) { setView({ kind: "recipe", id: openRecipeId }); onConsumeOpen?.(); }
  }, [openRecipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returning to the grid: if a cook was logged while away, re-read so the cooked sort + dates are current.
  const backToGrid = () => { setView({ kind: "grid" }); if (dirty) { setDirty(false); load(); } };

  const sorted = useMemo(() => {
    const rs = [...data.recipes];
    if (sort === "az") rs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "cooked") {
      // Cooked recipes by last_cooked_at desc; never-cooked AFTER them in added order (the fetch
      // order — created_at desc). No dead-end: never-cooked are kept + faintly tagged on the card.
      const ts = (r) => (r.last_cooked_at ? Date.parse(r.last_cooked_at) : null);
      rs.sort((a, b) => {
        const ta = ts(a), tb = ts(b);
        if (ta && tb) return tb - ta;
        if (ta) return -1;
        if (tb) return 1;
        return 0; // both never-cooked: preserve fetch (added) order
      });
    }
    // "added" = the fetch order (created_at desc).
    return rs;
  }, [data.recipes, sort]);

  const onSave = async (recipe, ingredients, steps) => {
    const res = await rw.save(view.id ?? null, recipe, ingredients, steps);
    if (res.ok) { await load(); setView({ kind: "recipe", id: res.id }); }
  };
  const onDelete = async (id) => {
    const res = await rw.remove(id);
    if (res.ok) { await load(); setView({ kind: "grid" }); }
  };

  if (view.kind === "import") {
    return (
      <ImportScreen
        onImported={(draft, itemsById) => setView({ kind: "editor", id: null, draft, itemsById })}
        onCancel={() => setView({ kind: "grid" })}
      />
    );
  }
  if (view.kind === "editor") {
    return (
      <>
        <RecipeEditor
          recipeId={view.id ?? null}
          initialDraft={view.draft}
          initialItemsById={view.itemsById}
          saving={rw.busy}
          onSave={onSave}
          onCancel={() => setView(view.id ? { kind: "recipe", id: view.id } : { kind: "grid" })}
          onDelete={() => onDelete(view.id)}
        />
        {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
      </>
    );
  }
  if (view.kind === "recipe") {
    return (
      <>
        <RecipePage recipeId={view.id} onBack={backToGrid} onEdit={(id) => setView({ kind: "editor", id })} onDelete={onDelete} onCooked={() => setDirty(true)} />
        {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
      </>
    );
  }

  return (
    <div className="cb">
      <div className="cb-head">
        <div className="cb-sorts" role="tablist" aria-label="Sort recipes">
          {SORTS.map((s) => (
            <button key={s.id} type="button" className={s.id === sort ? "cb-sort is-active" : "cb-sort"} aria-selected={s.id === sort} onClick={() => setSort(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="cb-head-actions">
          <button type="button" className="cb-import-btn" onClick={() => setView({ kind: "import" })}>Import</button>
          <button type="button" className="cb-new" onClick={() => setView({ kind: "editor", id: null })}>+ New</button>
        </div>
      </div>

      {loading ? (
        <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading your cookbook…</span></div>
      ) : data.recipes.length === 0 ? (
        <div className="cb-onboard">
          <p className="cb-onboard-line">Your cookbook is empty.</p>
          <p className="cb-onboard-sub">Recipes are set in type — title, ingredients, steps, times. Macros compute from the ingredients; cooking mode runs timers for you.</p>
          <div className="cb-onboard-actions">
            <button type="button" className="cb-new" onClick={() => setView({ kind: "editor", id: null })}>+ New recipe</button>
            <button type="button" className="cb-import" onClick={() => setView({ kind: "import" })}>Import from text or a link</button>
          </div>
        </div>
      ) : (
        <div className="cb-grid">
          {sorted.map((r) => (
            <RecipeCard key={r.id} recipe={r} ingredients={data.ingredientsByRecipe[r.id]} itemsById={data.itemsById}
              notYetCooked={sort === "cooked" && !r.last_cooked_at} onOpen={() => setView({ kind: "recipe", id: r.id })} />
          ))}
        </div>
      )}
    </div>
  );
}
