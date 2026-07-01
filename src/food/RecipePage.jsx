import { useEffect, useState } from "react";
import { amsTodayYMD, amsClockMinutes } from "../gym/gymDates";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros, lastCookedFor } from "./recipeCalc";
import { entryMacros, slotForHour, NUTRIENTS } from "./foodCalc";
import { fmtNum, fmtFull } from "./foodFormat";
import { useCookLog } from "./useCookLog";
import CookMode from "./CookMode";
import LogMealPanel from "./LogMealPanel";
import Toast from "../kit/Toast";
import "./cookbook.css";

// A calm "last cooked" date from a computed Amsterdam-day YMD (null → nothing shown). Noon-anchored
// parse so the label never flips a day across the timezone. (V2 P3 — was a stored timestamp.)
const cookedDate = (ymd) => (ymd ? new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);

// RecipePage — the long-form recipe (scroll is fine here). Breadcrumb (Cookbook ▸ Recipe), the
// full per-serving macro block, ingredients with their kcal + an unmatched MARK, and a SUBTLE
// "approximate" signal on the total whenever any ingredient is unestimated. A view-only servings
// stepper rescales amounts + the displayed macros LIVE (never mutates the saved recipe). 'Cook'
// enters cooking mode (a reflow); 'Log this meal' is stubbed (F9); Edit + delete (⋯, confirm).
const NUTR = [["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"], ["fibre", "Fibre"], ["sugar", "Sugar"], ["sodium", "Sodium"]];

export default function RecipePage({ recipeId, onBack, onEdit, onDelete, onCooked }) {
  const [data, setData] = useState(null);
  const [servings, setServings] = useState(1);
  const [cooking, setCooking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [staging, setStaging] = useState(false);
  const [cookEntries, setCookEntries] = useState([]); // this recipe's recipe_cook entries (compute-on-read source)
  const cl = useCookLog();

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) { setData(r); setServings(r.recipe.servings || 1); setCookEntries(r.cookEntries || []); } }).catch(() => alive && setData({ error: true }));
    return () => { alive = false; };
  }, [recipeId]);

  if (!data) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  if (data.error) return <p className="flog-error">Couldn’t load that recipe.</p>;

  const { recipe, ingredients, steps, itemsById } = data;
  const base = recipe.servings || 1;
  const macros = recipeMacros(ingredients, base, itemsById); // per-serving = canonical
  const approx = macros.unestimatedCount > 0;
  const scale = servings / base; // view-only rescale of the ingredient list
  // "Last cooked" COMPUTE-ON-READ (V2 P3): lastCookedFor = MAX(entry_date) over this recipe's
  // recipe_cook entries, gated on recipeKind==='recipe' (a stepless meal → null, never "cooked").
  const cookedLabel = cookedDate(lastCookedFor({ id: recipe.id, ingredients, steps }, cookEntries));

  // Cook mode's "Done cooking" exits AND offers to log — it opens the SAME staging panel (one panel,
  // two triggers). offerLog is true only from that button, so a bare exit wouldn't pop the panel.
  if (cooking) return <CookMode recipe={recipe} steps={steps} ingredients={ingredients} onExit={(offerLog) => { setCooking(false); if (offerLog) setStaging(true); }} />;

  // Cook→log (V2 P3): FREEZE recipeMacros.perServing × servings into the 7-number snapshot (the
  // sacred snapshot-not-live line), write it as one food_log_entries row via logSnapshot (recipe_id,
  // entry_source='recipe_cook', amount=servings, unit='serving', food_item_id null). No stamp —
  // "last cooked" is computed from cookEntries. We optimistically APPEND a lightweight cook entry so
  // the computed line updates at once; onRevert drops it on failure/undo. The real row (with its id)
  // lands on the Log tab's refetch.
  const onLogMeal = (eaten, slot) => {
    setStaging(false);
    const today = amsTodayYMD(Date.now());
    const snap = {};
    for (const k of NUTRIENTS) snap[k] = (macros.perServing[k] || 0) * eaten; // FROZEN here — never re-read
    const row = {
      entry_date: today,
      meal_slot: slot,
      food_item_id: null,
      recipe_id: recipeId,
      amount: eaten,
      unit: "serving",
      ...snap,
      entry_source: "recipe_cook",
      is_alcohol: false,
    };
    const optimistic = { recipe_id: recipeId, entry_source: "recipe_cook", entry_date: today };
    setCookEntries((cur) => [...cur, optimistic]);
    cl.logSnapshot(row, { onRevert: () => setCookEntries((cur) => cur.filter((e) => e !== optimistic)) });
    onCooked?.(); // tell the cookbook to refresh its grid (the cooked sort) on return
  };

  const ingKcal = (ing) => {
    if (ing.no_macros) return null;
    if (ing.manual_macros && Number.isFinite(ing.manual_macros.kcal)) return ing.manual_macros.kcal * scale;
    const item = ing.food_item_id ? itemsById[ing.food_item_id] : null;
    if (!item) return null;
    return entryMacros(item, (Number(ing.amount) || 0) * scale, "g").kcal;
  };
  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);

  return (
    <div className="rp">
      <nav className="rp-crumb">
        <button type="button" onClick={onBack}>Cookbook</button> <span>▸</span> <span className="rp-crumb-here">{recipe.title}</span>
      </nav>

      <div className="rp-head">
        <h1 className="rp-title">{recipe.title}</h1>
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
      <p className="rp-sub">
        {time ? `${time} min · ` : ""}{base} serving{base === 1 ? "" : "s"}
        {recipe.source_url && (
          <> · <a className="rp-source" href={recipe.source_url} target="_blank" rel="noreferrer">{(() => { try { return `from ${new URL(recipe.source_url).hostname}`; } catch { return "source"; } })()}</a></>
        )}
      </p>
      {cookedLabel && <p className="rp-cooked">Last cooked {cookedLabel}</p>}

      <div className="rp-macros">
        <div className="rp-kcal">{approx ? "~" : ""}{fmtNum("kcal", macros.perServing.kcal)} <span>kcal / serving</span></div>
        <div className="rp-macro-grid">
          {NUTR.map(([k, label]) => (
            <span key={k} className="rp-macro"><span className="rp-macro-name">{label}</span> {fmtFull(k, macros.perServing[k])}</span>
          ))}
        </div>
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

      <h3 className="rp-h">Method</h3>
      <ol className="rp-steps">
        {steps.map((s, i) => <li key={i}>{s.text}</li>)}
      </ol>

      <div className="rp-actions">
        <button type="button" className="rp-cook" onClick={() => setCooking(true)}>Cook</button>
        <button type="button" className="rp-log" onClick={() => setStaging((v) => !v)}>Log this meal</button>
        <button type="button" className="rp-edit" onClick={() => onEdit(recipeId)}>Edit</button>
      </div>

      {staging && (
        <LogMealPanel
          perServing={macros.perServing}
          unestimatedCount={macros.unestimatedCount}
          defaultSlot={slotForHour(Math.floor(amsClockMinutes(Date.now()) / 60))}
          onLog={onLogMeal}
          onClose={() => setStaging(false)}
        />
      )}
      {cl.toast && <Toast text={cl.toast.text} onUndo={cl.toast.undo} onDismiss={cl.dismiss} />}
    </div>
  );
}
