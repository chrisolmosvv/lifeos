// LifeOS — Health → Sleep & Body Stats: the private ingest edge function (S1).
//
// THIS PIECE (S1) PROVES THE PIPE ONLY. An on-device Apple Shortcut reads Apple
// Health and POSTs one number here; this function authenticates the call and
// echoes the number back as proof the path works end-to-end. It does NOT touch
// any table — real parsing + upsert lands in S2/S3.
//
// PUBLIC URL, BUT SELF-AUTHENTICATED. Deployed WITHOUT a project JWT
// (`--no-verify-jwt`, like the `telegram` webhook) because the Shortcut holds no
// Supabase login. We do our own gate instead: every request must carry the
// shared secret in the `x-health-secret` header, or it is refused (401).
//
// SECRET (read at run time, never in this file / the repo / a response / a log):
//   HEALTH_INGEST_SECRET  — must match the `x-health-secret` request header.

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SECRET = Deno.env.get("HEALTH_INGEST_SECRET");

Deno.serve(async (req) => {
  // Only POST — the Shortcut POSTs; anything else is not our caller.
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // The secret must be configured on the server, or we can't gate safely.
  if (!SECRET) {
    return json({ ok: false, error: "secret_not_configured" }, 500);
  }

  // The gate: the request must present the matching shared secret.
  if (req.headers.get("x-health-secret") !== SECRET) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  // Parse the tiny S1 payload: { metric, value, unit }. Bad JSON → 400.
  let payload: { metric?: unknown; value?: unknown; unit?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const { metric, value, unit } = payload ?? {};

  // Proof of life: echo exactly what we received. No table is written.
  return json({ ok: true, received: { metric, value, unit } }, 200);
});
