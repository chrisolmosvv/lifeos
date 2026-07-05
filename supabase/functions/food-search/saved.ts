// LifeOS — Food → food-search (F2): the OWNER'S saved/cached foods (food_items).
//
// This is the new bit for LifeOS: food-search runs with verify_jwt = TRUE and is called
// AS THE LOGGED-IN OWNER. So we read food_items through PostgREST using the CALLER'S JWT
// (the request's Authorization header) + the anon apikey — NOT the service-role key.
// RLS then scopes the read to the owner automatically (auth.uid() = user_id). This is the
// opposite of brief/gym, which use the service role and filter by OWNER_USER_ID.
//
// READ-ONLY: nothing here writes. The "cache a chosen API food into food_items" write is
// F6's job (when the owner actually picks/logs it), never this function's.

import { type FoodCandidate, num, type SourceResult, str } from "./normalize.ts";

const SB_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// The owner's saved/cached/manual foods whose name matches the query (case-insensitive),
// favourites first. Returns empty on anything unusual (no auth header, a bad read) —
// saved foods are a nice-to-have layer over the API search, never a reason to fail.
export async function searchSaved(query: string, authHeader: string | null): Promise<SourceResult> {
  if (!SB_URL || !ANON_KEY || !authHeader) return { raw: 0, records: [] };
  const cols =
    "id,name,display_name,brand,source,source_ref,kcal,protein,carbs,fat,fibre,sugar,sodium,serving_grams,serving_label,is_favourite";
  // PostgREST: ilike with *wildcards*; favourites first, then alphabetical; cap at 10.
  const eq = encodeURIComponent(query);
  const q =
    `food_items?select=${cols}` +
    `&or=(name.ilike.*${eq}*,display_name.ilike.*${eq}*)` +
    `&order=is_favourite.desc,name.asc&limit=10`;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${q}`, {
      headers: { apikey: ANON_KEY, Authorization: authHeader },
    });
    if (!res.ok) return { raw: 0, records: [] };
    const rows = await res.json();
    if (!Array.isArray(rows)) return { raw: 0, records: [] };
    return { raw: rows.length, records: rows.map(toCandidate) };
  } catch (_err) {
    return { raw: 0, records: [] };
  }
}

// A food_items row → the one internal record. Its stored numbers are ALREADY in the
// record's units (per-100g; sodium in mg) — saved straight from a prior normalise — so
// no conversion here. food_item_id is set so the app links to the existing row (F6).
function toCandidate(r: Record<string, unknown>): FoodCandidate {
  const source = r.source === "off" || r.source === "usda" ? r.source : "manual";
  return {
    source,
    source_ref: str(r.source_ref),
    name: str(r.display_name) ?? str(r.name) ?? "",
    brand: str(r.brand),
    serving: { grams: num(r.serving_grams), label: str(r.serving_label) },
    per100g: {
      kcal: num(r.kcal),
      protein: num(r.protein),
      carbs: num(r.carbs),
      fat: num(r.fat),
      fibre: num(r.fibre),
      sugar: num(r.sugar),
      sodium: num(r.sodium),
    },
    food_item_id: typeof r.id === "string" ? r.id : undefined,
  };
}
