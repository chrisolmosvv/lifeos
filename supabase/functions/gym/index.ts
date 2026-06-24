// LifeOS — Health → Gym ("The Form Guide"): the private gym edge function.
//
// ONE function that grows MODES by request body (like `brief`), so the G5 cron
// has a single target. Modes today:
//   • "count"     (G1, the default)  — read the owner's Hevy workout count.
//   • "backfill"  (G3)               — page all of Hevy's workouts into the G2
//                                      tables. One-shot, idempotent, re-runnable.
//   • "sync"      (G4)               — pull only what changed since the last run
//                                      (Hevy's events feed) and apply it: upsert
//                                      adds/edits, remove explicit deletes. The G5
//                                      cron calls this mode on a timer.
//   • "sync_templates" (G6)          — fill the exercise-template dictionary
//                                      (id → name + muscle group) from Hevy. One-shot,
//                                      idempotent, re-runnable.
//
// PRIVATE (deployed WITHOUT --no-verify-jwt, like `brief`, NOT like the public
// `telegram` webhook): the gateway refuses any call without a valid project JWT,
// so only a trusted caller holding a project key can reach it.
//
// SECRETS (all read at run time, never in this file/repo/response/log):
//   HEVY_API_KEY                 — read Hevy (api-key header). Read-only; we never
//                                  call a Hevy write endpoint.
//   SUPABASE_URL / *_SERVICE_ROLE_KEY — auto-injected; used to write the G2 tables
//                                  server-side so owner-only RLS stays intact.
//   OWNER_USER_ID                — the owner's auth.users id (the SAME secret the
//                                  telegram function uses) stamped on every row.

import { countWorkouts, hevyConfigured } from "./hevy.ts";
import { missingStoreSecrets, storeConfigured } from "./store.ts";
import { runBackfill } from "./backfill.ts";
import { runSync } from "./sync.ts";
import { runSyncTemplates } from "./templates.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Read the requested mode from the JSON body; default to "count" (G1 behaviour
// for any old/empty call). Never throws on a missing/!JSON body.
async function readMode(req: Request): Promise<string> {
  try {
    const body = await req.json();
    const mode = body?.mode;
    return typeof mode === "string" && mode.length > 0 ? mode : "count";
  } catch (_err) {
    return "count";
  }
}

Deno.serve(async (req) => {
  // Fail closed if the Hevy secret isn't configured — never run half-wired.
  if (!hevyConfigured) {
    return json({ ok: false, error: "HEVY_API_KEY is not set on this function." }, 500);
  }

  const mode = await readMode(req);

  // ── Mode: count (G1) ──────────────────────────────────────────────────────
  if (mode === "count") {
    try {
      const r = await countWorkouts();
      if (!r.ok) {
        return json({
          ok: false,
          error: `Hevy returned HTTP ${r.status}.`,
          hint: r.status === 401
            ? "Likely a bad or non-Pro Hevy api-key."
            : "Hevy was reachable but did not return a count.",
          hevy_note: r.note,
          rate_limits: r.rate,
        }, 502);
      }
      return json({ ok: true, workout_count: r.count, rate_limits: r.rate });
    } catch (_err) {
      return json({ ok: false, error: "Couldn't reach Hevy just now." }, 502);
    }
  }

  // ── Mode: backfill (G3) ───────────────────────────────────────────────────
  if (mode === "backfill") {
    // The write layer needs its secrets; surface exactly which are missing
    // rather than hardcoding an owner id or writing half the rows.
    if (!storeConfigured) {
      return json({
        ok: false,
        error: "Backfill can't run — missing secret(s) on this function.",
        missing: missingStoreSecrets(),
        hint: "OWNER_USER_ID must be set on the gym function (same value telegram uses).",
      }, 500);
    }
    try {
      const report = await runBackfill();
      return json(report, report.ok ? 200 : 207);
    } catch (_err) {
      return json({ ok: false, error: "Backfill hit an unexpected error and stopped. Re-running is safe." }, 500);
    }
  }

  // ── Mode: sync (G4) ───────────────────────────────────────────────────────
  if (mode === "sync") {
    if (!storeConfigured) {
      return json({
        ok: false,
        error: "Sync can't run — missing secret(s) on this function.",
        missing: missingStoreSecrets(),
        hint: "OWNER_USER_ID must be set on the gym function (same value telegram uses).",
      }, 500);
    }
    try {
      const report = await runSync();
      // 200 on a clean pass; 207 when it stopped early (partial/again — re-run is safe).
      return json(report, report.ok ? 200 : 207);
    } catch (_err) {
      return json({ ok: false, error: "Sync hit an unexpected error and stopped. Re-running is safe." }, 500);
    }
  }

  // ── Mode: sync_templates (G6) ─────────────────────────────────────────────
  if (mode === "sync_templates") {
    if (!storeConfigured) {
      return json({
        ok: false,
        error: "Template sync can't run — missing secret(s) on this function.",
        missing: missingStoreSecrets(),
        hint: "OWNER_USER_ID must be set on the gym function (same value telegram uses).",
      }, 500);
    }
    try {
      const report = await runSyncTemplates();
      return json(report, report.ok ? 200 : 207);
    } catch (_err) {
      return json({ ok: false, error: "Template sync hit an unexpected error and stopped. Re-running is safe." }, 500);
    }
  }

  return json({ ok: false, error: `Unknown mode "${mode}". Use "count", "backfill", "sync", or "sync_templates".` }, 400);
});
