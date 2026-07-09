import { useMemo, useState } from "react";
import { recipeMacros, recipeKind } from "./recipeCalc";
import { fmtNum } from "../../spine/logic/foodFormat";

// CookbookRegister — the register-style library: a hairline-ruled list with sortable column
// headers, per-row hover invert + detail unfurl. Data from the existing fetchCookbook result.
// Props: recipes, ingredientsByRecipe, itemsById, stepCountByRecipe, filter, onOpenRecipe,
//        onToggleFav, onImport, onNew, foodTabs, foodTab, onFoodTab.

const FILTERS = [
  { id: "all", label: "All" },
  { id: "recipe", label: "Recipes" },
  { id: "meal", label: "Meals" },
  { id: "fav", label: "Favourites" },
];

const COLS = [
  { id: "title", label: "TITLE" },
  { id: "serves", label: "SERVES" },
  { id: "kcal", label: "KCAL/SERV" },
  { id: "time", label: "TIME" },
];

function sourceLabel(url) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function fmtTime(mins) {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export default function CookbookRegister({ recipes, ingredientsByRecipe, itemsById, stepCountByRecipe, filter, onFilter, onOpenRecipe, onToggleFav, onImport, onNew, foodTabs, foodTab, onFoodTab }) {
  const [sortCol, setSortCol] = useState("added");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (col) => {
    if (col === sortCol) setSortAsc((a) => !a);
    else { setSortCol(col); setSortAsc(col === "title"); } // title defaults A→Z, others default desc
  };

  const kindOf = (r) => recipeKind({ ingredients: ingredientsByRecipe[r.id] || [], steps: Array(stepCountByRecipe?.[r.id] || 0) });

  const enriched = useMemo(() => recipes.map((r) => {
    const ings = ingredientsByRecipe[r.id] || [];
    const base = r.servings || 1;
    const m = recipeMacros(ings, base, itemsById || {});
    const time = (r.prep_minutes || 0) + (r.cook_minutes || 0);
    return { ...r, kind: kindOf(r), kcalPerServ: m.perServing.kcal, approx: m.unestimatedCount > 0, time, ingCount: ings.length, source: sourceLabel(r.source_url) };
  }), [recipes, ingredientsByRecipe, itemsById, stepCountByRecipe]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let rs = enriched;
    if (filter === "recipe") rs = rs.filter((r) => r.kind === "recipe");
    else if (filter === "meal") rs = rs.filter((r) => r.kind === "meal");
    else if (filter === "fav") rs = rs.filter((r) => r.is_favourite);
    return rs;
  }, [enriched, filter]);

  const sorted = useMemo(() => {
    if (sortCol === "added") return sortAsc ? [...filtered].reverse() : filtered;
    const cmp = (a, b) => {
      let va, vb;
      if (sortCol === "title") { va = (a.title || "").toLowerCase(); vb = (b.title || "").toLowerCase(); return va < vb ? -1 : va > vb ? 1 : 0; }
      if (sortCol === "serves") { va = a.servings || 0; vb = b.servings || 0; }
      else if (sortCol === "kcal") { va = a.kcalPerServ ?? 0; vb = b.kcalPerServ ?? 0; }
      else if (sortCol === "time") { va = a.time || 0; vb = b.time || 0; }
      else { va = 0; vb = 0; }
      return va - vb;
    };
    const s = [...filtered].sort(cmp);
    return sortAsc ? s : s.reverse();
  }, [filtered, sortCol, sortAsc]);

  const empty = recipes.length === 0;
  const noMatch = !empty && sorted.length === 0;

  return (
    <div className="creg">
      {/* Masthead */}
      <div className="creg-mast">
        <div className="creg-mast-left">
          <h1 className="creg-title">The Cookbook</h1>
          <span className="creg-count">{recipes.length} {recipes.length === 1 ? "RECIPE" : "RECIPES"}</span>
        </div>
        <div className="creg-mast-right">
          {foodTabs && foodTabs.map((t) => (
            <button key={t.id} type="button" className={t.id === foodTab ? "creg-nav is-active" : "creg-nav"} onClick={() => onFoodTab(t.id)}>
              {t.label}
            </button>
          ))}
          <button type="button" className="creg-btn" onClick={onImport}>IMPORT</button>
          <button type="button" className="creg-btn" onClick={onNew}>+ NEW</button>
        </div>
      </div>

      {/* Filters */}
      <div className="creg-filters">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={f.id === filter ? "creg-filter is-on" : "creg-filter"} onClick={() => onFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="creg-empty">
          <p className="creg-empty-line">No recipes yet.</p>
          <div className="creg-empty-actions">
            <button type="button" className="creg-btn" onClick={onImport}>IMPORT</button>
            <button type="button" className="creg-btn" onClick={onNew}>+ NEW</button>
          </div>
        </div>
      ) : noMatch ? (
        <p className="creg-noresults">No matches for this filter.</p>
      ) : (
        <div className="creg-table">
          {/* Column headers */}
          <div className="creg-thead">
            {COLS.map((col) => (
              <button key={col.id} type="button" className={`creg-th${col.id === "title" ? " creg-th--title" : ""}${sortCol === col.id ? " is-sorted" : ""}`}
                onClick={() => toggleSort(col.id)}>
                {col.label}{sortCol === col.id ? (sortAsc ? " ↑" : " ↓") : ""}
              </button>
            ))}
          </div>

          {/* Rows */}
          {sorted.map((r) => (
            <RegisterRow key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} onToggleFav={() => onToggleFav(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RegisterRow({ recipe, onOpen, onToggleFav }) {
  const r = recipe;
  const detailParts = [
    r.source?.toUpperCase(),
    r.time ? `${fmtTime(r.time)} TO TABLE` : null,
    r.ingCount > 0 ? `${r.ingCount} INGREDIENT${r.ingCount === 1 ? "" : "S"}` : null,
  ].filter(Boolean);

  return (
    <div className="creg-row" onClick={onOpen}>
      <button type="button" className={r.is_favourite ? "creg-star is-on" : "creg-star"}
        aria-label="Toggle favourite" onClick={(e) => { e.stopPropagation(); onToggleFav(); }}>
        {r.is_favourite ? "★" : "☆"}
      </button>
      <div className="creg-cell creg-cell--title">
        <span className="creg-row-title">{r.title || "Untitled"}</span>
        <span className="creg-row-detail">
          {detailParts.length > 0 ? detailParts.join(" · ") : ""}
        </span>
      </div>
      <span className="creg-cell creg-cell--num">{r.servings || "—"}</span>
      <span className="creg-cell creg-cell--num">{r.kcalPerServ != null ? `${r.approx ? "~" : ""}${fmtNum("kcal", r.kcalPerServ)}` : "—"}</span>
      <span className="creg-cell creg-cell--num">{r.time ? fmtTime(r.time) : "—"}</span>
    </div>
  );
}
