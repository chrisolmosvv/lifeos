// LifeOS — Health → Gym ("The Form Guide"), G1: prove the Hevy connection.
//
// This is the FIRST Gym backend piece: a PLUMBING probe. It reads the owner's
// Hevy workout COUNT and returns it as plain JSON. Nothing else — no database,
// no tables, no Telegram, no schedule, no UI. It only ever READS Hevy.
//
// PRIVATE function (deployed WITHOUT --no-verify-jwt, exactly like `brief`, NOT
// like the public `telegram` webhook): the function gateway refuses any call
// that doesn't carry a valid project JWT, so only a trusted caller holding a
// project key (the service-role key, or the anon key) can reach it. The later
// twice-daily sync (G5) will call this same function with the service-role key
// from the Vault, the same way the 7am cron calls `brief`.
//
// THE HEVY KEY IS A SECRET. It lives ONLY in Supabase's secret store as
// HEVY_API_KEY and is read here at run time. It is NEVER written to this file,
// committed to the repo, returned in a response, or logged. (The repo is public.)
//
// HEVY API (read-only — we never call a write endpoint):
//   base   https://api.hevyapp.com
//   auth   header `api-key: <key>`   (Hevy Pro only)
//   here   GET /v1/workouts/count  →  { "workout_count": <number> }
//
// G1 also lets us READ Hevy's own rate-limit policy: we echo back any
// rate-limit / retry headers Hevy sends, so we can confirm (before G5) that a
// twice-daily sync sits safely inside Hevy's limits. (Reporting only — we change
// nothing based on them yet.)

const HEVY_API_KEY = Deno.env.get("HEVY_API_KEY");
const HEVY_BASE = "https://api.hevyapp.com";

// Rate-limit-ish headers worth surfacing if Hevy includes any of them. We pass
// through whatever is present; Hevy may use only some (or none) of these.
const RATE_HEADERS = [
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Collect any rate-limit headers Hevy returned, so the test invocation reveals
// the real policy. Returns {} when Hevy sends none.
function rateLimitInfo(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of RATE_HEADERS) {
    const v = res.headers.get(name);
    if (v !== null) out[name] = v;
  }
  return out;
}

Deno.serve(async () => {
  // Fail closed if the secret isn't configured — never run half-wired.
  if (!HEVY_API_KEY) {
    return json({ ok: false, error: "HEVY_API_KEY is not set on this function." }, 500);
  }

  try {
    const res = await fetch(`${HEVY_BASE}/v1/workouts/count`, {
      method: "GET",
      headers: { "api-key": HEVY_API_KEY, "Accept": "application/json" },
    });

    const rate_limits = rateLimitInfo(res);

    if (!res.ok) {
      // Surface Hevy's status so a bad key (401) / wrong plan / outage is obvious.
      // We do NOT echo the key or the raw error body verbatim beyond a short note.
      const note = await res.text().catch(() => "");
      return json({
        ok: false,
        error: `Hevy returned HTTP ${res.status}.`,
        hint: res.status === 401
          ? "Likely a bad or non-Pro Hevy api-key."
          : "Hevy was reachable but did not return a count.",
        hevy_note: note.slice(0, 200),
        rate_limits,
      }, 502);
    }

    const data = await res.json().catch(() => null);
    // Hevy returns { "workout_count": <number> }; accept a couple of shapes defensively.
    const count = (data && typeof data === "object")
      ? (data.workout_count ?? data.count ?? null)
      : null;

    if (count === null || typeof count !== "number") {
      return json({
        ok: false,
        error: "Hevy responded, but no workout count was found in the reply.",
        raw: data,
        rate_limits,
      }, 502);
    }

    return json({ ok: true, workout_count: count, rate_limits });
  } catch (_err) {
    // Network hiccup / Hevy unreachable. Never leak anything secret.
    return json({ ok: false, error: "Couldn't reach Hevy just now." }, 502);
  }
});
