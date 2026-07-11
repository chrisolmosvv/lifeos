// LifeOS — hermes-write: health domain handlers (H-0 split).
//
// Four kinds: food (log entry), weight/body (metric), sleep (night), focus
// (session). Each follows the standard pattern: validate → dedup → insert/
// upsert → marty_actions → rollback on undo-log failure.
// All owner-scoped via OWNER_USER_ID stamped explicitly.

import { todayYMD } from "../_shared/datetime.ts";
import { del, insert, OWNER_USER_ID, select, upsert } from "./sb.ts";

type D = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { "Content-Type": "application/json" },
  });
}
function fail(error: string, status = 400) { return json({ ok: false, error }, status); }
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
const isIso = (v: unknown) => isStr(v) && !isNaN(new Date(v).getTime());
const nn = (v: unknown) => (isNum(v) && v >= 0 ? v : null);
const optInt = (v: unknown, lo: number, hi: number) => (isInt(v) && v >= lo && v <= hi ? v : null);
const DEDUP_ISO = () => new Date(Date.now() - 2 * 60_000).toISOString();

async function logCreate(table: string, id: string, label: string): Promise<string | null> {
  const r = await insert("marty_actions", {
    user_id: OWNER_USER_ID, kind: "create", label, items: [{ table, id, title: label }],
  });
  return r ? String(r.id) : null;
}
async function isDupe(query: string): Promise<boolean> {
  const rows = await select(query);
  return rows !== null && rows.length > 0;
}

// ── kind: "food" ────────────────────────────────────────────────────────────

export async function handleFood(data: D, confirmed: boolean): Promise<Response> {
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

  const escLabel = encodeURIComponent(label);
  if (await isDupe(
    `food_log_entries?user_id=eq.${OWNER_USER_ID}&entry_date=eq.${entryDate}&meal_slot=eq.${mealSlot}&entry_label=eq.${escLabel}&created_at=gte.${DEDUP_ISO()}&select=id&limit=1`,
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

// ── kind: "weight" ──────────────────────────────────────────────────────────

export async function handleWeight(data: D): Promise<Response> {
  if (!isNum(data.value) || (data.value as number) <= 0 || (data.value as number) >= 500)
    return fail("weight requires value > 0 and < 500");
  const TYPES = ["weight", "body_fat", "lean_mass", "bmi"];
  const metricType = isStr(data.metric_type) && TYPES.includes(data.metric_type as string)
    ? (data.metric_type as string) : "weight";
  const unit = isStr(data.unit) ? (data.unit as string).trim().slice(0, 10) : "kg";
  const readingAt = isIso(data.reading_at) ? new Date(data.reading_at as string).toISOString() : new Date().toISOString();
  const metricDate = todayYMD();

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

// ── kind: "sleep" ───────────────────────────────────────────────────────────

export async function handleSleep(data: D): Promise<Response> {
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

// ── kind: "focus" ───────────────────────────────────────────────────────────

export async function handleFocus(data: D): Promise<Response> {
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

  if (await isDupe(
    `focus_sessions?user_id=eq.${OWNER_USER_ID}&started_at=eq.${startIso}&archived_at=is.null&created_at=gte.${DEDUP_ISO()}&select=id&limit=1`,
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
