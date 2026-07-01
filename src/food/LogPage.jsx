import { useEffect, useMemo, useState } from "react";
import { amsTodayYMD, amsClockMinutes, shiftYMD, humanDayLong, humanDayShort } from "../gym/gymDates";
import { fetchGoals } from "../health/healthLoad";
import { resolveGoals } from "../health/healthGoals";
import { useGoalWrites } from "../health/useGoalWrites";
import { dailyTotals, recentMealsFrom, entryMacros, slotForHour, NUTRIENTS } from "./foodCalc";
import { recipeMacros } from "./recipeCalc";
import { fetchEntries, fetchNames, fetchMyFoods } from "./foodLoad";
import { fetchCookbook } from "./recipeLoad";
import { cacheFoodOnLog, insertManualFood, setFavourite } from "./foodWrite";
import { setRecipeFavourite } from "./recipeWrite";
import { useFoodWrites } from "./useFoodWrites";
import { useRecipeWrites } from "./useRecipeWrites";
import LoggerMasthead from "./LoggerMasthead";
import DayView from "./DayView";
import WeekMonthView from "./WeekMonthView";
import Finder from "./finder/Finder";
import { loggerFinderConfig } from "./finder/finderConfig";
import EditEntryPanel from "./EditEntryPanel";
import EstimateMealPanel from "./EstimateMealPanel";
import LogMealSheet from "./LogMealSheet";
import NutritionGoalsEditor from "./NutritionGoalsEditor";
import Toast from "../kit/Toast";
import "./foodLog.css";
import "./foodLogResponsive.css";

const START = "2026-01-01";
const RANGES = [{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }];
const RANGE_DAYS = { week: 7, month: 30 };
const GOAL_TYPES = ["calories", "protein", "carbs", "fat"];
const snap7 = (m) => ({ kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, fibre: m.fibre, sugar: m.sugar, sodium: m.sodium });

export default function LogPage({ onOpenRecipe }) {
  const [range, setRange] = useState("day");
  const [date, setDate] = useState(null);
  const [state, setState] = useState({ loading: true });
  const [goalMap, setGoalMap] = useState(new Map());
  const [entries, setEntries] = useState([]);
  const [myFoods, setMyFoods] = useState([]);
  const [cookbook, setCookbook] = useState({ recipes: [], ingredientsByRecipe: {}, itemsById: {} }); // for quick-add meals + re-log macros
  const [addModal, setAddModal] = useState(null); // { slot, preset?, swapEntry?, title? }
  const [editing, setEditing] = useState(null); //   the entry being edited
  const [estimate, setEstimate] = useState(null); // { slot } — Feature-B estimate panel open
  const [mealSheet, setMealSheet] = useState(null); // { item } — the P8 quick-add long-press staging sheet
  const [goalOpen, setGoalOpen] = useState(false);
  const fw = useFoodWrites(entries, setEntries);
  const gw = useGoalWrites(goalMap, setGoalMap);
  const rw = useRecipeWrites();

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, rows, foods, cb] = await Promise.all([fetchGoals(), fetchEntries(START, today), fetchMyFoods(), fetchCookbook()]);
      const itemIds = [...new Set(rows.filter((e) => e.food_item_id).map((e) => e.food_item_id))];
      const recipeIds = [...new Set(rows.filter((e) => e.recipe_id).map((e) => e.recipe_id))];
      const names = await fetchNames(itemIds, recipeIds);
      if (alive) {
        setGoalMap(resolveGoals(goals));
        setDate(today);
        setEntries(rows);
        setMyFoods(foods);
        setCookbook(cb);
        setState({ loading: false, now, today, names });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => { alive = false; };
  }, []);

  const daily = useMemo(() => dailyTotals(entries), [entries]);
  const favSet = useMemo(() => new Set(myFoods.filter((f) => f.is_favourite).map((f) => f.id)), [myFoods]);
  // Quick-add = recent MEALS + favourited MEALS + favourited FOODS (meals-first; NEVER recent foods).
  // Meal items carry per-serving macros so a one-tap re-log can freeze the snapshot. (V2 P5, decision-3.)
  const quickItems = useMemo(() => {
    const byId = Object.fromEntries(cookbook.recipes.map((r) => [r.id, r]));
    const mealItem = (r, fav) => ({ type: "meal", recipe: r, favourite: !!fav, perServing: recipeMacros(cookbook.ingredientsByRecipe[r.id] || [], r.servings || 1, cookbook.itemsById).perServing });
    const seen = new Set();
    const meals = [];
    for (const id of recentMealsFrom(entries)) { const r = byId[id]; if (r && !seen.has(id)) { seen.add(id); meals.push(mealItem(r, r.is_favourite)); } }
    for (const r of cookbook.recipes) { if (r.is_favourite && !seen.has(r.id)) { seen.add(r.id); meals.push(mealItem(r, true)); } }
    const favFoods = myFoods.filter((f) => f.is_favourite).map((row) => ({ type: "food", row }));
    return [...meals, ...favFoods].slice(0, 12);
  }, [cookbook, entries, myFoods]);

  if (state.loading) {
    return (<div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading your food log…</span></div>);
  }
  if (state.error) return <p className="flog-error">Couldn’t load your food log. {state.error}</p>;

  const step = range === "day" ? 1 : RANGE_DAYS[range];
  const atToday = date >= state.today;
  const go = (dir) => {
    const next = shiftYMD(date, dir * step);
    if (dir > 0 && next > state.today) return;
    if (next < START) return;
    setDate(next);
  };
  const dateLabel = range === "day" ? humanDayLong(date) : `${humanDayShort(shiftYMD(date, -(step - 1)))} – ${humanDayShort(date)}`;
  const nameFor = (e) => state.names?.itemById?.[e?.food_item_id]?.name || state.names?.recipeById?.[e?.recipe_id] || "Food";

  const openAdd = (slot) => setAddModal({ slot: slot || slotForHour(Math.floor(amsClockMinutes(state.now) / 60)) });
  const openQuickAdd = (food) => setAddModal({ preset: food, slot: slotForHour(Math.floor(amsClockMinutes(state.now) / 60)) });

  // One-tap re-log a MEAL (V2 P5): freeze the meal's per-serving snapshot into a recipe_cook entry
  // (1 serving) via the optimistic add (a logEntry wrapper — the logger's equivalent of logSnapshot;
  // appears in the ledger + undo). Never re-reads the recipe after this — the snapshot is frozen here.
  const onRelogMeal = (item, servings = 1, slot) => {
    const s = slot || slotForHour(Math.floor(amsClockMinutes(state.now) / 60));
    const snap = {};
    for (const k of NUTRIENTS) snap[k] = (item.perServing?.[k] || 0) * servings; // FROZEN here — logSnapshot's sibling path
    fw.addEntry({ entry_date: date, meal_slot: s, food_item_id: null, recipe_id: item.recipe.id, amount: servings, unit: "serving", ...snap, entry_source: "recipe_cook", is_estimated: false, entry_label: null, is_alcohol: false });
  };

  // Resolve a food candidate → its food_items row (cache OFF/USDA, insert manual, or reuse).
  async function resolveFood(food) {
    if (food.food_item_id) return { id: food.food_item_id, name: food.name, brand: food.brand ?? null, source: food.source, source_ref: food.source_ref ?? null, serving_grams: food.serving?.grams ?? null, serving_label: food.serving?.label ?? null, ...food.per100g, is_favourite: favSet.has(food.food_item_id) };
    return food.source === "manual" ? await insertManualFood(food) : await cacheFoodOnLog(food);
  }
  const mergeFood = (row) => {
    setState((s) => ({ ...s, names: { ...s.names, itemById: { ...s.names.itemById, [row.id]: { name: row.name, brand: row.brand ?? null } } } }));
    setMyFoods((ms) => (ms.some((f) => f.id === row.id) ? ms.map((f) => (f.id === row.id ? { ...f, ...row } : f)) : [{ ...row }, ...ms]));
  };

  // Pick + amount → resolve the food, build the snapshot, then add (or swap the existing row).
  const onLog = async (food, amount, unit, slot) => {
    const swap = addModal?.swapEntry;
    setAddModal(null);
    let row;
    try { row = await resolveFood(food); } catch { fw.fail("Couldn’t save — try again."); return; }
    mergeFood(row);
    const s = snap7(entryMacros(food, amount, unit));
    if (swap) fw.editEntry(swap.id, { amount, unit, food_item_id: row.id, meal_slot: slot, ...s });
    else fw.addEntry({ entry_date: date, meal_slot: slot, food_item_id: row.id, recipe_id: null, amount, unit, ...s, entry_source: food.source === "manual" ? "manual" : "search", is_alcohol: false });
  };

  const toggleFav = async (id) => {
    const next = !favSet.has(id);
    setMyFoods((ms) => ms.map((f) => (f.id === id ? { ...f, is_favourite: next } : f)));
    try { await setFavourite(id, next); } catch { setMyFoods((ms) => ms.map((f) => (f.id === id ? { ...f, is_favourite: !next } : f))); fw.fail("Couldn’t update favourite."); }
  };

  // Save-as-meal (Feature A): the ticked FOOD entries → a STEPLESS recipe (a meal) via the reused
  // recipe-create path. Does NOT log. ★ via setRecipeFavourite. Its macros derive from ingredients.
  const onSaveMeal = async (selEntries, name, fav) => {
    const ingredients = selEntries.map((e) => ({
      food_item_id: e.food_item_id,
      raw_text: state.names?.itemById?.[e.food_item_id]?.name || null,
      amount: e.amount, unit: e.unit, manual_macros: null, no_macros: false,
    }));
    const res = await rw.save(null, { title: name, servings: 1, prep_minutes: null, cook_minutes: null, source_url: null }, ingredients, []);
    if (res.ok && fav) { try { await setRecipeFavourite(res.id, true); } catch { /* failure surfaces via rw.toast */ } }
  };

  const submitGoals = (setList, clearList) => {
    if (setList.length) gw.submitGoals(setList);
    if (clearList.length) gw.clearGoals(clearList);
    setGoalOpen(false);
  };

  return (
    <div className="flog">
      <LoggerMasthead ranges={RANGES} range={range} onRange={setRange} dateLabel={dateLabel}
        isToday={range === "day" && date === state.today} atToday={atToday} onPrev={() => go(-1)} onNext={() => go(1)} />

      {range === "day" ? (
        <DayView entries={entries} goalMap={goalMap} day={date} names={state.names} quickItems={quickItems} favSet={favSet}
          onAdd={openAdd} onQuickAdd={openQuickAdd} onRelogMeal={onRelogMeal} onLongPressMeal={(item) => setMealSheet({ item })} onEditEntry={setEditing} onToggleFav={toggleFav} onOpenRecipe={onOpenRecipe}
          onOpenGoals={() => setGoalOpen(true)} onSaveMeal={onSaveMeal} />
      ) : (
        <WeekMonthView daily={daily} days={step} end={date} goalMap={goalMap} today={state.today} onDrillDay={(ymd) => { setRange("day"); setDate(ymd); }} />
      )}

      {addModal && (
        <Finder finderConfig={loggerFinderConfig} defaultSlot={addModal.slot} presetFood={addModal.preset} title={addModal.title}
          onResolve={(food, d) => onLog(food, d.amount, d.unit, d.slot)}
          onEstimate={() => { const slot = addModal.slot; setAddModal(null); setEstimate({ slot }); }}
          onClose={() => setAddModal(null)} />
      )}
      {estimate && (
        <EstimateMealPanel defaultSlot={estimate.slot}
          onLog={(snap, slot, label) => { setEstimate(null); fw.addEntry({ entry_date: date, meal_slot: slot, food_item_id: null, recipe_id: null, amount: 1, unit: "serving", kcal: snap.kcal, protein: snap.protein, carbs: snap.carbs, fat: snap.fat, fibre: null, sugar: null, sodium: null, entry_source: "manual", is_estimated: true, entry_label: label || null, is_alcohol: false }); }}
          onClose={() => setEstimate(null)} />
      )}
      {mealSheet && (
        <LogMealSheet perServing={mealSheet.item.perServing} unestimatedCount={0}
          defaultSlot={slotForHour(Math.floor(amsClockMinutes(state.now) / 60))}
          onLog={(servings, slot) => { onRelogMeal(mealSheet.item, servings, slot); setMealSheet(null); }}
          onClose={() => setMealSheet(null)} />
      )}
      {editing && (
        <EditEntryPanel entry={editing} name={nameFor(editing)} onApply={(patch) => { fw.editEntry(editing.id, patch); setEditing(null); }}
          onRemove={() => { fw.deleteEntry(editing); setEditing(null); }}
          onSwap={() => { const e = editing; setEditing(null); setAddModal({ swapEntry: e, slot: e.meal_slot, title: "Swap food" }); }}
          onClose={() => setEditing(null)} />
      )}
      {goalOpen && (
        <NutritionGoalsEditor goalMap={goalMap} onSubmit={submitGoals} onClearAll={() => { gw.clearGoals(GOAL_TYPES); setGoalOpen(false); }} onClose={() => setGoalOpen(false)} />
      )}
      {fw.toast ? (
        <Toast text={fw.toast.text} onUndo={fw.toast.undo} onDismiss={fw.dismissToast} />
      ) : gw.toast ? (
        <Toast text={gw.toast} onDismiss={gw.dismissToast} />
      ) : rw.toast ? (
        <Toast text={rw.toast.text} onDismiss={rw.dismiss} />
      ) : null}
    </div>
  );
}
