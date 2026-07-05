import { useEffect, useRef, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import { recipeMacros } from "./recipeCalc";
import { slotForHour, NUTRIENTS } from "./foodCalc";
import { fmtNum } from "./foodFormat";
import { setRecipeFavourite } from "./recipeWrite";
import { amsTodayYMD, amsClockMinutes } from "../gym/gymDates";
import { useCookLog } from "./useCookLog";
import { useCookEvents } from "./useCookEvents";
import { useWakeLock } from "./useWakeLock";
import { fmtClock } from "./cookTimers";
import LogMealSheet from "./LogMealSheet";
import Toast from "../kit/Toast";
import "./cookMode2.css";

// CookMode — the UNIFIED recipe page. Shows the recipe (method + ingredients), IS the live
// cooking companion, and carries the reading page's controls (title, serves, star, Log, edit,
// provenance). Opens in a neutral "reading" state; cooking lazy-starts on the first action.
// Built on the proven event-replay engine.

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function ingLabel(ing, itemsById) {
  const raw = (ing.raw_text || "").trim();
  const itemName = ing.food_item_id && itemsById?.[ing.food_item_id]?.name;
  if (raw.length > 6 && /[a-zA-Z]{3,}/.test(raw)) return raw;
  if (itemName) return raw ? `${raw} ${itemName}` : itemName;
  return raw || "ingredient";
}

function sourceLabel(url) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

export default function CookMode({ recipeId, onBack, onEdit, onDelete }) {
  // Load recipe data (self-contained — no longer needs props from RecipePage)
  const [data, setData] = useState(null);
  const [fav, setFav] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [staging, setStaging] = useState(null);
  const cl = useCookLog();

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) { setData(r); setFav(!!r.recipe.is_favourite); } }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  const cook = useCookEvents(recipeId);
  useWakeLock(cook.hasSession);
  const currentRef = useRef(null);

  // Derive state from loaded data — safe defaults when data hasn't arrived yet
  const recipe = data?.recipe;
  const stepList = data?.steps || [];
  const ingList = data?.ingredients || [];
  const items = data?.itemsById || {};

  const { stepStates, tickedIngredients, timers, finished } = cook.state;
  const isCooking = cook.hasSession && !finished;

  const statusOf = (i) => stepStates[String(i)] || "waiting";
  const currentIdx = stepList.findIndex((_, i) => statusOf(i) !== "done");
  const current = currentIdx >= 0 ? currentIdx : stepList.length;
  const tickedCount = ingList.filter((_, i) => tickedIngredients.has(String(i))).length;
  const timerFor = (i) => timers.find((t) => t.targetRef === String(i));
  const ingsForStep = (stepIdx) => {
    const matched = [];
    ingList.forEach((ing, i) => { if (ing.step_position === stepIdx) matched.push({ ing, idx: i }); });
    return matched;
  };

  // Auto-scroll current step into view — hook must be above the early return
  useEffect(() => {
    if (currentRef.current && cook.hasSession) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [current, cook.hasSession]);

  // Loading gate — all hooks are above this line
  if (!data || !cook.ready) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;

  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const source = sourceLabel(recipe.source_url);
  const base = recipe.servings || 1;
  const macros = recipeMacros(ingList, base, items);

  const handleMarkDone = (i) => cook.markStep(i, "done");
  const handleGoBack = () => { if (current > 0) cook.markStep(current - 1, "waiting"); };
  const handleFinish = () => cook.finish();
  const toggleFav = () => { const next = !fav; setFav(next); setRecipeFavourite(recipe.id, next).catch(() => setFav(!next)); };

  const onLogMeal = (eaten, slot) => {
    setStaging(null);
    const today = amsTodayYMD(Date.now());
    const snap = {};
    for (const k of NUTRIENTS) snap[k] = (macros.perServing[k] || 0) * eaten;
    cl.logSnapshot({ entry_date: today, meal_slot: slot, food_item_id: null, recipe_id: recipeId, amount: eaten, unit: "serving", ...snap, entry_source: "recipe_cook", is_alcohol: false }, {});
  };

  // Dateline: serves · time · source
  const dateParts = [];
  if (base) dateParts.push(`Serves ${base}`);
  if (time) dateParts.push(`${time} min`);
  if (source) dateParts.push(`from ${source}`);
  const dateline = dateParts.join(" · ");

  return (
    <div className="cm2">
      {/* ── Unified masthead ──────────────────────────────────────────────── */}
      <div className="cm2-mast">
        <div className="cm2-mast-left">
          <button type="button" className="cm2-back" onClick={onBack}>‹ Cookbook</button>
        </div>
        <div className="cm2-mast-right">
          {isCooking && (
            <>
              <span className="cm2-live-dot">●</span>
              <span className="cm2-live-label">COOKING</span>
              <span className="cm2-step-of">STEP {Math.min(current + 1, stepList.length)} OF {stepList.length}</span>
              <button type="button" className="cm2-finish-btn" onClick={handleFinish}>Finish</button>
            </>
          )}
          <button type="button" className={fav ? "cm2-fav is-on" : "cm2-fav"} onClick={toggleFav}>{fav ? "★" : "☆"}</button>
          <button type="button" className="cm2-act" onClick={() => setStaging("log")}>Log</button>
          <div className="cm2-menu-wrap">
            <button type="button" className="cm2-act" onClick={() => setMenu((m) => !m)}>⋯</button>
            {menu && (
              <div className="cm2-menu">
                <button type="button" onClick={() => { setMenu(false); onEdit(recipeId); }}>Edit</button>
                {confirmDel ? (
                  <span className="cm2-confirm">Delete? <button type="button" className="cm2-danger" onClick={() => { setMenu(false); onDelete(recipeId); }}>Yes</button></span>
                ) : (
                  <button type="button" className="cm2-danger" onClick={() => setConfirmDel(true)}>Delete</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Title + dateline ──────────────────────────────────────────────── */}
      <div className="cm2-title-row">
        <h1 className="cm2-title">{recipe.title}</h1>
        {dateline && <p className="cm2-dateline">{dateline}</p>}
        {finished && <p className="cm2-finished-note">Cook finished</p>}
      </div>

      {/* ── Main area: method + ingredients ───────────────────────────────── */}
      <div className="cm2-body">
        <div className="cm2-method">
          {stepList.map((s, i) => {
            const isCurrent = i === current && !finished;
            const isDone = statusOf(i) === "done";
            const isUpcoming = i > current || finished;
            const dur = s.timer_seconds;
            const t = timerFor(i);
            const tagLabel = s.tag ? TAG_LABEL[s.tag] : null;
            const stepIngs = ingsForStep(i);

            return (
              <div key={i} ref={isCurrent ? currentRef : null}
                className={`cm2-step${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}${isUpcoming ? " is-upcoming" : ""}`}>
                <div className="cm2-step-head">
                  <span className="cm2-step-num">{i + 1}</span>
                  <div className="cm2-step-meta">
                    {tagLabel && <span className="cm2-step-tag">{tagLabel}</span>}
                    {dur && <span className="cm2-step-dur">{fmtDur(dur)}</span>}
                    {isDone && <span className="cm2-step-done-mark">Done</span>}
                    {t && !t.done && <span className="cm2-step-inline-timer">{fmtClock(t.remaining)}</span>}
                    {t && t.done && <span className="cm2-step-timer-done">Timer done</span>}
                  </div>
                </div>
                <p className="cm2-step-text">{s.text}</p>

                {isCurrent && stepIngs.length > 0 && (
                  <div className="cm2-step-ings">
                    {stepIngs.map(({ ing, idx }) => (
                      <span key={idx} className="cm2-step-ing">{ingLabel(ing, items)}</span>
                    ))}
                  </div>
                )}

                {isCurrent && (
                  <div className="cm2-step-actions">
                    {current > 0 && <button type="button" className="cm2-go-back" onClick={handleGoBack}>‹ Back</button>}
                    {dur && !t && (
                      <button type="button" className="cm2-start-timer" onClick={() => cook.startTimer(i, dur)}>
                        START {fmtDur(dur)} TIMER
                      </button>
                    )}
                    <button type="button" className="cm2-mark-done" onClick={() => handleMarkDone(i)}>MARK DONE →</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="cm2-ings">
          <div className="cm2-ings-head">
            <span className="cm2-ings-title">INGREDIENTS</span>
            <span className="cm2-ings-count">{tickedCount} of {ingList.length}</span>
          </div>
          <ul className="cm2-ings-list">
            {ingList.map((ing, i) => {
              const ticked = tickedIngredients.has(String(i));
              const highlight = !finished && ing.step_position === current;
              return (
                <li key={i} className={`cm2-ing${ticked ? " is-ticked" : ""}${highlight ? " is-highlight" : ""}`}>
                  <button type="button" className="cm2-ing-btn" onClick={() => cook.tickIngredient(i)}>
                    <span className="cm2-ing-check">{ticked ? "■" : "□"}</span>
                    <span className="cm2-ing-text">{ingLabel(ing, items)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Timer strip */}
      {timers.length > 0 && (
        <div className="cm2-timers">
          {timers.map((t) => {
            const stepNum = parseInt(t.targetRef, 10);
            const stepName = stepList[stepNum]?.text?.split(/\s+/).slice(0, 4).join(" ") || "";
            return (
              <div key={t.targetRef} className={t.done ? "cm2-chip is-done" : "cm2-chip"}>
                <span className="cm2-chip-label">STEP {stepNum + 1} · {stepName}</span>
                <span className="cm2-chip-time">{t.done ? "done" : fmtClock(t.remaining)}</span>
                {!t.done && <button type="button" className="cm2-chip-stop" onClick={() => cook.stopTimer(stepNum)}>STOP</button>}
              </div>
            );
          })}
        </div>
      )}

      {/* Log meal sheet */}
      {staging && (
        <LogMealSheet perServing={macros.perServing} unestimatedCount={macros.unestimatedCount}
          defaultSlot={slotForHour(Math.floor(amsClockMinutes(Date.now()) / 60))}
          onLog={onLogMeal} onClose={() => setStaging(null)} />
      )}
      {cl.toast && <Toast text={cl.toast.text} onUndo={cl.toast.undo} onDismiss={cl.dismiss} />}
    </div>
  );
}
