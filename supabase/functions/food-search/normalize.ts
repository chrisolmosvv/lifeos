// LifeOS — Food → food-search (F2): the ONE internal record + the shared helpers.
//
// Every source (the owner's saved food_items, Open Food Facts, USDA FoodData Central)
// normalises into the SAME shape so the app reads one thing. Per-100g is the storage
// basis; energy is ALWAYS kcal and sodium is ALWAYS mg in this record (the sources
// disagree — OFF gives sodium in grams — so the per-source modules convert before they
// hand a record here). A MISSING number is null, NEVER 0 (0 g of protein and "we don't
// know" are different facts; the UI must be able to tell them apart).

// One food candidate. `food_item_id` is present ONLY when this candidate is already a
// row in the owner's food_items (a cached/saved/manual food) — the app (F6) then links
// to that row instead of re-inserting. API-only candidates omit it.
export interface FoodCandidate {
  source: "off" | "usda" | "manual";
  source_ref: string | null;
  name: string;
  brand: string | null;
  serving: { grams: number | null; label: string | null };
  per100g: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fibre: number | null;
    sugar: number | null;
    sodium: number | null; // milligrams
  };
  food_item_id?: string;
}

// What one source returns: its normalised records PLUS how many RAW hits the API gave
// before normalisation dropped any (no-name rows, etc.). `raw` vs records.length is the
// diagnostic — it shows "0 hits" apart from "hits came back but got dropped".
export interface SourceResult {
  raw: number;
  records: FoodCandidate[];
}

// A finite number, else null. The single guard that keeps junk ("", "N/A", NaN, a
// stray string) out of the macros — callers pass raw source values straight through it.
export function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// Grams → milligrams (OFF reports sodium/salt in g/100g; our record is mg). null in →
// null out, so a missing value never becomes a fake 0.
export function gToMg(grams: number | null): number | null {
  return grams == null ? null : grams * 1000;
}

// A candidate worth showing: it has at least a calorie figure. Crowd-sourced OFF entries
// often carry NO nutrition at all (every per100g field null) — those are empty cards the
// UI shouldn't show, so the API sources filter on this (raw vs kept makes the drop visible
// in `debug`). The owner's own saved foods are NOT filtered — their data always shows.
export function hasMacros(c: FoodCandidate): boolean {
  return c.per100g.kcal != null;
}

// A non-empty trimmed string, else null (blank brand/name fields come back as "").
export function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// fetch with a hard timeout so one slow API can't hang the whole search. Returns the
// Response, or throws (the caller catches → degrades to "this source unavailable").
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 5000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// A curated BASICS staple (V2 P1): a seed food_items row tagged by CONVENTION —
// source='manual', source_ref='basics:<slug>' (see db/32_food_basics_seed.sql). No new
// column: the prefix on source_ref is the whole mechanism.
export function isBasic(c: FoodCandidate): boolean {
  return c.source === "manual" && !!c.source_ref && c.source_ref.startsWith("basics:");
}

// ── Zero-drop filter (pre-rerank) ───────────────────────────────────────────
// Preparation/form modifiers — stripped from the query to find the core food-identity words.
// Only used for the zero-drop close-name-match test (never for display or storage).
const MODIFIERS = new Set([
  "ground", "dried", "fresh", "raw", "cooked", "roasted", "chopped", "sliced",
  "diced", "minced", "crushed", "whole", "powdered", "frozen", "canned",
  "smoked", "hot", "cold", "sweet", "plain", "organic", "natural", "sea",
  "flaked", "toasted", "blanched", "peeled", "pitted", "unsalted", "salted",
  "dehydrated", "steamed", "baked", "fried", "grilled", "boiled",
  "boneless", "skinless", "shredded", "grated", "crumbled", "melted",
  "light", "dark", "baby", "young", "powder", "flakes", "seed", "seeds",
]);

// Core food-identity words: lowercase, split on non-alpha, keep 4+ chars, drop modifiers.
function coreWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !MODIFIERS.has(w));
}

// Pre-rerank zero-drop: when a crowd-sourced "0 kcal" entry would win on name proximity
// but a calorie-bearing candidate for the SAME food exists, drop the zeros so the reranker
// chooses among real entries.
//
// CLOSE NAME MATCH RULE: extract core food words from the query (4+ chars, modifiers like
// "ground"/"sea"/"dried" stripped). A calorie-bearing candidate is a close match when EVERY
// core word appears as a WHOLE WORD (word-boundary-delimited) in the candidate's name.
// Examples: query "ground cumin" → core ["cumin"] → matches "Spices, cumin seed" ✓.
//           query "herbes de provence" → core ["herbes","provence"] → no candidate has both → ✗.
//           query "sea salt" → core ["salt"] → "Almonds, salted" fails (\bsalt\b ≠ salted) → ✗.
//
// If no calorie-bearing close match exists (the food genuinely has 0 kcal like salt, or only
// spurious non-zero hits exist), the list stays exactly as it was — honest omission, never a
// forced wrong match.
export function dropZeroJunk(query: string, candidates: FoodCandidate[]): FoodCandidate[] {
  if (candidates.length === 0) return candidates;

  const isZero = (c: FoodCandidate) => c.per100g.kcal === 0;
  if (!candidates.some(isZero)) return candidates; // nothing to drop

  const calorieBearing = candidates.filter((c) => c.per100g.kcal != null && c.per100g.kcal > 0);
  if (calorieBearing.length === 0) return candidates; // all zero/null → genuine

  const core = coreWords(query);
  if (core.length === 0) return candidates; // can't test → leave alone

  const patterns = core.map((w) => new RegExp(`\\b${w}\\b`));
  // Only check UNBRANDED calorie-bearing candidates (USDA whole foods, owner's saved generics).
  // Branded OFF products like "Popcorners sea salt" (a snack, not salt) incidentally share food
  // words and would cause false close-matches; skipping them keeps genuine zeros like salt safe.
  const hasCloseMatch = calorieBearing.some((c) => {
    if (c.brand) return false;
    const name = c.name.toLowerCase();
    return patterns.every((p) => p.test(name));
  });

  return hasCloseMatch ? candidates.filter((c) => !isZero(c)) : candidates;
}

// Clear name match: does the candidate's name contain every core query word as a whole word?
// Same coreWords + word-boundary logic as the zero-drop test. Used to skip the reranker when
// the top candidate obviously matches (saving a Gemini call on clear picks like "chicken stock").
export function isClearNameMatch(query: string, candidate: FoodCandidate): boolean {
  const core = coreWords(query);
  if (core.length === 0) return false;
  const name = candidate.name.toLowerCase();
  return core.every((w) => new RegExp(`\\b${w}\\b`).test(name));
}

// ── Merge + dedupe ──────────────────────────────────────────────────────────
// Merge the three sources into one ordered list with no duplicate of the SAME food.
//   • Order: curated BASICS staples FIRST (P1 — the trusted generics lead), then the rest of
//     the owner's saved/cached items (favourites-first from saved.ts), then OFF, then USDA.
//   • Dedupe: an API item with the same (source, source_ref) as one the owner already
//     has saved is dropped — the saved row wins (it carries food_item_id + any edits).
//     Manual items have a null source_ref, so they never collide with anything.
export function mergeDedupeOrder(
  saved: FoodCandidate[],
  off: FoodCandidate[],
  usda: FoodCandidate[],
): FoodCandidate[] {
  const seen = new Set<string>();
  for (const c of saved) {
    if (c.source_ref) seen.add(`${c.source}:${c.source_ref}`);
  }
  const apiKept = [...off, ...usda].filter((c) => {
    if (!c.source_ref) return true;
    const key = `${c.source}:${c.source_ref}`;
    return !seen.has(key);
  });
  // Hoist basics to the front of the saved group (their relative order preserved).
  const basics = saved.filter(isBasic);
  const savedRest = saved.filter((c) => !isBasic(c));
  return [...basics, ...savedRest, ...apiKept];
}
