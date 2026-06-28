import { useEffect, useMemo, useState } from "react";
import { fetchCookbook } from "./recipeLoad";
import { useRecipeWrites } from "./useRecipeWrites";
import RecipeCard from "./RecipeCard";
import RecipePage from "./RecipePage";
import RecipeEditor from "./RecipeEditor";
import Toast from "../kit/Toast";
import "./cookbook.css";

// Cookbook — the Cookbook-tab orchestrator (fills FoodPage's Cookbook tab). Holds the view state:
// the library GRID, a RECIPE PAGE, or the EDITOR. The grid sorts by added / cooked / A–Z (default
// "added"; "cooked" has no data until the F9 cook→log link, so it falls back to added order, not a
// dead end). Recipe macros for the cards compute on read via recipeMacros.
const SORTS = [
  { id: "added", label: "Added" },
  { id: "cooked", label: "Cooked" },
  { id: "az", label: "A–Z" },
];

export default function Cookbook() {
  const [data, setData] = useState({ recipes: [], ingredientsByRecipe: {}, itemsById: {} });
  const [view, setView] = useState({ kind: "grid" }); // grid | {kind:'recipe',id} | {kind:'editor',id|null}
  const [sort, setSort] = useState("added");
  const [loading, setLoading] = useState(true);
  const rw = useRecipeWrites();

  const load = async () => {
    setLoading(true);
    setData(await fetchCookbook());
    setLoading(false);
  };
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const sorted = useMemo(() => {
    const rs = [...data.recipes];
    if (sort === "az") rs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    // "added" = the fetch order (created_at desc); "cooked" falls back to it until F9 has data.
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

  if (view.kind === "editor") {
    return (
      <>
        <RecipeEditor recipeId={view.id ?? null} saving={rw.busy} onSave={onSave} onCancel={() => setView(view.id ? { kind: "recipe", id: view.id } : { kind: "grid" })} onDelete={() => onDelete(view.id)} />
        {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
      </>
    );
  }
  if (view.kind === "recipe") {
    return (
      <>
        <RecipePage recipeId={view.id} onBack={() => setView({ kind: "grid" })} onEdit={(id) => setView({ kind: "editor", id })} onDelete={onDelete} />
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
        <button type="button" className="cb-new" onClick={() => setView({ kind: "editor", id: null })}>+ New</button>
      </div>

      {loading ? (
        <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading your cookbook…</span></div>
      ) : data.recipes.length === 0 ? (
        <div className="cb-onboard">
          <p className="cb-onboard-line">Your cookbook is empty.</p>
          <p className="cb-onboard-sub">Recipes are set in type — title, ingredients, steps, times. Macros compute from the ingredients; cooking mode runs timers for you.</p>
          <div className="cb-onboard-actions">
            <button type="button" className="cb-new" onClick={() => setView({ kind: "editor", id: null })}>+ New recipe</button>
            <button type="button" className="cb-import" disabled title="Recipe import arrives at F8">Import (soon)</button>
          </div>
        </div>
      ) : (
        <>
          {sort === "cooked" && <p className="cb-note">Cook counts appear once you’ve cooked recipes — showing most-recently-added for now.</p>}
          <div className="cb-grid">
            {sorted.map((r) => (
              <RecipeCard key={r.id} recipe={r} ingredients={data.ingredientsByRecipe[r.id]} itemsById={data.itemsById} onOpen={() => setView({ kind: "recipe", id: r.id })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
