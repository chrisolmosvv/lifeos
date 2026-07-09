// LifeOS — Food (F6): small shape adapters between a food_items row / a logged entry and the
// F2 "candidate" shape the amount step + logging use ({ source, source_ref, name, brand,
// serving:{grams,label}, per100g:{7}, food_item_id? }). Pure, no DB.

import { NUTRIENTS } from "./foodCalc.js";

// A food_items row → the candidate shape (quick-add, swap result, re-log a saved food).
export function itemToFood(row) {
  const per100g = {};
  for (const k of NUTRIENTS) per100g[k] = row[k] ?? null;
  return {
    source: row.source,
    source_ref: row.source_ref ?? null,
    name: row.display_name || row.name,
    brand: row.brand ?? null,
    serving: { grams: row.serving_grams ?? null, label: row.serving_label ?? null },
    per100g,
    food_item_id: row.id,
  };
}

// A logged entry → a pseudo-food whose per-100g is REVERSE-DERIVED from its stored snapshot
// (per100g = snapshot × 100 / amount), so editing the amount recomputes the snapshot without
// refetching the food. A null snapshot field stays null; a missing amount → null per-100g.
export function entryToFood(entry) {
  const amt = Number(entry.amount) || 0;
  const per100g = {};
  for (const k of NUTRIENTS) {
    const v = entry[k];
    per100g[k] = typeof v === "number" && Number.isFinite(v) && amt > 0 ? (v * 100) / amt : null;
  }
  return {
    source: "manual",
    source_ref: null,
    name: "",
    brand: null,
    serving: { grams: null, label: null },
    per100g,
    food_item_id: entry.food_item_id ?? null,
  };
}
