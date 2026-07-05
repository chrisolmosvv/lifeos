// LifeOS — Food → food-search (V2 P1): the Gemini LIVE RERANKER (free key).
//
// Given the query + the already-merged candidate list, ask Gemini for a common-sense TOP few
// (the everyday match, not obscure/oddly-branded rows). Returns INDICES into the passed array,
// best-first — an ADDITIVE annotation the caller returns as `top3`. It NEVER mutates a
// candidate (only the indices come back) and NEVER throws.
//
// THE SAFETY PROPERTY (the whole phase rests on this): on ANY failure — the FOOD_RERANK_OFF
// switch, no/rate-limited key, junk output, an out-of-range index — it returns null, and the
// caller keeps the DETERMINISTIC saved/Basics → OFF → USDA order. So search never depends on
// the AI being up. FOOD_RERANK_OFF=1 forces that path for the fallback proof.
//
// QUOTA: at most ONE Gemini call per non-suppressed search, on the FREE key shared with
// recipe-import + Marty. Token-thrifty: only {i,name,brand,kcal} per candidate leaves the app —
// never the full records. The caller suppresses this call entirely on a confident staple.

import { callGemini } from "../_shared/gemini.ts";
import type { FoodCandidate } from "./normalize.ts";

const SYSTEM =
  `You re-rank food-search results for a grocery/nutrition logger. You are given a QUERY and a ` +
  `numbered list of candidate foods (index i, name, brand, kcal per 100g). Return the up-to-3 ` +
  `indices a person most likely means, MOST RELEVANT FIRST. Prefer the plain generic whole food ` +
  `or the obvious everyday product over obscure, oddly-branded, or unrelated entries. ` +
  `PREFER ENGLISH-LANGUAGE names: when both an English-named entry and a foreign-language entry ` +
  `(German, French, Dutch, etc.) exist for the same food, rank the English one higher. A ` +
  `foreign-language entry is still valid when no English alternative exists — never drop a ` +
  `correct match just because its name isn't English. ` +
  `Drop anything irrelevant. Output ONLY JSON {"top":[indices]} using the given indices, at most 3.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: { top: { type: "ARRAY", items: { type: "INTEGER" } } },
  required: ["top"],
};

// → up-to-`max` valid, distinct indices into `candidates` (best-first), or null (keep the
// deterministic order). Off via FOOD_RERANK_OFF or ANY failure.
export async function rerankTop(query: string, candidates: FoodCandidate[], max = 3): Promise<number[] | null> {
  if (Deno.env.get("FOOD_RERANK_OFF")) return null; // the fallback-proof switch
  if (!candidates.length) return null;

  const slim = candidates.map((c, i) => ({ i, name: c.name, brand: c.brand, kcal: c.per100g.kcal }));
  const res = await callGemini({
    system: SYSTEM,
    user: JSON.stringify({ query, items: slim }),
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });
  if (!res.ok) return null; // rate_limit / error → deterministic fallback

  try {
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(raw) as { top?: unknown };
    const arr = Array.isArray(parsed?.top) ? parsed.top : null;
    if (!arr) return null;
    const seen = new Set<number>();
    const out: number[] = [];
    for (const n of arr) {
      const idx = Number(n);
      if (Number.isInteger(idx) && idx >= 0 && idx < candidates.length && !seen.has(idx)) {
        seen.add(idx);
        out.push(idx);
        if (out.length >= max) break;
      }
    }
    return out.length ? out : null;
  } catch {
    return null; // any parse fault → deterministic fallback
  }
}
