// THROWAWAY — Food V2 P0 getter verification against Chris's REAL rows.
// Imports the ACTUAL getters (never reimplements them) and runs them over rows he pastes
// from the Supabase SQL editor into scripts/p0-fixtures/<getter>.json.
// Usage: node scripts/verifyP0.mjs <getter> scripts/p0-fixtures/<getter>.json
// Not committed with the getters; deleted at P0 close.

import { readFileSync } from "node:fs";
import { recipeKind, lastCookedFor } from "../src/food/recipeCalc.js";
import { dailyTotals, rangeAdherence, vsGoal, recentMealsFrom, recentsFrom } from "../src/food/foodCalc.js";
import { resolveGoals } from "../src/health/healthGoals.js";
import { amsYMD, shiftYMD } from "../src/gym/gymDates.js";

const [, , getter, fixturePath] = process.argv;
if (!getter || !fixturePath) {
  console.error("usage: node scripts/verifyP0.mjs <getter> <fixture.json>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(fixturePath, "utf8"));
const pad = (s, n) => String(s ?? "—").padEnd(n);

if (getter === "recipeKind") {
  // rows: [{ title, ingredient_count, step_count }]. recipeKind reads .length off the
  // ingredients/steps arrays, so stub arrays of the real counts exercise it faithfully.
  console.log(pad("title", 34), pad("ings", 6), pad("steps", 7), "kind");
  console.log("-".repeat(60));
  for (const r of data) {
    const recipe = {
      ingredients: Array(Number(r.ingredient_count) || 0).fill({}),
      steps: Array(Number(r.step_count) || 0).fill({}),
    };
    console.log(pad(r.title, 34), pad(r.ingredient_count, 6), pad(r.step_count, 7), recipeKind(recipe));
  }
} else if (getter === "lastCookedFor") {
  // fixture: { recipes:[{id,title,last_cooked_at,ingredient_count,step_count}], entries:[{recipe_id,entry_source,entry_date}] }
  // THE KEY CHECK: computed lastCookedFor (a getter run over the real entries) must equal the
  // stored last_cooked_at at Amsterdam-DAY granularity (stored is a UTC instant, computed is an
  // Amsterdam entry_date). amsYMD is the app's own instant→day helper, used only for comparison.
  const { recipes, entries } = data;
  let mismatches = 0;
  console.log(pad("title", 34), pad("stored (raw)", 26), pad("stored day", 12), pad("computed", 12), "match?");
  console.log("-".repeat(96));
  for (const r of recipes) {
    const recipe = {
      id: r.id,
      ingredients: Array(Number(r.ingredient_count) || 0).fill({}),
      steps: Array(Number(r.step_count) || 0).fill({}),
    };
    const computed = lastCookedFor(recipe, entries);
    const storedDay = r.last_cooked_at ? amsYMD(r.last_cooked_at) : null;
    const ok = computed === storedDay || (computed == null && storedDay == null);
    if (!ok) mismatches += 1;
    console.log(pad(r.title, 34), pad(r.last_cooked_at, 26), pad(storedDay, 12), pad(computed, 12), ok ? "match" : "*** MISMATCH ***");
  }
  console.log("-".repeat(96));
  console.log(mismatches === 0 ? "ALL MATCH ✅" : `${mismatches} MISMATCH(ES) — FINDING, not a pass`);
} else if (getter === "rangeAdherence") {
  // fixture: { entries:[…], goals:[health_goals rows], window:{start,end,today} }
  // Runs the REAL chain: dailyTotals(entries) → resolveGoals(goals) → rangeAdherence(daily, map, window).
  // Iterates every CALENDAR day of the window so both guards (pre-data / future) are visible; the
  // per-day statuses (via vsGoal, DISPLAY ONLY) explain each verdict. The count comes from the getter.
  const { entries, goals, window } = data;
  const daily = dailyTotals(entries);
  const byDay = new Map(daily.map((d) => [d.ymd, d]));
  const goalMap = resolveGoals(goals);
  const g = (t) => goalMap.get(t)?.target_value ?? null;
  const firstLogged = daily.length ? daily[0].ymd : null;
  const { start, end, today } = window;
  const lo = firstLogged && firstLogged > start ? firstLogged : start;
  const hi = today != null && today < end ? today : end;
  console.log("resolved goals:", ["calories", "protein", "carbs", "fat"].map((t) => `${t}=${g(t) ?? "—"}`).join("  "));
  console.log(`window ${start}…${end} · today ${today} · firstLogged ${firstLogged} · counted span [${lo}…${hi}]`);
  const st = (a, target) => { const s = vsGoal(a, target); return s ? s.status : "no-goal"; };
  console.log(pad("day", 12), pad("logged?", 9), pad("kcal", 15), pad("P", 13), pad("C", 13), pad("F", 13), "on-target?");
  console.log("-".repeat(92));
  for (let d = start; d <= end; d = shiftYMD(d, 1)) {
    if (d < lo) { console.log(pad(d, 12), "— excluded: pre-data (before first log)"); continue; }
    if (d > hi) { console.log(pad(d, 12), "— excluded: future (after today)"); continue; }
    const row = byDay.get(d);
    if (!row) { console.log(pad(d, 12), pad("no", 9), "untracked → counts in total, not onTarget"); continue; }
    const cal = vsGoal(row.kcal, g("calories"));
    let ok = !!(cal && cal.status === "on");
    for (const [t, k] of [["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"]]) {
      const s = vsGoal(row[k], g(t)); if (s && s.status !== "on") ok = false;
    }
    console.log(
      pad(d, 12), pad("yes", 9),
      pad(`${Math.round(row.kcal)} (${st(row.kcal, g("calories"))})`, 15),
      pad(`${Math.round(row.protein)} (${st(row.protein, g("protein"))})`, 13),
      pad(`${Math.round(row.carbs)} (${st(row.carbs, g("carbs"))})`, 13),
      pad(`${Math.round(row.fat)} (${st(row.fat, g("fat"))})`, 13),
      ok ? "YES" : "no",
    );
  }
  const res = rangeAdherence(daily, goalMap, { start, end, today });
  console.log("-".repeat(92));
  console.log(`getter → onTarget ${res.onTarget} / total ${res.total}`);
} else if (getter === "recentMealsFrom") {
  // data: an array of log entries, OR { entries, limit }. Runs the REAL recentMealsFrom AND the
  // existing recentsFrom on the SAME input — the two partition cleanly (meals vs single foods),
  // and recentsFrom's output shows it's unchanged.
  const entries = Array.isArray(data) ? data : data.entries;
  const limit = Array.isArray(data) ? undefined : data.limit;
  const meals = limit != null ? recentMealsFrom(entries, limit) : recentMealsFrom(entries);
  const foods = recentsFrom(entries); // untouched getter, same input
  console.log(`input: ${entries.length} entries${limit != null ? `  (limit ${limit})` : ""}`);
  console.log("recentMealsFrom  → recipe_ids:", JSON.stringify(meals));
  console.log("recentsFrom      → food_item_ids:", JSON.stringify(foods), "  (existing getter, unchanged — single foods only)");
} else {
  console.error(`getter "${getter}" not wired in the harness yet`);
  process.exit(1);
}
