// LifeOS — Health → Sleep & Body Stats: the private ingest edge function.
//
// An on-device Apple Shortcut reads Apple Health and POSTs here. This file is the
// THIN FRONT DOOR only: authenticate → route by `kind` → return counts. The real
// parse + write lives in the per-kind modules.
//   • kind "body"  (S3a)  → ./body.ts → upsert into body_metrics. GENERIC: any
//                            metric_type (weight, body_fat, lean_mass, bmi, …).
//   • kind "sleep" (S3b, later) → not handled yet.
//
// ONE endpoint for BOTH the one-time backfill (a wide date window) and the 4×/day
// runs — re-sends dedupe on the table's unique key, so no "mode" flag is needed.
//
// PUBLIC URL, BUT SELF-AUTHENTICATED. Deployed WITHOUT a project JWT
// (`--no-verify-jwt`, like the `telegram` webhook) because the Shortcut holds no
// Supabase login. Every request must carry the shared secret in `x-health-secret`.
//
// SECRETS (read at run time, never in this file / the repo / a response / a log):
//   HEALTH_INGEST_SECRET  — must match the `x-health-secret` request header.
//   OWNER_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — the server-side write
//                            (see ./store.ts); auto-injected except OWNER_USER_ID.

import { ingestBody } from "./body.ts";
import { missingStoreSecrets, storeConfigured } from "./store.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SECRET = Deno.env.get("HEALTH_INGEST_SECRET");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  if (!SECRET) {
    return json({ ok: false, error: "secret_not_configured" }, 500);
  }
  if (req.headers.get("x-health-secret") !== SECRET) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let payload: { kind?: unknown; readings?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  if (payload?.kind === "body") {
    // Fail closed with the missing names (never a hardcoded id) if a secret is absent.
    if (!storeConfigured) {
      return json({ ok: false, error: "server_misconfigured", missing: missingStoreSecrets() }, 500);
    }
    const result = await ingestBody(payload);
    if (!result.ok) return json({ ok: false, error: result.error }, result.status);
    return json(
      {
        ok: true,
        inserted: result.inserted,
        skipped: result.skipped,
        ...(result.skipped_detail ? { skipped_detail: result.skipped_detail } : {}),
      },
      200,
    );
  }

  return json({ ok: false, error: "unknown_kind", hint: "expected kind:'body'" }, 400);
});
