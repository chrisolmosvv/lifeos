// LifeOS — Food → food-search (F2): Open Food Facts (branded / EU products).
//
// OFF needs NO key. We text-search its product database and map each product's per-100g
// nutriments into the one internal record. Two conversions matter:
//   • sodium: OFF stores `sodium_100g` in GRAMS; our record is mg → ×1000. If sodium is
//     absent but `salt_100g` is present, derive sodium = salt ÷ 2.5 (the standard ratio).
//   • fibre: OFF spells the key `fiber_100g`, and it is frequently ABSENT → null (not 0).
//
// OFF asks callers to send a descriptive User-Agent with a contact. We build it at RUN
// TIME from the OFF_CONTACT_EMAIL secret — the email is NEVER hardcoded here, because
// supabase/functions/ is in the public repo. No email set → a generic (still honest) UA.
//
// Any failure (network, timeout, bad shape) → throw, so index.ts degrades to "off
// unavailable" and still returns the other sources. "No products matched" is NOT a
// failure — it returns an empty list.

import { type FoodCandidate, fetchWithTimeout, gToMg, num, str } from "./normalize.ts";

const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const FIELDS = "code,product_name,brands,serving_size,serving_quantity,nutriments";

// app name + contact (from the secret); the contact only ever reaches OFF's servers.
function userAgent(): string {
  const email = Deno.env.get("OFF_CONTACT_EMAIL");
  const contact = email && email.trim().length > 0 ? email.trim() : "single-user personal app";
  return `LifeOS/1.0 (${contact})`;
}

export async function searchOff(query: string): Promise<FoodCandidate[]> {
  const url =
    `${SEARCH_URL}?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=10&fields=${encodeURIComponent(FIELDS)}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent() } });
  if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);
  const data = await res.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  return products
    .map(toCandidate)
    .filter((c: FoodCandidate | null): c is FoodCandidate => c !== null);
}

// One OFF product → the internal record. Drops products with no usable name (OFF has
// many blank-name rows). brands is a comma list → take the first.
function toCandidate(p: Record<string, unknown>): FoodCandidate | null {
  const name = str(p.product_name);
  if (!name) return null;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  // sodium (mg): prefer sodium_100g (g→mg); else derive from salt_100g (g) ÷ 2.5 → mg.
  let sodium = gToMg(num(n["sodium_100g"]));
  if (sodium == null) {
    const saltG = num(n["salt_100g"]);
    if (saltG != null) sodium = gToMg(saltG / 2.5);
  }

  const brands = str(p.brands);
  return {
    source: "off",
    source_ref: str(p.code),
    name,
    brand: brands ? brands.split(",")[0].trim() : null,
    serving: { grams: num(p.serving_quantity), label: str(p.serving_size) },
    per100g: {
      kcal: num(n["energy-kcal_100g"]),
      protein: num(n["proteins_100g"]),
      carbs: num(n["carbohydrates_100g"]),
      fat: num(n["fat_100g"]),
      fibre: num(n["fiber_100g"]), // OFF spelling; often absent → null
      sugar: num(n["sugars_100g"]),
      sodium,
    },
  };
}
