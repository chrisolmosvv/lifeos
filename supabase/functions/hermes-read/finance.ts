// LifeOS — hermes-read: finance section builder (H-fin-b).
//
// READ-ONLY BY CONSTRUCTION. Uses the same `select`/`selectAll` helpers as the rest
// of the snapshot — SELECT only, NO insert/update/delete/upsert/PATCH of any kind.
// Returns a shaped object: the owner's active accounts (each carrying a pre-computed
// current_balance), recent transactions, recent investment snapshots, and the LIVE
// budget per category.
//
// BALANCE MODEL — mirrors the desktop (financeCalc.js) exactly:
//   • cash account balance     = starting_balance + SUM(all non-archived txns, date <= today)
//   • investment account value = the most recent snapshot value on/before today,
//                                or starting_balance if it has no snapshots yet.
//
// WHY current_balance is pre-computed here (not left to the agent): the rich
// transaction payload is capped at 500 rows. An account with more history would sum
// to a WRONG balance on the agent side. The balance sweep below fetches ALL
// non-archived rows but only two columns (account_id, amount), so the figure is
// always correct regardless of the 500-row rich cap. Category-level and
// month-over-month reasoning still uses the rich rows.

import { todayYMD } from "../_shared/datetime.ts";
import { ownerPlain, select, selectAll } from "./sb.ts";

type Row = Record<string, unknown>;

const TXN_CAP = 500; // richest recent rows the agent reasons over (category, comparisons)
const SNAP_CAP = 365; // recent investment snapshots (one per account per day)

// Build the `finance` section for the Hermes read snapshot.
export async function buildFinanceSection(): Promise<
  { accounts: Row[]; transactions: Row[] | null; snapshots: Row[] | null; budgets: Row[] } | null
> {
  const today = todayYMD();

  const [accounts, recentTxns, balanceTxns, snapshots, budgetRows] = await Promise.all([
    // Active accounts only (is_archived = false).
    select(
      `finance_accounts?${ownerPlain()}&is_archived=eq.false&select=id,name,account_type,institution,starting_balance&order=name.asc&limit=100`,
    ),
    // Rich recent transactions — most recent 500 regardless of the snapshot `days`
    // window: finance reasoning (month-over-month spend) needs months of history,
    // not the 7-day default. The 500-row cap is the real payload bound.
    select(
      `finance_transactions?${ownerPlain()}&archived_at=is.null&select=id,account_id,entry_date,amount,txn_type,category_id,description&order=entry_date.desc&limit=${TXN_CAP}`,
    ),
    // Lightweight balance sweep — ALL non-archived txns up to today, two columns only.
    // Powers a CORRECT current_balance even past the 500-row rich cap.
    selectAll(
      `finance_transactions?${ownerPlain()}&archived_at=is.null&entry_date=lte.${today}&select=account_id,amount`,
    ),
    // Recent investment snapshots (newest first) — for current investment values.
    select(
      `finance_account_snapshots?${ownerPlain()}&snapshot_date=lte.${today}&select=account_id,snapshot_date,value&order=snapshot_date.desc&limit=${SNAP_CAP}`,
    ),
    // Budgets — append-only; the newest row per category is the live limit (resolved below).
    select(
      `finance_budgets?${ownerPlain()}&select=category_id,monthly_limit,created_at&order=created_at.desc&limit=500`,
    ),
  ]);

  if (!accounts) return null;

  // Cash: sum all non-archived txns per account (correct beyond the 500 rich cap).
  const cashSumByAccount = new Map<string, number>();
  for (const t of balanceTxns || []) {
    const acc = t.account_id as string;
    const amt = Number(t.amount);
    if (!Number.isFinite(amt)) continue;
    cashSumByAccount.set(acc, (cashSumByAccount.get(acc) || 0) + amt);
  }

  // Investment: latest snapshot value per account (rows are newest-first, so the
  // first one seen for an account is its most recent).
  const latestSnapByAccount = new Map<string, number>();
  for (const s of snapshots || []) {
    const acc = s.account_id as string;
    if (!latestSnapByAccount.has(acc)) latestSnapByAccount.set(acc, Number(s.value));
  }

  // Budgets: newest row per category wins (mirrors the desktop Budgets screen).
  const liveBudgetByCat = new Map<string, Row>();
  for (const b of budgetRows || []) {
    const cat = b.category_id as string;
    if (!liveBudgetByCat.has(cat)) liveBudgetByCat.set(cat, b);
  }

  // Shape accounts with a pre-computed current_balance.
  const shapedAccounts = accounts.map((a) => {
    const id = a.id as string;
    const start = Number(a.starting_balance) || 0;
    const balance = a.account_type === "investment"
      ? (latestSnapByAccount.has(id) ? latestSnapByAccount.get(id)! : start)
      : start + (cashSumByAccount.get(id) || 0);
    return {
      id,
      name: a.name,
      account_type: a.account_type,
      institution: a.institution ?? null,
      starting_balance: start,
      current_balance: Math.round(balance * 100) / 100,
    };
  });

  return {
    accounts: shapedAccounts,
    transactions: recentTxns,
    snapshots,
    budgets: [...liveBudgetByCat.values()],
  };
}
