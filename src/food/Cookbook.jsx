import { useEffect, useState } from "react";
import { fetchCookbook } from "./recipeLoad";
import { recipeKind } from "./recipeCalc";
import { setRecipeFavourite } from "./recipeWrite";
import { useRecipeWrites } from "./useRecipeWrites";
import CookbookRegister from "./CookbookRegister";
import CookMode from "./CookMode";
import RecipeEditor from "./RecipeEditor";
import ImportScreen from "./ImportScreen";
import Toast from "../kit/Toast";
import "./cookbook.css";
import "./register.css";

// Cookbook — the library orchestrator. Hosts the register (library view), recipe page,
// editor, and import views. The register handles its own sorting/filtering internally.
export default function Cookbook({ openRecipeId, cookOnOpen, stageOnOpen, onConsumeOpen, foodTabs, foodTab, onFoodTab }) {
  const [data, setData] = useState({ recipes: [], ingredientsByRecipe: {}, itemsById: {}, stepCountByRecipe: {}, cookEntries: [] });
  const [view, setView] = useState({ kind: "grid" });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const rw = useRecipeWrites();

  const load = async () => { setLoading(true); setData(await fetchCookbook()); setLoading(false); };
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  useEffect(() => { if (openRecipeId) { setView({ kind: "recipe", id: openRecipeId, cook: cookOnOpen, stage: stageOnOpen }); onConsumeOpen?.(); } }, [openRecipeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const backToGrid = () => { setView({ kind: "grid" }); if (dirty) { setDirty(false); load(); } };

  const kindOf = (r) => recipeKind({ ingredients: data.ingredientsByRecipe[r.id] || [], steps: Array(data.stepCountByRecipe?.[r.id] || 0) });
  const openRecipe = (r) => setView(kindOf(r) === "draft" ? { kind: "editor", id: r.id } : { kind: "recipe", id: r.id });
  const toggleFav = async (r) => {
    const next = !r.is_favourite;
    setData((d) => ({ ...d, recipes: d.recipes.map((x) => (x.id === r.id ? { ...x, is_favourite: next } : x)) }));
    try { await setRecipeFavourite(r.id, next); } catch { setData((d) => ({ ...d, recipes: d.recipes.map((x) => (x.id === r.id ? { ...x, is_favourite: !next } : x)) })); }
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
      <CookMode recipeId={view.id} onBack={backToGrid} onEdit={(id) => setView({ kind: "editor", id })} onDelete={onDelete} />
      {rw.toast && <Toast text={rw.toast.text} onDismiss={rw.dismiss} />}
    </>
  );

  if (loading) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading your cookbook…</span></div>;

  return (
    <CookbookRegister
      recipes={data.recipes}
      ingredientsByRecipe={data.ingredientsByRecipe}
      itemsById={data.itemsById}
      stepCountByRecipe={data.stepCountByRecipe}
      filter={filter}
      onFilter={setFilter}
      onOpenRecipe={openRecipe}
      onToggleFav={toggleFav}
      onImport={() => setView({ kind: "import" })}
      onNew={() => setView({ kind: "editor", id: null })}
      foodTabs={foodTabs}
      foodTab={foodTab}
      onFoodTab={onFoodTab}
    />
  );
}
