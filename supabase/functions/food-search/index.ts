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

import { type FoodCandidate, mergeDedupeOrder } from "./normalize.ts";
import { searchSaved } from "./saved.ts";
import { searchOff } from "./off.ts";
import { searchUsda, usdaConfigured } from "./usda.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
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

// Run a source, turning ANY rejection into an empty list (the search never fails because
// one source did). Returns the records plus whether the source was actually reachable.
async function safely(p: Promise<FoodCandidate[]>): Promise<{ records: FoodCandidate[]; ok: boolean }> {
  try {
    return { records: await p, ok: true };
  } catch (_err) {
    return { records: [], ok: false };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const query = await readQuery(req);
  if (query.length === 0) {
    return json({ ok: true, query: "", results: [], sources: { saved: 0, off: 0, usda: 0 } });
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

  const results = mergeDedupeOrder(saved.records, off.records, usda.records);

  // Per-source outcome: a count when reachable, "unavailable" when the API failed/timed
  // out, "not_configured" when the USDA key isn't set (OFF/saved still worked).
  const sources = {
    saved: saved.ok ? saved.records.length : "unavailable",
    off: off.ok ? off.records.length : "unavailable",
    usda: !usdaConfigured ? "not_configured" : usda.ok ? usda.records.length : "unavailable",
  };

  return json({ ok: true, query, results, sources });
});
