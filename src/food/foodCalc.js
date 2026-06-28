// LifeOS — Food → calc layer (F3): the logger/day getters (PURE, compute-on-read).
//
// PURE FUNCTIONS ONLY — no fetch, no writes, no Supabase, no Date.now(): "today" is
// always passed IN (an Amsterdam-day "YYYY-MM-DD", like the Body utils) so every getter is
// a testable input→output map. This file MIRRORS src/health: it REUSES the Body windowing
// (presetRange / statsForRange) and the shared day helper (gymDates), and adds only the
// genuinely-new nutrition maths.
//
// THE KEY SPLIT: a log entry STORES its 7-number macro snapshot (what was actually eaten —
// F1 schema). So entryMacros computes that snapshot at WRITE time (F6 / recipe-cook) from a
// food's per-100g record × amount; dailyTotals / dayLedger read entries that ALREADY carry
// the 7 numbers and just SUM them. The negative-clamp therefore lives in entryMacros, where
// the raw record is first read.

import { presetRange, statsForRange } from "../health/healthStats.js";

// The seven numbers every food/total carries. kcal in kcal; protein/carbs/fat/fibre/sugar
// in g; sodium in mg.
export const NUTRIENTS = ["kcal", "protein", "carbs", "fat", "fibre", "sugar", "sodium"];
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"];
export const ON_TARGET_BAND = 0.10; // ±10% (edges INCLUSIVE — see vsGoal)
const MACRO_KCAL = { protein: 4, carbs: 4, fat: 9 }; // Atwater factors for the calorie split

// A finite number, else null. Keeps junk/NaN/strings out of the maths.
function finite(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── entryMacros ──────────────────────────────────────────────────────────────
// Scale a food's per-100g record to `amount` of `unit` → the 7 numbers to log.
//   • THE NEGATIVE CLAMP lives here: a finite per-100g → max(0, value × grams/100), so
//     USDA rounding noise (e.g. carbs −0.428) can never reach a total or the UI.
//   • A MISSING per-100g → null (unknown, never faked to 0).
//   • Units: 'g'/'ml' = amount; 'serving' = amount × serving.grams. Any other unit
//     ("cup", "tbsp", "1 onion") is unresolved in V1 → all-null (the F7 portions seam).
export function entryMacros(item, amount, unit = "g") {
  const per = item?.per100g || {};
  const grams = resolveGrams(item, amount, unit);
  const out = {};
  for (const k of NUTRIENTS) {
    const base = finite(per[k]);
    out[k] = base == null || grams == null ? null : Math.max(0, (base * grams) / 100);
  }
  return out;
}

// (amount, unit) → grams, or null when the unit can't be resolved yet (F7 fills this in).
function resolveGrams(item, amount, unit) {
  const a = finite(amount);
  if (a == null) return null;
  const u = (unit || "g").toLowerCase();
  if (u === "g" || u === "ml") return a;
  if (u === "serving") {
    const sg = finite(item?.serving?.grams);
    return sg == null ? null : a * sg;
  }
  return null; // F7 portion table (portions.js) resolves cup/tbsp/"1 onion" → grams here
}

// ── dailyTotals (NEW sum-per-day primitive) ──────────────────────────────────
// Body AVERAGES readings within a day; nutrition SUMS them (calories add up), so the Body
// collapse is NOT reused. Each entry already carries its stored snapshot — add per
// entry_date. A null macro adds as 0 (a missing number doesn't subtract from the day).
// → one row per day, oldest-first: { ymd, kcal, protein, carbs, fat, fibre, sugar, sodium }.
export function dailyTotals(entries) {
  const byDay = new Map();
  for (const e of entries || []) {
    const ymd = e?.entry_date;
    if (!ymd) continue;
    let row = byDay.get(ymd);
    if (!row) {
      row = { ymd };
      for (const k of NUTRIENTS) row[k] = 0;
      byDay.set(ymd, row);
    }
    for (const k of NUTRIENTS) {
      const v = finite(e[k]);
      if (v != null) row[k] += v;
    }
  }
  return [...byDay.values()].sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
}

// Sum the 7 numbers across a list of entries (null = 0). Helper for slot subtotals + total.
function sumEntries(entries) {
  const t = {};
  for (const k of NUTRIENTS) t[k] = 0;
  for (const e of entries || []) {
    for (const k of NUTRIENTS) {
      const v = finite(e[k]);
      if (v != null) t[k] += v;
    }
  }
  return t;
}

// ── vsGoal (±10% band, edges INCLUSIVE; 0/absent target → null) ───────────────
// status: 'under' | 'on' | 'over'. on-target = |actual − target| ≤ 10% of target, edges
// INCLUSIVE (exactly target±10% is still 'on'). A null OR zero target → null (no divide, no
// NaN) so the caller renders the muted "set a target" path instead of a fake comparison.
export function vsGoal(actual, target, band = ON_TARGET_BAND) {
  const t = finite(target);
  const a = finite(actual);
  if (t == null || t === 0 || a == null) return null;
  const tol = Math.abs(t) * band;
  const delta = a - t;
  const status = delta > tol ? "over" : delta < -tol ? "under" : "on";
  return { target: t, actual: a, delta, status };
}

// ── dayLedger ────────────────────────────────────────────────────────────────
// The meal-by-meal view for one Amsterdam day. `goalMap` is the resolved Map from the
// REUSED resolveGoals (newest goal row per type wins); an absent/empty map → every goals.*
// is null and hasGoals is false (the UI shows the muted "set your targets" prompt). No
// crash, no fake 0 target.
// → { day, slots:{slot:{items,subtotal}}, total, alcohol:{units,kcal}, goals, hasGoals }
export function dayLedger(entries, goalMap, { day } = {}) {
  const ofDay = (entries || []).filter((e) => e?.entry_date === day);

  const slots = {};
  for (const slot of MEAL_SLOTS) {
    const items = ofDay.filter((e) => e.meal_slot === slot);
    slots[slot] = { items, subtotal: sumEntries(items) };
  }
  const total = sumEntries(ofDay);

  // Alcohol-lite: units summed + the kcal of the alcohol entries (their kcal is already in
  // `total` via the snapshot — this is just the drink-only view).
  let units = 0, alcKcal = 0;
  for (const e of ofDay) {
    if (!e?.is_alcohol) continue;
    const u = finite(e.alcohol_units);
    if (u != null) units += u;
    const k = finite(e.kcal);
    if (k != null) alcKcal += k;
  }

  const target = (type) => finite(goalMap?.get?.(type)?.target_value);
  const goals = {
    calories: vsGoal(total.kcal, target("calories")),
    protein: vsGoal(total.protein, target("protein")),
    carbs: vsGoal(total.carbs, target("carbs")),
    fat: vsGoal(total.fat, target("fat")),
  };
  const hasGoals = ["calories", "protein", "carbs", "fat"].some((t) => {
    const v = target(t);
    return v != null && v !== 0;
  });

  return { day, slots, total, alcohol: { units, kcal: alcKcal }, goals, hasGoals };
}

// ── macroSplit (by CALORIE contribution, 4/4/9 Atwater) ──────────────────────
// The stacked bar: each macro's share of the macro-derived calories. All-zero/null → zeros
// (the UI shows an empty bar, never NaN). Returns fractions 0–1 that sum to 1 (or all 0).
export function macroSplit(macros) {
  const p = Math.max(0, finite(macros?.protein) ?? 0) * MACRO_KCAL.protein;
  const c = Math.max(0, finite(macros?.carbs) ?? 0) * MACRO_KCAL.carbs;
  const f = Math.max(0, finite(macros?.fat) ?? 0) * MACRO_KCAL.fat;
  const sum = p + c + f;
  if (sum <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / sum, carbs: c / sum, fat: f / sum };
}

// ── calorieArc ───────────────────────────────────────────────────────────────
// The editorial arc: the day's calories against the goal. No goal (null/0) → hasGoal false,
// fraction null (the UI shows the number with no arc fill). With a goal: fraction =
// clamp(consumed/goal, 0..1) for the sweep; over/overBy/remaining for the label.
export function calorieArc(kcal, goalKcal) {
  const consumed = finite(kcal) ?? 0;
  const goal = finite(goalKcal);
  if (goal == null || goal === 0) {
    return { consumed, goal: null, hasGoal: false, fraction: null, over: false, overBy: null, remaining: null };
  }
  const over = consumed > goal;
  return {
    consumed,
    goal,
    hasGoal: true,
    fraction: Math.max(0, Math.min(1, consumed / goal)),
    over,
    overBy: over ? consumed - goal : 0,
    remaining: Math.max(0, goal - consumed),
  };
}

// ── recentsFrom (the quick-add layer) ────────────────────────────────────────
// The most-recently-logged DISTINCT foods, newest first — derived from the log (no recents
// table). Returns food_item_ids in recency order; the caller maps them to food_items rows.
// Entries with no food_item_id (legacy/manual-less) are skipped. `limit` caps the list.
export function recentsFrom(entries, limit = 12) {
  const seen = new Set();
  const out = [];
  const byNewest = [...(entries || [])].sort((a, b) =>
    (a.created_at || "") < (b.created_at || "") ? 1 : (a.created_at || "") > (b.created_at || "") ? -1 : 0,
  );
  for (const e of byNewest) {
    const id = e?.food_item_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

// ── rangeTotals (REUSES presetRange + statsForRange) ─────────────────────────
// Week/Month: the AVERAGE daily total per nutrient over the window ending on `end`, averaged
// over LOGGED days only (statsForRange skips gap days — a day with no entries is NOT a 0).
// `daily` = dailyTotals() output. nDays = how many logged days fell in the window.
// → { days, start, end, perNutrient: { kcal:{avg,nDays}, … } }
export function rangeTotals(daily, days, { end } = {}) {
  const { start } = presetRange(days, end);
  const perNutrient = {};
  for (const k of NUTRIENTS) {
    const points = (daily || []).map((d) => ({ ymd: d.ymd, value: d[k] }));
    const s = statsForRange(points, start, end);
    perNutrient[k] = { avg: s.avg, nDays: s.count };
  }
  return { days, start, end, perNutrient };
}
