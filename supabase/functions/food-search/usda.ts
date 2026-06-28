// LifeOS — Food → food-search (F2): USDA FoodData Central (whole foods).
//
// USDA needs a key (USDA_FDC_API_KEY, owner-supplied, server-only). We search WHOLE-FOOD
// data types only — Foundation, SR Legacy, Survey (FNDDS) — because those report clean
// per-100g numbers; branded products are OFF's job (better EU/NL coverage, and USDA
// branded reports awkward per-serving values). So USDA gives us raw ingredients
// (chicken breast, oats, banana) with reliable macros.
//
// Each result's foodNutrients identify a nutrient by `nutrientId` (1008, 1003, …) — NOT
// `nutrientNumber`, which is the OLD INFOODS tagname string ("208", "203", …). Matching
// nutrientNumber was the F2 bug that nulled every macro; we match nutrientId. USDA sodium
// is ALREADY mg and energy is ALREADY kcal → no conversion. Missing nutrient → null.
//
// No key is NOT an error — index.ts reports "not_configured" and the search still returns
// OFF + saved. A real fetch failure throws → same graceful degrade.

import { type FoodCandidate, fetchWithTimeout, num, type SourceResult, str } from "./normalize.ts";

const SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const DATA_TYPES = "Foundation,SR Legacy,Survey (FNDDS)";

// nutrientId → our field. Energy has a few variants; we try 1008 (Energy, kcal) first,
// then the Atwater kcal rows (2048/2047) as a fallback for foods carrying only those.
const ENERGY_IDS = [1008, 2048, 2047];
const PROTEIN = 1003;
const CARBS = 1005;
const FAT = 1004;
const FIBRE = 1079;
const SUGAR = 2000;
const SODIUM = 1093; // already mg

export const usdaConfigured = !!Deno.env.get("USDA_FDC_API_KEY");

export async function searchUsda(query: string): Promise<SourceResult> {
  const key = Deno.env.get("USDA_FDC_API_KEY");
  if (!key) return { raw: 0, records: [] }; // no key → degrade quietly (sources says so)
  const url =
    `${SEARCH_URL}?api_key=${encodeURIComponent(key)}` +
    `&query=${encodeURIComponent(query)}` +
    `&dataType=${encodeURIComponent(DATA_TYPES)}&pageSize=10`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`USDA HTTP ${res.status}`);
  const data = await res.json();
  const foods = Array.isArray(data?.foods) ? data.foods : [];
  const records = foods
    .map(toCandidate)
    .filter((c: FoodCandidate | null): c is FoodCandidate => c !== null);
  return { raw: foods.length, records };
}

// Pull the first finite value whose nutrientId is in `ids`, else null.
function pick(nutrients: Record<string, unknown>[], ids: number[]): number | null {
  for (const wanted of ids) {
    const hit = nutrients.find((x) => Number(x?.nutrientId) === wanted);
    const v = num(hit?.value);
    if (v != null) return v;
  }
  return null;
}

// One USDA food → the internal record. Whole foods carry no serving info → null/null.
function toCandidate(f: Record<string, unknown>): FoodCandidate | null {
  const name = str(f.description);
  if (!name) return null;
  const nutrients = Array.isArray(f.foodNutrients) ? (f.foodNutrients as Record<string, unknown>[]) : [];
  return {
    source: "usda",
    source_ref: f.fdcId != null ? String(f.fdcId) : null,
    name,
    brand: str(f.brandName) ?? str(f.brandOwner), // usually null for whole foods
    serving: { grams: null, label: null },
    per100g: {
      kcal: pick(nutrients, ENERGY_IDS),
      protein: pick(nutrients, [PROTEIN]),
      carbs: pick(nutrients, [CARBS]),
      fat: pick(nutrients, [FAT]),
      fibre: pick(nutrients, [FIBRE]),
      sugar: pick(nutrients, [SUGAR]),
      sodium: pick(nutrients, [SODIUM]),
    },
  };
}
