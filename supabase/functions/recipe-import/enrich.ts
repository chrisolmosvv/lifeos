// LifeOS — Food → recipe-import (Cookbook rebuild, Piece 2a): PASS 2, enrichment.
//
// Takes Pass 1's finished body (ingredients + base steps) and asks Gemini, seeing the whole
// recipe at once, for per-step scheduling metadata (duration, tag, station, hold_tolerance) plus
// any GENERATED PREP STEPS. Pass 2 never renumbers the base steps — prep comes back in its own
// array and is spliced in HERE, in deterministic code, so the dependency graph never rests on the
// model renumbering a reshaped list.
//
// SPLICE RULE: valid prep steps take the front (final indices 0..P-1); the base steps shift back
// by P. A base step's own depends_on shift by +P; the base step that a prep FEEDS also gains that
// prep's index as a dependency (the cook step waits for its mise-en-place). Prep steps depend on
// nothing. This is correct-by-construction and needs no trust in model-supplied global numbering.
//
// A Pass 2 failure must NOT lose the Pass 1 result: enrich() returns { enriched: false } and the
// base steps unchanged (duration/tag/station/hold absent), never throwing away the body.

import { callGemini } from "../_shared/gemini.ts";
import { PASS2_SYSTEM, PASS2_SCHEMA } from "./schema.ts";
import {
  type Pass1Body,
  parseJson,
  numOrNull,
  intOrNull,
  strOrNull,
  tagOrNull,
  stationOrNull,
  holdOrNull,
  confOrNull,
  cleanLabel,
} from "./normalise.ts";

export type Confidence = { duration: string | null; tag: string | null; station: string | null; hold_tolerance: string | null } | null;
export type FinalStep = {
  text: string;
  original: string;
  duration_seconds: number | null;
  tag: string | null;
  station: string | null;
  hold_tolerance: string | null;
  is_prep: boolean;
  depends_on: number[] | null;
  confidence: Confidence;
};

function confObj(c: unknown): Confidence {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  return { duration: confOrNull(o.duration), tag: confOrNull(o.tag), station: confOrNull(o.station), hold_tolerance: confOrNull(o.hold_tolerance) };
}

const uniq = (a: number[]) => [...new Set(a)];

// The base steps carried through unenriched (Pass 2 unavailable / failed). hold defaults to
// "short" per spec ("default 'short' for anything unclear"); tag/station stay null so the review
// screen flags a real gap rather than fabricating a load-bearing value.
function bareSteps(body: Pass1Body): FinalStep[] {
  return body.steps.map((s) => ({
    text: s.text,
    original: s.original,
    duration_seconds: null,
    tag: null,
    station: null,
    hold_tolerance: "short",
    is_prep: false,
    depends_on: s.depends_on,
    confidence: null,
  }));
}

// Build the compact Pass 2 input: just what the scheduler needs (ingredient identities + the
// numbered base steps), keeping the prompt small.
function pass2Input(body: Pass1Body): string {
  return JSON.stringify({
    ingredients: body.ingredients.map((i) => ({ name: i.name, raw_text: i.raw_text })),
    steps: body.steps.map((s, i) => ({ index: i, text: s.text })),
  });
}

type PrepDraft = FinalStep & { feeds: number };

// Validate + shape the model's prep_steps. Keep only those with real text and an in-range
// feeds_step; default tag→hands_on, station→bench, hold→short (prep is almost always so).
function validPreps(raw: unknown, stepCount: number): PrepDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: PrepDraft[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const text = cleanLabel(strOrNull(o.text) || "");
    const feeds = intOrNull(o.feeds_step);
    if (!text || feeds == null || feeds >= stepCount) continue;
    out.push({
      text,
      original: text,
      duration_seconds: numOrNull(o.duration_seconds),
      tag: tagOrNull(o.tag) ?? "hands_on",
      station: stationOrNull(o.station) ?? "bench",
      hold_tolerance: holdOrNull(o.hold_tolerance) ?? "short",
      is_prep: true,
      depends_on: null,
      confidence: confObj(o.confidence),
      feeds,
    });
  }
  return out;
}

// The result: the final step list, whether enrichment ran, and how many prep steps were spliced
// in front (index.ts shifts ingredient step_number by this so links still point at the cook step).
export type EnrichResult = { steps: FinalStep[]; enriched: boolean; prepCount: number; prepTexts: string[] };

export async function enrich(body: Pass1Body): Promise<EnrichResult> {
  if (!body.steps.length) return { steps: bareSteps(body), enriched: false, prepCount: 0, prepTexts: [] };

  const res = await callGemini({
    system: PASS2_SYSTEM,
    user: pass2Input(body).slice(0, 12000),
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: PASS2_SCHEMA },
  });
  if (!res.ok) return { steps: bareSteps(body), enriched: false, prepCount: 0, prepTexts: [] };

  const parsed = parseJson(res.text);
  const metaSteps = parsed && Array.isArray(parsed.steps) ? (parsed.steps as Record<string, unknown>[]) : null;
  if (!metaSteps) return { steps: bareSteps(body), enriched: false, prepCount: 0, prepTexts: [] };

  const N = body.steps.length;
  const preps = validPreps(parsed?.prep_steps, N);
  const P = preps.length;

  // Prep steps first (indices 0..P-1), each depending on nothing. Drop the internal `feeds` field.
  const finalPreps: FinalStep[] = preps.map(({ feeds: _f, ...rest }) => rest);

  // Base steps shift back by P; add the feeding prep's index to the step it feeds.
  const finalBase: FinalStep[] = body.steps.map((s, i) => {
    const meta = metaSteps[i] || {};
    const shifted = (s.depends_on || []).map((d) => d + P);
    const feeders = preps.map((p, idx) => (p.feeds === i ? idx : -1)).filter((x) => x >= 0);
    const deps = uniq([...shifted, ...feeders]);
    return {
      text: s.text,
      original: s.original,
      duration_seconds: numOrNull(meta.duration_seconds),
      tag: tagOrNull(meta.tag),
      station: stationOrNull(meta.station),
      hold_tolerance: holdOrNull(meta.hold_tolerance) ?? "short",
      is_prep: false,
      depends_on: deps.length ? deps : null,
      confidence: confObj(meta.confidence),
    };
  });

  return { steps: [...finalPreps, ...finalBase], enriched: true, prepCount: P, prepTexts: preps.map((p) => p.text) };
}
