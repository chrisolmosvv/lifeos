// LifeOS — Telegram bot, M8: resolve a brief item NUMBER to the exact row.
//
// The brief function stored its numbered action list in marty_brief (one row per owner)
// at send-time. When a reply like "done 1" arrives here, this maps the number back to the
// exact {table, id} the brief showed — so the action hits the right item, not a re-derived
// guess. READ-ONLY (imports only select).

import { OWNER_USER_ID, select } from "./db.ts";

export interface BriefRef { table: string; id: string; title: string }

export async function briefItem(n: number): Promise<BriefRef | null> {
  const rows = await select(`marty_brief?user_id=eq.${OWNER_USER_ID}&select=items&limit=1`);
  if (!rows || rows.length === 0) return null;
  const items = Array.isArray(rows[0].items) ? (rows[0].items as Record<string, unknown>[]) : [];
  const it = items.find((x) => Number(x?.n) === n);
  if (!it) return null;
  return { table: String(it.table), id: String(it.id), title: String(it.title ?? "") };
}
