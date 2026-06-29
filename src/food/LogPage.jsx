import { useEffect, useMemo, useRef, useState } from "react";
import { amsTodayYMD, amsClockMinutes, shiftYMD, humanDayLong, humanDayShort } from "../gym/gymDates";
import { fetchGoals } from "../health/healthLoad";
import { resolveGoals } from "../health/healthGoals";
import { useGoalWrites } from "../health/useGoalWrites";
import { dailyTotals, recentsFrom, entryMacros, slotForHour } from "./foodCalc";
import { fetchEntries, fetchNames, fetchMyFoods } from "./foodLoad";
import { cacheFoodOnLog, insertManualFood, setFavourite } from "./foodWrite";
import { useFoodWrites } from "./useFoodWrites";
import DayView from "./DayView";
import FoodRange from "./FoodRange";
import AddFoodModal from "./AddFoodModal";
import EditEntryPanel from "./EditEntryPanel";
import NutritionGoalsEditor from "./NutritionGoalsEditor";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./foodLog.css";

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
  const [addModal, setAddModal] = useState(null); // { slot, preset?, swapEntry?, title? }
  const [editing, setEditing] = useState(null); //   the entry being edited
  const [goalOpen, setGoalOpen] = useState(false);
  const goalAnchor = useRef(null);
  const fw = useFoodWrites(entries, setEntries);
  const gw = useGoalWrites(goalMap, setGoalMap);

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, rows, foods] = await Promise.all([fetchGoals(), fetchEntries(START, today), fetchMyFoods()]);
      const itemIds = [...new Set(rows.filter((e) => e.food_item_id).map((e) => e.food_item_id))];
      const recipeIds = [...new Set(rows.filter((e) => e.recipe_id).map((e) => e.recipe_id))];
      const names = await fetchNames(itemIds, recipeIds);
      if (alive) {
        setGoalMap(resolveGoals(goals));
        setDate(today);
        setEntries(rows);
        setMyFoods(foods);
        setState({ loading: false, now, today, names });
      }
    })().catch((e) => alive && setState({ loading: false, error: e.message || String(e) }));
    return () => { alive = false; };
  }, []);

  const daily = useMemo(() => dailyTotals(entries), [entries]);
  const favSet = useMemo(() => new Set(myFoods.filter((f) => f.is_favourite).map((f) => f.id)), [myFoods]);
  const quickFoods = useMemo(() => {
    const byId = Object.fromEntries(myFoods.map((f) => [f.id, f]));
    const favs = myFoods.filter((f) => f.is_favourite);
    const recents = recentsFrom(entries).map((id) => byId[id]).filter((f) => f && !f.is_favourite);
    return [...favs, ...recents].slice(0, 10);
  }, [myFoods, entries]);

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

  const submitGoals = (setList, clearList) => {
    if (setList.length) gw.submitGoals(setList);
    if (clearList.length) gw.clearGoals(clearList);
    setGoalOpen(false);
  };

  return (
    <div className="flog">
      <div className="flog-tabs" role="tablist" aria-label="Food range">
        {RANGES.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={r.id === range} className={r.id === range ? "flog-tab is-active" : "flog-tab"} onClick={() => setRange(r.id)}>{r.label}</button>
        ))}
      </div>

      <div className="flog-datenav">
        <button type="button" className="flog-arrow" aria-label="Previous" onClick={() => go(-1)}>‹</button>
        <div className="flog-date">{dateLabel}{range === "day" && date === state.today && <span className="flog-today">Today</span>}</div>
        <button type="button" className="flog-arrow" aria-label="Next" disabled={atToday} onClick={() => go(1)}>›</button>
      </div>

      {range === "day" ? (
        <DayView entries={entries} goalMap={goalMap} day={date} names={state.names} quickFoods={quickFoods} favSet={favSet}
          onAdd={openAdd} onQuickAdd={openQuickAdd} onEditEntry={setEditing} onToggleFav={toggleFav} onOpenRecipe={onOpenRecipe}
          onOpenGoals={(el) => { goalAnchor.current = el; setGoalOpen(true); }} />
      ) : (
        <FoodRange daily={daily} days={step} end={date} goalMap={goalMap} onDrillDay={(ymd) => { setRange("day"); setDate(ymd); }} />
      )}

      {addModal && (
        <AddFoodModal defaultSlot={addModal.slot} presetFood={addModal.preset} title={addModal.title} onLog={onLog} onClose={() => setAddModal(null)} />
      )}
      {editing && (
        <EditEntryPanel entry={editing} name={nameFor(editing)} onApply={(patch) => { fw.editEntry(editing.id, patch); setEditing(null); }}
          onRemove={() => { fw.deleteEntry(editing); setEditing(null); }}
          onSwap={() => { const e = editing; setEditing(null); setAddModal({ swapEntry: e, slot: e.meal_slot, title: "Swap food" }); }}
          onClose={() => setEditing(null)} />
      )}
      {goalOpen && (
        <Popover anchorRef={goalAnchor} title="Daily targets" onClose={() => setGoalOpen(false)}>
          <NutritionGoalsEditor goalMap={goalMap} onSubmit={submitGoals} onClearAll={() => { gw.clearGoals(GOAL_TYPES); setGoalOpen(false); }} onClose={() => setGoalOpen(false)} />
        </Popover>
      )}
      {fw.toast ? (
        <Toast text={fw.toast.text} onUndo={fw.toast.undo} onDismiss={fw.dismissToast} />
      ) : gw.toast ? (
        <Toast text={gw.toast} onDismiss={gw.dismissToast} />
      ) : null}
    </div>
  );
}
