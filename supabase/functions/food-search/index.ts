// LifeOS — Food → food-search (F2): the private food-search edge function.
//
// The FIRST-EVER app→Edge-Function call in LifeOS. Deployed with verify_jwt = TRUE
// (pinned in config.toml) and called AS THE LOGGED-IN OWNER from the app — the gateway
// validates the owner's JWT before this code runs, the opposite of the header-authed
// health-ingest. The app reaches it via supabase.functions.invoke("food-search", {body})
// which auto-attaches the owner's Authorization header (used here for the saved read).
//
// WHAT IT DOES: take a text query → search the owner's saved food_items (their JWT, RLS)
// + Open Food Facts + USDA in parallel → normalise each into the ONE record → dedupe +
// order → return the candidate list. READ-ONLY — it writes nothing (the cache-on-select
// write is F6's job).
//
// DEGRADE, NEVER 500 THE WHOLE SEARCH: each source is independent (Promise.allSettled).
// An OFF/USDA timeout or failure, or a missing/invalid USDA key, drops just that source
// (noted in `sources`) and the rest still return. An empty/nonsense query returns an
// empty list with 200, never an error.
//
// SECRETS (run time only, never in this file / the repo / a response / a log):
//   USDA_FDC_API_KEY  — USDA search (owner-supplied). Absent → USDA simply unavailable.
//   OFF_CONTACT_EMAIL — the contact in OFF's User-Agent (built in off.ts).
//   SUPABASE_URL / SUPABASE_ANON_KEY — auto-injected; the owner-scoped food_items read.

import { type FoodCandidate, isBasic, mergeDedupeOrder, type SourceResult } from "./normalize.ts";
import { searchSaved } from "./saved.ts";
import { searchOff } from "./off.ts";
import { searchUsda, usdaConfigured } from "./usda.ts";
import { rerankTop } from "./rerank.ts";

// CORS — food-search is the FIRST browser-called function in LifeOS (telegram/brief/gym/
// health-ingest are all server-to-server and never needed this). The browser sends a
// preflight OPTIONS before the POST, and EVERY response (success AND error) must carry
// these headers or the browser hides the real status behind a CORS error. Origin '*' is
// safe here: verify_jwt = true means the JWT is the real auth, not the request origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Read the query from the JSON body ({ query: "..." }). Never throws on a missing/!JSON
// body — a blank query is a valid "nothing to search" and returns an empty list.
async function readQuery(req: Request): Promise<string> {
  try {
    const body = await req.json();
    const q = body?.query;
    return typeof q === "string" ? q.trim() : "";
  } catch (_err) {
    return "";
  }
}

// Run a source, turning ANY rejection into an empty result (the search never fails
// because one source did). Returns the SourceResult plus whether it was reachable.
async function safely(p: Promise<SourceResult>): Promise<{ result: SourceResult; ok: boolean }> {
  try {
    return { result: await p, ok: true };
  } catch (_err) {
    return { result: { raw: 0, records: [] }, ok: false };
  }
}

// A CONFIDENT staple (V2 P1 — the primary quota lever): a curated Basics row whose name LEADS
// with the query (e.g. "chicken" → "Chicken breast, cooked", "milk" → "Milk, semi-skimmed"). When
// one exists we SUPPRESS the AI DB zone by default (skip the Gemini rerank → save a call) and the
// UI hides the OFF/USDA results behind a "search the databases →" tap. Conservative on purpose: a
// query the staple name does NOT lead (e.g. "chicken korma") still reranks the databases.
function confidentStaple(query: string, results: FoodCandidate[]): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return false;
  return results.some((c) => isBasic(c) && c.name.toLowerCase().startsWith(q));
}

Deno.serve(async (req) => {
  // The browser preflight — answer it with the CORS headers, before any auth/work.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const query = await readQuery(req);
  if (query.length === 0) {
    return json({ ok: true, query: "", results: [], top3: null, dbSuppressed: false, note: null, sources: { saved: 0, off: 0, usda: 0 } });
  }

  const authHeader = req.headers.get("Authorization");

  // All three sources in parallel; none can sink the others. searchUsda returns [] by
  // itself when the key is absent, so it's always safe to call (usdaConfigured only
  // shapes the `sources` label below, distinguishing "not_configured" from "failed").
  const [saved, off, usda] = await Promise.all([
    safely(searchSaved(query, authHeader)),
    safely(searchOff(query)),
    safely(searchUsda(query)),
  ]);

  const results = mergeDedupeOrder(saved.result.records, off.result.records, usda.result.records);

  // V2 P1 — the reranker + the quota lever. A confident Basics staple SUPPRESSES the AI DB zone
  // (skip the Gemini call; the UI reveals the databases behind a tap). Otherwise ask Gemini for a
  // common-sense top-3 (indices into `results`, ADDITIVE — records are never mutated). ANY rerank
  // failure / FOOD_RERANK_OFF → top3 null → the deterministic saved/Basics → OFF → USDA order stands.
  const dbSuppressed = confidentStaple(query, results);
  const top3 = dbSuppressed ? null : await rerankTop(query, results);

  // Per-source outcome: a count when reachable, "unavailable" when the API failed/timed
  // out, "not_configured" when the USDA key isn't set (OFF/saved still worked).
  const sources = {
    saved: saved.ok ? saved.result.records.length : "unavailable",
    off: off.ok ? off.result.records.length : "unavailable",
    usda: !usdaConfigured ? "not_configured" : usda.ok ? usda.result.records.length : "unavailable",
  };

  // V2 P1 — a QUIET partial-results note when a reachable source degraded (never 500 the search).
  // USDA "not_configured" is NOT a degrade (it was never expected); only a configured source that
  // failed counts. Additive — the P2 UI shows it as a calm line; current consumers ignore it.
  const degraded = [
    saved.ok ? null : "saved foods",
    off.ok ? null : "Open Food Facts",
    !usdaConfigured || usda.ok ? null : "USDA",
  ].filter(Boolean) as string[];
  const note = degraded.length
    ? `Some sources are unavailable right now (${degraded.join(", ")}) — showing what we could reach.`
    : null;

  // Diagnostic: per source, RAW hits the API returned vs how many SURVIVED normalisation,
  // and whether the source was reachable. raw>0 but kept 0 = "came back, got dropped";
  // raw 0 = "nothing matched / source down". Lets the owner see exactly what each did.
  const debug = {
    saved: { raw: saved.result.raw, kept: saved.result.records.length, reachable: saved.ok },
    off: { raw: off.result.raw, kept: off.result.records.length, reachable: off.ok },
    usda: { raw: usda.result.raw, kept: usda.result.records.length, reachable: usda.ok, configured: usdaConfigured },
  };

  return json({ ok: true, query, results, top3, dbSuppressed, note, sources, debug });
});
