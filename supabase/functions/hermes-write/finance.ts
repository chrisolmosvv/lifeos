// LifeOS — hermes-write: finance domain handler (H-fin-a).
//
// One kind: transaction (create-only, direct-log, no confirm required).
// Follows the standard pattern: validate → account check → dedup → insert →
// marty_actions → rollback on undo-log failure.
// Owner-scoped via OWNER_USER_ID stamped explicitly.
//
// NO transfer support — txn_type must be 'income' or 'expense'.
// Category auto-guess is a box-skill concern, not this handler's job.

import { todayYMD } from "../_shared/datetime.ts";
import { del, insert, OWNER_USER_ID, select } from "./sb.ts";

type D = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { "Content-Type": "application/json" },
  });
}
function fail(error: string, status = 400) { return json({ ok: false, error }, status); }
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
const isUuid = (v: unknown) => isStr(v) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
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

// ── kind: "transaction" — log an income or expense (direct-log) ──────────

export async function handleTransaction(data: D): Promise<Response> {
  // Validate txn_type — income or expense only, no transfers via Hermes.
  const TYPES = ["income", "expense"];
  const txnType = isStr(data.txn_type) && TYPES.includes(data.txn_type as string)
    ? (data.txn_type as string) : null;
  if (!txnType) return fail("transaction requires txn_type: 'income' or 'expense' (transfers are not supported via chat)");

  // Validate amount — must be a positive number (sign derived from txn_type).
  if (!isNum(data.amount) || (data.amount as number) <= 0)
    return fail("transaction requires a positive amount");
  const rawAmount = data.amount as number;
  const signedAmount = txnType === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  // Validate description.
  const description = isStr(data.description) ? data.description.trim().slice(0, 500) : "";
  if (!description) return fail("transaction requires a non-empty description");

  // entry_date: default to today (Amsterdam day) if omitted.
  const entryDate = isDate(data.entry_date) ? (data.entry_date as string).trim() : todayYMD();

  // category_id: optional, not validated beyond UUID shape — a stale id is "already gone."
  const categoryId = isUuid(data.category_id) ? (data.category_id as string).trim() : null;

  // Account validation: must be a real, non-archived account belonging to the owner.
  const accountId = isUuid(data.account_id) ? (data.account_id as string).trim() : null;
  const accounts = await select(
    `finance_accounts?user_id=eq.${OWNER_USER_ID}&is_archived=eq.false&select=id,name&order=account_type.asc,created_at.asc`,
  );
  if (!accounts || accounts.length === 0) {
    return json({ ok: false, error: "no_accounts", message: "No finance accounts exist yet — create one in the app first." }, 400);
  }
  if (!accountId || !accounts.some((a) => String(a.id) === accountId)) {
    return json({
      ok: false,
      error: "account_required",
      message: "Which account?",
      accounts: accounts.map((a) => ({ id: String(a.id), name: String(a.name) })),
    }, 400);
  }

  // Dedup: same account + date + amount + description within 2 minutes.
  const escDesc = encodeURIComponent(description);
  if (await isDupe(
    `finance_transactions?user_id=eq.${OWNER_USER_ID}&account_id=eq.${accountId}&entry_date=eq.${entryDate}&amount=eq.${signedAmount}&description=eq.${escDesc}&created_at=gte.${DEDUP_ISO()}&select=id&limit=1`,
  )) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  // Insert.
  const saved = await insert("finance_transactions", {
    user_id: OWNER_USER_ID,
    account_id: accountId,
    entry_date: entryDate,
    amount: signedAmount,
    txn_type: txnType,
    category_id: categoryId,
    description,
    source: "hermes",
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);

  // Undo log.
  const undoId = await logCreate("finance_transactions", id, description);
  if (!undoId) {
    await del(`finance_transactions?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`);
    return fail("undo log failed — write rolled back", 500);
  }

  return json({ ok: true, id, undo_id: undoId });
}
