import { useEffect, useState } from "react";
import { amsTodayYMD, amsClockMinutes } from "../gym/gymDates";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros, lastCookedFor, recipeKind } from "./recipeCalc";
import { entryMacros, slotForHour, NUTRIENTS } from "./foodCalc";
import { fmtNum, fmtFull } from "./foodFormat";
import { setRecipeFavourite } from "./recipeWrite";
import { useCookLog } from "./useCookLog";
import CookPage from "./CookPage";
import LogMealPanel from "./LogMealPanel";
import RecipeActionBar from "./RecipeActionBar";
import Toast from "../kit/Toast";
import "./cookbook.css";

// RecipePage (V2 P6) — zero-scroll via COLLAPSE-BY-DEFAULT: steps read as titles (expand on tap), the
// macro block is compact (kcal/serving + P/C/F lead; fibre/sugar/sodium behind a tap). recipeMacros
// still returns all six — DISPLAY-only, unforked. A fixed TYPE-AWARE action bar (recipeKind): a meal
// hides Cook + leads Log; a draft shows Edit only + a ready-to-finish invitation (deep-link path). ★
// on the header. Cook mode + the cook→log snapshot (P3, sacred freeze) are unchanged.
const cookedDate = (ymd) => (ymd ? new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);
const LEAD = [["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]];
const MORE = [["fibre", "Fibre"], ["sugar", "Sugar"], ["sodium", "Sodium"]];

export default function RecipePage({ recipeId, onBack, onEdit, onDelete, onCooked }) {
  const [data, setData] = useState(null);
  const [servings, setServings] = useState(1);
  const [cooking, setCooking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [staging, setStaging] = useState(false);
  const [macMore, setMacMore] = useState(false);
  const [openSteps, setOpenSteps] = useState({});
  const [fav, setFav] = useState(false);
  const [cookEntries, setCookEntries] = useState([]);
  const cl = useCookLog();

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) { setData(r); setServings(r.recipe.servings || 1); setCookEntries(r.cookEntries || []); setFav(!!r.recipe.is_favourite); } }).catch(() => alive && setData({ error: true }));
    return () => { alive = false; };
  }, [recipeId]);

  if (!data) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  if (data.error) return <p className="flog-error">Couldn’t load that recipe.</p>;

  const { recipe, ingredients, steps, itemsById } = data;
  const kind = recipeKind({ ingredients, steps });
  const base = recipe.servings || 1;
  const macros = recipeMacros(ingredients, base, itemsById);
  const approx = macros.unestimatedCount > 0;
  const scale = servings / base;
  const cookedLabel = cookedDate(lastCookedFor({ id: recipe.id, ingredients, steps }, cookEntries));
  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);

  if (cooking) return <CookPage recipe={recipe} steps={steps} ingredients={ingredients} onExit={(offerLog) => { setCooking(false); if (offerLog) setStaging(true); }} />;

  const toggleFav = () => { const next = !fav; setFav(next); setRecipeFavourite(recipe.id, next).catch(() => setFav(!next)); };

  const onLogMeal = (eaten, slot) => {
    setStaging(false);
    const today = amsTodayYMD(Date.now());
    const snap = {};
    for (const k of NUTRIENTS) snap[k] = (macros.perServing[k] || 0) * eaten; // FROZEN here — never re-read
    const row = { entry_date: today, meal_slot: slot, food_item_id: null, recipe_id: recipeId, amount: eaten, unit: "serving", ...snap, entry_source: "recipe_cook", is_alcohol: false };
    const optimistic = { recipe_id: recipeId, entry_source: "recipe_cook", entry_date: today };
    setCookEntries((cur) => [...cur, optimistic]);
    cl.logSnapshot(row, { onRevert: () => setCookEntries((cur) => cur.filter((e) => e !== optimistic)) });
    onCooked?.();
  };

  const ingKcal = (ing) => {
    if (ing.no_macros) return null;
    if (ing.manual_macros && Number.isFinite(ing.manual_macros.kcal)) return ing.manual_macros.kcal * scale;
    const item = ing.food_item_id ? itemsById[ing.food_item_id] : null;
    return item ? entryMacros(item, (Number(ing.amount) || 0) * scale, "g").kcal : null;
  };

  const header = (
    <>
      <nav className="rp-crumb"><button type="button" onClick={onBack}>Cookbook</button> <span>▸</span> <span className="rp-crumb-here">{recipe.title}</span></nav>
      <div className="rp-head">
        <h1 className="rp-title">{recipe.title}{kind === "meal" && <span className="rp-kind"> · meal</span>}</h1>
        <button type="button" className={fav ? "rp-fav is-on" : "rp-fav"} aria-label="Toggle favourite" onClick={toggleFav}>{fav ? "★" : "☆"}</button>
        <div className="rp-menu-wrap">
          <button type="button" className="rp-menu-btn" aria-label="More" onClick={() => setMenu((m) => !m)}>⋯</button>
          {menu && (
            <div className="rp-menu">
              <button type="button" onClick={() => { setMenu(false); onEdit(recipeId); }}>Edit</button>
              {confirmDel ? (
                <span className="rp-confirm">Delete? <button type="button" className="rp-danger" onClick={() => onDelete(recipeId)}>Yes</button></span>
              ) : (
                <button type="button" className="rp-danger" onClick={() => setConfirmDel(true)}>Delete</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (kind === "draft") {
    return (
      <div className="rp">
        {header}
        <p className="rp-draft-invite">This recipe is a draft — add ingredients and steps to finish it.</p>
        <RecipeActionBar kind={kind} onEdit={() => onEdit(recipeId)} />
      </div>
    );
  }

  return (
    <div className="rp">
      {header}
      <p className="rp-sub">
        {time ? `${time} min · ` : ""}{base} serving{base === 1 ? "" : "s"}
        {recipe.source_url && (<> · <a className="rp-source" href={recipe.source_url} target="_blank" rel="noreferrer">{(() => { try { return `from ${new URL(recipe.source_url).hostname}`; } catch { return "source"; } })()}</a></>)}
      </p>
      {cookedLabel && <p className="rp-cooked">Last cooked {cookedLabel}</p>}

      <div className="rp-macros">
        <div className="rp-kcal">{approx ? "~" : ""}{fmtNum("kcal", macros.perServing.kcal)} <span>kcal / serving</span></div>
        <div className="rp-macro-grid">
          {LEAD.map(([k, label]) => <span key={k} className="rp-macro"><span className="rp-macro-name">{label}</span> {fmtFull(k, macros.perServing[k])}</span>)}
          {macMore && MORE.map(([k, label]) => <span key={k} className="rp-macro"><span className="rp-macro-name">{label}</span> {fmtFull(k, macros.perServing[k])}</span>)}
        </div>
        <button type="button" className="rp-macro-more" onClick={() => setMacMore((v) => !v)}>{macMore ? "less" : "more"}</button>
        {approx && <p className="rp-approx">~ approximate — {macros.unestimatedCount} ingredient{macros.unestimatedCount === 1 ? "" : "s"} unestimated</p>}
      </div>

      <div className="rp-serv">
        <span>Make</span>
        <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer">−</button>
        <span className="rp-serv-n">{servings}</span>
        <button type="button" onClick={() => setServings((s) => s + 1)} aria-label="More">+</button>
        <span>serving{servings === 1 ? "" : "s"}</span>
      </div>

      <h3 className="rp-h">Ingredients</h3>
      <ul className="rp-ings">
        {ingredients.map((ing, i) => {
          const k = ingKcal(ing);
          const unmatched = ing.no_macros || (!ing.food_item_id && !ing.manual_macros);
          const amt = ing.amount != null ? `${Math.round(Number(ing.amount) * scale)} g` : (ing.raw_text || "");
          return (
            <li key={i} className="rp-ing">
              <span className="rp-ing-text">{ing.raw_text || "ingredient"}{ing.amount != null && ing.raw_text !== amt ? <span className="rp-ing-amt"> · {amt}</span> : null}{unmatched ? <span className="rp-ing-mark"> · unestimated</span> : null}</span>
              <span className="rp-ing-kcal">{k != null ? `${Math.round(k)} kcal` : "—"}</span>
            </li>
          );
        })}
      </ul>

      {kind === "recipe" && (
        <>
          <h3 className="rp-h">Method</h3>
          <ol className="rp-steps">
            {steps.map((s, i) => (
              <li key={i} className={openSteps[i] ? "rp-step is-open" : "rp-step"}>
                <button type="button" className="rp-step-btn" onClick={() => setOpenSteps((o) => ({ ...o, [i]: !o[i] }))}>
                  <span className="rp-step-n">{i + 1}</span>
                  <span className="rp-step-text">{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      <RecipeActionBar kind={kind} onCook={() => setCooking(true)} onLog={() => setStaging((v) => !v)} onEdit={() => onEdit(recipeId)} />

      {staging && (
        <LogMealPanel perServing={macros.perServing} unestimatedCount={macros.unestimatedCount} defaultSlot={slotForHour(Math.floor(amsClockMinutes(Date.now()) / 60))} onLog={onLogMeal} onClose={() => setStaging(false)} />
      )}
      {cl.toast && <Toast text={cl.toast.text} onUndo={cl.toast.undo} onDismiss={cl.dismiss} />}
    </div>
  );
}
