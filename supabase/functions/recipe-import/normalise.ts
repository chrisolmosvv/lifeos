// LifeOS — Food → recipe-import (Cookbook rebuild, Piece 2a): normalisation, the field
// validators, and the ACCURACY LAYER. Everything here that predates 2a — repairDeps,
// assignStepPositions, cleanLabel, ingIdentity/wordPat, the tag + deps validation, parseRecipe —
// is LIFTED WHOLESALE from the old single-call index.ts, unchanged. It is the product of many
// accuracy fixes against real messy recipe text; do not rewrite it. New 2a validators
// (stationOrNull, holdOrNull, confOrNull) follow the SAME defensive pattern: anything the model
// returns that isn't an allowed value becomes null, so a DB CHECK can never reject a write.

// ── Scalar coercion (verbatim) ────────────────────────────────────────────────
export const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const intOrNull = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
export const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// ── Enum validators — only allowed values pass; else null (the DB CHECK never rejects) ──
const VALID_TAGS = new Set(["hands_on", "hands_free", "active_heat"]);
export const tagOrNull = (v: unknown) => (typeof v === "string" && VALID_TAGS.has(v) ? v : null);

const VALID_STATIONS = new Set(["bench", "hob", "oven", "rest"]);
export const stationOrNull = (v: unknown) => (typeof v === "string" && VALID_STATIONS.has(v) ? v : null);

const VALID_HOLD = new Set(["immediate", "short", "indefinite"]);
export const holdOrNull = (v: unknown) => (typeof v === "string" && VALID_HOLD.has(v) ? v : null);

const VALID_CONF = new Set(["low", "medium", "high"]);
export const confOrNull = (v: unknown) => (typeof v === "string" && VALID_CONF.has(v) ? v : null);

// Deps safety (verbatim): must be a clean array of non-negative integers; else null (sequential).
export function depsOrNull(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const clean = v.filter((d) => typeof d === "number" && Number.isInteger(d) && d >= 0);
  return clean.length > 0 ? clean : null;
}

// ── Defensive parse (verbatim): strip stray ``` fences, JSON.parse in try/catch ───────────
export function parseJson(text: string): Record<string, unknown> | null {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

// "Usable" (verbatim): a title OR any ingredient OR any step (partial-ok); else nothing.
export function isUsable(r: Record<string, unknown> | null): boolean {
  if (!r) return false;
  const hasTitle = typeof r.title === "string" && r.title.trim().length > 0;
  const hasIng = Array.isArray(r.ingredients) && r.ingredients.length > 0;
  const hasStep = Array.isArray(r.steps) && r.steps.length > 0;
  return hasTitle || hasIng || hasStep;
}

// Safe punctuation cleanup for ingredient/step text (verbatim). Only removes clearly-malformed
// artifacts (stray "(,", empty "()", doubled spaces). Never rewrites semantically.
export function cleanLabel(s: string): string {
  let t = s;
  t = t.replace(/\(\s*,\s*/g, "(");  // "(," or "( ," → "("
  t = t.replace(/\(\s*\)/g, "");      // empty "()" or "( )"
  t = t.replace(/\s{2,}/g, " ");      // collapse doubled spaces
  t = t.trim();
  return t;
}

// ── House types ───────────────────────────────────────────────────────────────
export type BaseStep = { text: string; original: string; depends_on: number[] | null };
export type IngShape = { raw_text: string; name: string; amount: number | null; unit: string | null; step_number: number | null };
export type Pass1Body = {
  title: string;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  cuisine: string | null;
  cuisine_confidence: string | null;
  multi_recipe: boolean;
  ingredients: IngShape[];
  steps: BaseStep[];
};

// Normalise Pass 1 to the house body shape (defensive against odd model output).
export function normalisePass1(r: Record<string, unknown>): Pass1Body {
  const ings = Array.isArray(r.ingredients) ? (r.ingredients as Record<string, unknown>[]) : [];
  const rawSteps = Array.isArray(r.steps) ? (r.steps as unknown[]) : [];
  return {
    title: typeof r.title === "string" ? r.title.trim() : "",
    servings: numOrNull(r.servings),
    prep_minutes: numOrNull(r.prep_minutes),
    cook_minutes: numOrNull(r.cook_minutes),
    cuisine: strOrNull(r.cuisine),
    cuisine_confidence: confOrNull(r.cuisine_confidence),
    multi_recipe: r.multi_recipe === true,
    ingredients: ings
      .filter((i) => i && (strOrNull(i.raw_text) || strOrNull(i.name)))
      .map((i) => ({
        raw_text: cleanLabel(strOrNull(i.raw_text) || strOrNull(i.name) || ""),
        name: strOrNull(i.name) || strOrNull(i.raw_text) || "",
        amount: numOrNull(i.amount),
        unit: strOrNull(i.unit),
        step_number: intOrNull(i.step_number),
      })),
    steps: rawSteps
      .map((s) => {
        // Backwards compat: a plain string arrives → wrap it, original = text.
        if (typeof s === "string") return { text: s.trim(), original: s.trim(), depends_on: null };
        const obj = s as Record<string, unknown>;
        const text = typeof obj.text === "string" ? obj.text.trim() : "";
        const original = typeof obj.original === "string" && obj.original.trim() ? obj.original.trim() : text;
        return { text, original, depends_on: depsOrNull(obj.depends_on) };
      })
      .filter((s) => s.text.length > 0),
  };
}

// Repair depends_on (verbatim): when any step self-references (1-indexed), subtract 1 from all
// values. Cleanup: drop < 0 or >= own position, deduplicate. Correct recipes pass unchanged.
export function repairDeps<T extends { depends_on: number[] | null }>(steps: T[]): T[] {
  const is1Indexed = steps.some((s, i) => Array.isArray(s.depends_on) && s.depends_on.includes(i));
  return steps.map((s, i) => {
    if (!Array.isArray(s.depends_on) || s.depends_on.length === 0) return s;
    let fixed = is1Indexed ? s.depends_on.map((d) => d - 1) : [...s.depends_on];
    fixed = [...new Set(fixed.filter((d) => d >= 0 && d < i))];
    return { ...s, depends_on: fixed.length > 0 ? fixed : null };
  });
}

// Ingredient→step link (verbatim): score identity words against step text. Head noun (last word)
// gets +3 so "chicken stock" prefers the "stock" step. Whole-word, plural-tolerant.
const ING_STRIP = new Set(
  ("ground dried fresh raw cooked roasted chopped sliced diced minced crushed whole powdered frozen " +
  "canned smoked hot cold sweet plain organic natural baby flaked toasted blanched peeled pitted " +
  "unsalted salted boneless skinless shredded grated crumbled melted softened finely roughly thinly " +
  "lightly deseeded trimmed halved large medium small thin thick extra green red white black yellow " +
  "clove cloves leaves leaf stalks stalk sprig sprigs wedges wedge pieces piece bunch bunches " +
  "rashers rasher optional about loosely packed cut into juiced zest cup cups tin tins").split(" "),
);
function ingIdentity(name: string): string[] {
  return name.toLowerCase().replace(/\([^)]*\)/g, " ").split(/[^a-z]+/).filter((w) => w.length >= 3 && !ING_STRIP.has(w));
}
function wordPat(w: string): RegExp { return new RegExp(`\\b${w}(?:e?s)?\\b`); }
export function assignStepPositions(ingredients: IngShape[], steps: { text: string }[]): IngShape[] {
  const texts = steps.map((s) => s.text.toLowerCase());
  return ingredients.map((ing) => {
    if (ing.step_number != null) return ing;
    const words = ingIdentity(ing.name);
    if (words.length === 0) return ing;
    const pats = words.map(wordPat), headPat = pats[pats.length - 1];
    let bestIdx = -1, bestScore = 0;
    texts.forEach((t, i) => {
      let s = pats.filter((p) => p.test(t)).length;
      if (s > 0 && headPat.test(t)) s += 3;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    return bestIdx >= 0 ? { ...ing, step_number: bestIdx } : ing;
  });
}
