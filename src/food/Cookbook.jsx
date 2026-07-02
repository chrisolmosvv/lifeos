import { useEffect, useMemo, useState } from "react";
import { fetchCookbook } from "./recipeLoad";
import { lastCookedFor, recipeKind } from "./recipeCalc";
import { setRecipeFavourite } from "./recipeWrite";
import { useRecipeWrites } from "./useRecipeWrites";
import RecipeCard from "./RecipeCard";
import RecipeListRow from "./RecipeListRow";
import CookbookToolbar from "./CookbookToolbar";
import RecipePage from "./RecipePage";
import RecipeEditor from "./RecipeEditor";
import ImportScreen from "./ImportScreen";
import Toast from "../kit/Toast";
import "./cookbook.css";

// Cookbook (V2 P6) — the library orchestrator: grid⇄list (last-used persisted client pref), a
// search-icon-to-field, an All/Recipes/Meals filter (DERIVED via recipeKind — no flag), sort tabs
// (Added/Cooked/A–Z/Favourites; Cooked reads lastCookedFor from P3, Favourites reads is_favourite),
// ★ per entry, keyboard (arrows/Enter/Esc while searching). DRAFT DOOR: a GRID tap on a draft opens
// the EDITOR (finish it); a DEEP-LINK opens the PAGE. Also hosts the recipe page / editor / import views.
export default function Cookbook({ openRecipeId, cookOnOpen, onConsumeOpen }) {
  const [data, setData] = useState({ recipes: [], ingredientsByRecipe: {}, itemsById: {}, stepCountByRecipe: {}, cookEntries: [] });
  const [view, setView] = useState({ kind: "grid" });
  const [sort, setSort] = useState("added");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("cbView")) || "grid");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const rw = useRecipeWrites();

  const load = async () => { setLoading(true); setData(await fetchCookbook()); setLoading(false); };
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  // Deep-link (Log ▸ View recipe): ALWAYS the page, even a draft (per the draft-door split).
  useEffect(() => { if (openRecipeId) { setView({ kind: "recipe", id: openRecipeId, cook: cookOnOpen }); onConsumeOpen?.(); } }, [openRecipeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const backToGrid = () => { setView({ kind: "grid" }); if (dirty) { setDirty(false); load(); } };

  const kindOf = (r) => recipeKind({ ingredients: data.ingredientsByRecipe[r.id] || [], steps: Array(data.stepCountByRecipe?.[r.id] || 0) });
  const lastCookedMap = useMemo(() => {
    const m = {};
    for (const r of data.recipes) m[r.id] = lastCookedFor({ id: r.id, ingredients: data.ingredientsByRecipe[r.id] || [], steps: Array(data.stepCountByRecipe?.[r.id] || 0) }, data.cookEntries || []);
    return m;
  }, [data]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rs = data.recipes.filter((r) => {
      if (filter !== "all" && kindOf(r) !== filter) return false;
      if (q && !(r.title || "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "az") rs = [...rs].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "fav") rs = [...rs].sort((a, b) => (b.is_favourite ? 1 : 0) - (a.is_favourite ? 1 : 0));
    else if (sort === "cooked") rs = [...rs].sort((a, b) => {
      const da = lastCookedMap[a.id], db = lastCookedMap[b.id];
      if (da && db) return da < db ? 1 : da > db ? -1 : 0;
      return da ? -1 : db ? 1 : 0;
    });
    return rs; // "added" = fetch order (created_at desc)
  }, [data, filter, query, sort, lastCookedMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRecipe = (r) => setView(kindOf(r) === "draft" ? { kind: "editor", id: r.id } : { kind: "recipe", id: r.id });
  const toggleFav = async (r) => {
    const next = !r.is_favourite;
    setData((d) => ({ ...d, recipes: d.recipes.map((x) => (x.id === r.id ? { ...x, is_favourite: next } : x)) }));
    try { await setRecipeFavourite(r.id, next); } catch { setData((d) => ({ ...d, recipes: d.recipes.map((x) => (x.id === r.id ? { ...x, is_favourite: !next } : x)) })); }
  };
  const onSearchKey = (e) => {
    if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
    else if (e.key === "Enter") { const r = shown[active] || shown[0]; if (r) openRecipe(r); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(0, shown.length - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
  };

  const onSave = async (recipe, ingredients, steps) => { const res = await rw.save(view.id ?? null, recipe, ingredients, steps); if (res.ok) { await load(); setView({ kind: "recipe", id: res.id }); } };
  const onDelete = async (id) => { const res = await rw.remove(id); if (res.ok) { await load(); setView({ kind: "grid" }); } };

  if (view.kind === "import") return <ImportScreen onImported={(draft, itemsById) => setView({ kind: "editor", id: null, draft, itemsById })} onCancel={() => setView({ kind: "grid" })} />;
  if (view.kind === "editor") return (
    <>
      <RecipeEditor recipeId={view.id ?? null} initialDraft={view.draft} initialItemsById={view.itemsById} saving={rw.busy} onSave={onSave} onCancel={() => setView(view.id ? { kind: "recipe", id: view.id } : { kind: "grid" })} onDelete={() => onDelete(view.id)} />
      {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
    </>
  );
  if (view.kind === "recipe") return (
    <>
      <RecipePage recipeId={view.id} cookOnOpen={view.cook} onBack={backToGrid} onEdit={(id) => setView({ kind: "editor", id })} onDelete={onDelete} onCooked={() => setDirty(true)} />
      {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
    </>
  );

  const toggleView = () => setViewMode((v) => { const n = v === "grid" ? "list" : "grid"; try { localStorage.setItem("cbView", n); } catch { /* private mode */ } return n; });
  const cardProps = (r, i) => ({ recipe: r, kind: kindOf(r), ingredients: data.ingredientsByRecipe[r.id], itemsById: data.itemsById, favourite: !!r.is_favourite, notYetCooked: sort === "cooked" && !lastCookedMap[r.id], active: i === active, onOpen: () => openRecipe(r), onToggleFav: () => toggleFav(r) });

  return (
    <div className="cb">
      <CookbookToolbar sort={sort} onSort={setSort} filter={filter} onFilter={setFilter} viewMode={viewMode} onToggleView={toggleView}
        searchOpen={searchOpen} onToggleSearch={() => setSearchOpen(true)} query={query} onQuery={(v) => { setQuery(v); setActive(0); }} onSearchKey={onSearchKey}
        onImport={() => setView({ kind: "import" })} onNew={() => setView({ kind: "editor", id: null })} />

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
      ) : shown.length === 0 ? (
        <p className="cb-noresults">No {filter === "all" ? "recipes" : filter === "meal" ? "meals" : "recipes"}{query.trim() ? ` matching “${query.trim()}”` : ""}.</p>
      ) : viewMode === "list" ? (
        <ul className="cb-list">{shown.map((r, i) => <RecipeListRow key={r.id} {...cardProps(r, i)} />)}</ul>
      ) : (
        <div className="cb-grid">{shown.map((r, i) => <RecipeCard key={r.id} {...cardProps(r, i)} />)}</div>
      )}
    </div>
  );
}
