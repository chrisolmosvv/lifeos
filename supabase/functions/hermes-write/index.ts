// LifeOS — hermes-write: a secret-authed write function for the external Hermes agent.
//
// Accepts a typed payload { kind, data, confirmed? } and logs it undoably into LifeOS.
// Domains: task, event, food, weight/body, sleep, focus, undo. GYM IS EXCLUDED.
//
// SAFETY RULES (non-negotiable):
//   1. No raw/arbitrary writes — the function fully controls every insert per kind.
//   2. UNDO-LOGGED ALWAYS — every write records to marty_actions FIRST so the existing
//      DELETE-by-id undo can reverse it. If the undo log fails, the data write is skipped.
//   3. CONFIRM-GATE — body/sleep and food(is_estimated=true) require confirmed=true.
//   4. TYPED + BOUNDED — required fields, enums, and plausible ranges are validated.
//   5. DEDUP — upsert for body/sleep (natural keys); check-before-insert for the rest.
//   6. FOOD = macro SNAPSHOT — macros are frozen at write time, never re-read.
//   7. SOURCE TAGS — food='hermes', focus='hermes', task='hermes', body/sleep='hermes'.
//   8. AUTH — X-Hermes-Write-Secret header, separate from the read secret.
//   9. Owner-scoped to OWNER_USER_ID always.
//
// Secrets (runtime only, never in this file / the repo / a response / a log):
//   HERMES_WRITE_SECRET — must match the X-Hermes-Write-Secret request header.
//   OWNER_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected / Vault.

import { addDaysYMD, localToUtc, todayYMD } from "../_shared/datetime.ts";
import { configured, del, insert, OWNER_USER_ID, patch, select, upsert } from "./sb.ts";
import { handlePerson, handleNote, handleCatchup, handleConnect } from "./people.ts";

const SECRET = Deno.env.get("HERMES_WRITE_SECRET");

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function fail(error: string, status = 400) {
  return json({ ok: false, error }, status);
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
const isTime = (v: unknown) => isStr(v) && /^\d{2}:\d{2}$/.test(v.trim());
const isIso = (v: unknown) => isStr(v) && !isNaN(new Date(v).getTime());
const isUuid = (v: unknown) => isStr(v) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
const nn = (v: unknown) => (isNum(v) && v >= 0 ? v : null); // non-negative number or null
const optInt = (v: unknown, lo: number, hi: number) => (isInt(v) && v >= lo && v <= hi ? v : null);

// ── Undo log ─────────────────────────────────────────────────────────────────

async function logCreate(
  table: string,
  id: string,
  label: string,
): Promise<string | null> {
  const row = await insert("marty_actions", {
    user_id: OWNER_USER_ID,
    kind: "create",
    label,
    items: [{ table, id, title: label }],
  });
  return row ? String(row.id) : null;
}

// ── Dedup: check-before-insert within a 2-minute window ──────────────────────

const DEDUP_WINDOW_ISO = () => new Date(Date.now() - 2 * 60_000).toISOString();

async function isDupe(query: string): Promise<boolean> {
  const rows = await select(query);
  return rows !== null && rows.length > 0;
}

// ── Kind handlers ────────────────────────────────────────────────────────────

type D = Record<string, unknown>;
type Result = Response;

async function handleTask(data: D): Promise<Result> {
  const title = isStr(data.title) ? data.title.trim().slice(0, 500) : "";
  if (!title) return fail("task requires a non-empty title");
  const dueDate = isDate(data.due_date) ? (data.due_date as string).trim() : null;
  const today = todayYMD();
  let bucket = "Today";
  if (isStr(data.time_bucket) && ["Today", "This Week", "Someday"].includes(data.time_bucket as string)) {
    bucket = data.time_bucket as string;
  } else if (dueDate) {
    bucket = dueDate === today ? "Today" : "This Week";
  }
  const categoryId = isUuid(data.category_id) ? (data.category_id as string).trim() : null;

  // Dedup
  const esc = encodeURIComponent(title);
  if (await isDupe(
    `tasks?user_id=eq.${OWNER_USER_ID}&title=eq.${esc}&status=eq.open&created_at=gte.${DEDUP_WINDOW_ISO()}&select=id&limit=1`,
  )) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  const saved = await insert("tasks", {
    user_id: OWNER_USER_ID, title, status: "open", time_bucket: bucket,
    due_date: dueDate, category_id: categoryId, source: "hermes",
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const undoId = await logCreate("tasks", id, title);
  if (!undoId) { await del(`tasks?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleEvent(data: D): Promise<Result> {
  const title = isStr(data.title) ? data.title.trim().slice(0, 500) : "";
  if (!title) return fail("event requires a non-empty title");
  if (!isDate(data.date)) return fail("event requires date (YYYY-MM-DD)");
  if (!isTime(data.time)) return fail("event requires time (HH:MM)");
  const date = (data.date as string).trim();
  const time = (data.time as string).trim();
  const durMin = isInt(data.duration_minutes) && (data.duration_minutes as number) >= 1 && (data.duration_minutes as number) <= 1440
    ? (data.duration_minutes as number) : 60;
  const categoryId = isUuid(data.category_id) ? (data.category_id as string).trim() : null;

  const startAt = localToUtc(date, time);
  const endAt = new Date(startAt.getTime() + durMin * 60_000);
  const startIso = startAt.toISOString();

  // Dedup
  const esc = encodeURIComponent(title);
  if (await isDupe(
    `events?user_id=eq.${OWNER_USER_ID}&title=eq.${esc}&start_at=eq.${startIso}&created_at=gte.${DEDUP_WINDOW_ISO()}&select=id&limit=1`,
  )) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  const saved = await insert("events", {
    user_id: OWNER_USER_ID, title, category_id: categoryId,
    start_at: startIso, end_at: endAt.toISOString(),
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const undoId = await logCreate("events", id, title);
  if (!undoId) { await del(`events?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleFood(data: D, confirmed: boolean): Promise<Result> {
  if (!isDate(data.entry_date)) return fail("food requires entry_date (YYYY-MM-DD)");
  const MEALS = ["breakfast", "lunch", "dinner", "snacks"];
  if (!isStr(data.meal_slot) || !MEALS.includes(data.meal_slot as string))
    return fail(`food requires meal_slot: ${MEALS.join(", ")}`);
  if (!isNum(data.kcal) || (data.kcal as number) < 0) return fail("food requires kcal >= 0");
  if (!isNum(data.protein) || (data.protein as number) < 0) return fail("food requires protein >= 0");
  if (!isNum(data.carbs) || (data.carbs as number) < 0) return fail("food requires carbs >= 0");
  if (!isNum(data.fat) || (data.fat as number) < 0) return fail("food requires fat >= 0");
  const label = isStr(data.entry_label) ? data.entry_label.trim().slice(0, 200) : "";
  if (!label) return fail("food requires a non-empty entry_label");

  const isEstimated = isBool(data.is_estimated) ? data.is_estimated : false;
  if (isEstimated && !confirmed) return fail("food with is_estimated=true requires confirmed=true", 422);

  const entryDate = (data.entry_date as string).trim();
  const mealSlot = (data.meal_slot as string).trim();

  // Dedup
  const escLabel = encodeURIComponent(label);
  if (await isDupe(
    `food_log_entries?user_id=eq.${OWNER_USER_ID}&entry_date=eq.${entryDate}&meal_slot=eq.${mealSlot}&entry_label=eq.${escLabel}&created_at=gte.${DEDUP_WINDOW_ISO()}&select=id&limit=1`,
  )) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  const saved = await insert("food_log_entries", {
    user_id: OWNER_USER_ID, entry_date: entryDate, meal_slot: mealSlot,
    entry_source: "hermes", entry_label: label, is_estimated: isEstimated,
    food_item_id: null, recipe_id: null,
    amount: isNum(data.amount) && (data.amount as number) > 0 ? data.amount : 1,
    unit: isStr(data.unit) ? (data.unit as string).trim().slice(0, 50) : "serving",
    kcal: data.kcal, protein: data.protein, carbs: data.carbs, fat: data.fat,
    fibre: nn(data.fibre), sugar: nn(data.sugar), sodium: nn(data.sodium),
    is_alcohol: isBool(data.is_alcohol) ? data.is_alcohol : false,
    alcohol_units: nn(data.alcohol_units),
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const undoLabel = `${mealSlot} — ${label}`;
  const undoId = await logCreate("food_log_entries", id, undoLabel);
  if (!undoId) { await del(`food_log_entries?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleWeight(data: D): Promise<Result> {
  if (!isNum(data.value) || (data.value as number) <= 0 || (data.value as number) >= 500)
    return fail("weight requires value > 0 and < 500");
  const TYPES = ["weight", "body_fat", "lean_mass", "bmi"];
  const metricType = isStr(data.metric_type) && TYPES.includes(data.metric_type as string)
    ? (data.metric_type as string) : "weight";
  const unit = isStr(data.unit) ? (data.unit as string).trim().slice(0, 10) : "kg";
  const readingAt = isIso(data.reading_at) ? new Date(data.reading_at as string).toISOString() : new Date().toISOString();
  const metricDate = todayYMD(); // Amsterdam day

  // Upsert on natural key — no manual dedup needed.
  const saved = await upsert("body_metrics", {
    user_id: OWNER_USER_ID, metric_date: metricDate, metric_type: metricType,
    value: data.value, unit, reading_at: readingAt, source: "hermes",
  }, "user_id,metric_type,reading_at,source");
  if (!saved) return fail("upsert failed", 500);
  const id = String(saved.id);
  const label = `${metricType}: ${data.value} ${unit}`;
  const undoId = await logCreate("body_metrics", id, label);
  if (!undoId) { await del(`body_metrics?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleSleep(data: D): Promise<Result> {
  if (!isDate(data.night_date)) return fail("sleep requires night_date (YYYY-MM-DD)");
  if (!isInt(data.asleep_minutes) || (data.asleep_minutes as number) < 0 || (data.asleep_minutes as number) > 1440)
    return fail("sleep requires asleep_minutes (0–1440)");

  const nightDate = (data.night_date as string).trim();

  const saved = await upsert("sleep_nights", {
    user_id: OWNER_USER_ID, night_date: nightDate,
    asleep_minutes: data.asleep_minutes, source: "hermes",
    in_bed_at: isIso(data.in_bed_at) ? new Date(data.in_bed_at as string).toISOString() : null,
    woke_at: isIso(data.woke_at) ? new Date(data.woke_at as string).toISOString() : null,
    rem_minutes: optInt(data.rem_minutes, 0, 1440),
    core_minutes: optInt(data.core_minutes, 0, 1440),
    deep_minutes: optInt(data.deep_minutes, 0, 1440),
    awake_minutes: optInt(data.awake_minutes, 0, 1440),
    awakenings: optInt(data.awakenings, 0, 100),
    updated_at: new Date().toISOString(),
  }, "user_id,night_date");
  if (!saved) return fail("upsert failed", 500);
  const id = String(saved.id);
  const label = `Sleep — ${nightDate}`;
  const undoId = await logCreate("sleep_nights", id, label);
  if (!undoId) { await del(`sleep_nights?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleFocus(data: D): Promise<Result> {
  if (!isIso(data.started_at)) return fail("focus requires started_at (ISO 8601)");
  if (!isIso(data.ended_at)) return fail("focus requires ended_at (ISO 8601)");
  const startedAt = new Date(data.started_at as string);
  const endedAt = new Date(data.ended_at as string);
  if (endedAt.getTime() <= startedAt.getTime()) return fail("ended_at must be after started_at");

  const MODES = ["count_up", "count_down", "intervals"];
  const mode = isStr(data.mode) && MODES.includes(data.mode as string) ? (data.mode as string) : "count_up";
  const taskSnap = isStr(data.task_title_snapshot) ? (data.task_title_snapshot as string).trim().slice(0, 500) : null;
  const rating = optInt(data.rating, 1, 5);
  const note = isStr(data.note) ? (data.note as string).trim().slice(0, 1000) : null;

  const startIso = startedAt.toISOString();

  // Dedup
  if (await isDupe(
    `focus_sessions?user_id=eq.${OWNER_USER_ID}&started_at=eq.${startIso}&archived_at=is.null&created_at=gte.${DEDUP_WINDOW_ISO()}&select=id&limit=1`,
  )) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  const saved = await insert("focus_sessions", {
    user_id: OWNER_USER_ID, started_at: startIso, ended_at: endedAt.toISOString(),
    mode, source: "hermes", task_title_snapshot: taskSnap,
    rating, note, segments: [],
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const durMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
  const label = taskSnap ? `Focus — ${taskSnap}` : `Focus — ${durMin}m`;
  const undoId = await logCreate("focus_sessions", id, label);
  if (!undoId) { await del(`focus_sessions?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId });
}

async function handleUndo(): Promise<Result> {
  const rows = await select(
    `marty_actions?user_id=eq.${OWNER_USER_ID}&select=id,kind,label,items&order=created_at.desc&limit=1`,
  );
  if (rows === null) return fail("couldn't reach the undo log", 500);
  if (rows.length === 0) return fail("nothing to undo");

  const action = rows[0] as { id: string; kind: string; label?: string; items: Array<{ table: string; id: string; title?: string; before?: Record<string, unknown> }> };
  const items = Array.isArray(action.items) ? action.items : [];

  const reversed: string[] = [];
  const gone: string[] = [];
  let failed = false;

  if (action.kind === "create") {
    for (const item of items) {
      const deleted = await del(`${item.table}?id=eq.${item.id}&user_id=eq.${OWNER_USER_ID}&select=id`);
      if (deleted === null) { failed = true; continue; }
      if (deleted.length > 0) reversed.push(item.title ?? "");
      else gone.push(item.title ?? "");
    }
  } else if (action.kind === "edit") {
    for (const item of items) {
      if (!item.before) { gone.push(item.title ?? ""); continue; }
      const patched = await patch(`${item.table}?id=eq.${item.id}&user_id=eq.${OWNER_USER_ID}`, item.before);
      if (patched === null) { failed = true; continue; }
      reversed.push(item.title ?? "");
    }
  } else {
    return fail("only create and edit actions can be undone via hermes-write");
  }

  if (failed) return fail("couldn't fully undo — try again", 500);
  await del(`marty_actions?id=eq.${action.id}&user_id=eq.${OWNER_USER_ID}`);

  return json({
    ok: true,
    undone: reversed,
    already_gone: gone,
    label: action.label,
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  // Auth
  if (!SECRET) return fail("not_configured", 500);
  const sent = req.headers.get("x-hermes-write-secret") ?? "";
  if (!sent || !timingSafeEqual(sent, SECRET)) return fail("unauthorized", 401);
  if (!configured) return fail("server_misconfigured", 500);

  // Parse body
  let body: { kind?: unknown; data?: unknown; confirmed?: unknown };
  try { body = await req.json(); } catch { return fail("bad_json"); }
  const kind = typeof body.kind === "string" ? body.kind : "";
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as D;
  const confirmed = body.confirmed === true;

  // Confirm-gate: body/sleep/person/connect and estimated food require confirmed=true
  if ((kind === "weight" || kind === "sleep" || kind === "person" || kind === "connect") && !confirmed) {
    return fail(`${kind} requires confirmed=true`, 422);
  }

  switch (kind) {
    case "task": return await handleTask(data);
    case "event": return await handleEvent(data);
    case "food": return await handleFood(data, confirmed);
    case "weight": return await handleWeight(data);
    case "sleep": return await handleSleep(data);
    case "focus": return await handleFocus(data);
    case "person": return await handlePerson(data);
    case "note": return await handleNote(data);
    case "catchup": return await handleCatchup(data);
    case "connect": return await handleConnect(data);
    case "undo": return await handleUndo();
    default: return fail(`unknown kind "${kind}" — use task, event, food, weight, sleep, focus, person, note, catchup, connect, or undo`);
  }
});
