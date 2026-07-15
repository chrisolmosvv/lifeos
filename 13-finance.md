# LifeOS — Finance (Money Module)

> I am the Finance module: the ledger / money section of the broadsheet — a
> clear-eyed, unstressful read on where the money is. Accounts, transactions,
> recurring bills, budgets, and the analysis views.
> **Status: V1 COMPLETE** (Pieces 1–8, 2026-07-10/11, owner-verified) **except
> Piece 5c** — the ING CSV parser is an honest stub. Mobile deferred.
> *(Written 2026-07-15 — this module shipped without a brain doc; the doc-drift
> audit (N-01) found it recorded only in roadmap session notes. This file is
> compiled from the schema (`db/44`–`db/45`), the code
> (`src/desktop/finance/`), and those notes. The decision set is banked in
> `03-decisions.md` (2026-07-15 entry).)*

---

## Ground rules (same as every module)

- **Additive only.** Four Finance tables sit beside the spine. `category_id` on a
  transaction is a **plain value**, not a foreign key — categories stay freely
  deletable.
- **Owner-only RLS** on every table. Single user.
- **Two-track commits** — schema shipped alone, checker-gated (Pieces 1 and 6a).
- **Store raw, compute on read.** Balances, trends and budget bars are all
  derived; nothing derived is stored.
- **No chart library.** Every chart is hand-rolled SVG/CSS on the house tokens.
- **One definition of "a day/month"** — the shared Amsterdam-day helper draws the
  month boundaries.

## Data model (4 tables, `db/44`, + the `db/45` extension)

- **`finance_accounts`** — one row per place money lives: `name`, `kind`
  (`cash` / `investment`), sort order, `archived_at` (accounts archive, never
  hard-delete — a **RESTRICT** guard protects transaction history).
- **`finance_transactions`** — the ledger: date, amount (**sign-consistency
  CHECKed at the DB level** — expenses negative, income positive), `txn_type`
  (income / expense / transfer), account, `category_id` (plain value; NULL =
  uncategorised), note, `transfer_pair_id`, `csv_match_key` (import dedupe),
  `archived_at`.
  **A transfer is a linked two-row pair** (out of one account, into the other) so
  moving your own money never reads as spending or income.
- **`finance_account_snapshots`** — dated "this investment is worth X" entries;
  same-date logging **upserts** (one snapshot per account per day). Investment
  balances are a step function through their snapshots.
- **`finance_budgets`** — **append-only** per-category monthly limits (newest row
  per category wins; history kept). No budget-removal UI in V1 (the spec didn't
  ask for one).
- **Recurring bills — NO new engine.** `db/45` widened the existing
  `recurrences` table (`target_kind` accepts `'transaction'` + four nullable
  template columns: amount, account, transfer account, txn_type) and
  `archive_batches.source_type` accepts `'transaction'`. Bills materialise
  through the same engine, editor and **This one / following / All** scope
  prompt as calendar repeats. Repeat-PATTERN editing is unsupported (delete +
  recreate), the same constraint as the calendar.

## Screens (desktop, shipped)

Nav: **Finance sits between Food and Rolodex.** The module opens on the
**Ledger**; Accounts is a secondary screen reached by a link.

- **Ledger** — the transaction list, capped at today. Month / Quarter / Year
  range switcher, inline filters (account / category / type), text search.
  Create income / expense / transfer; edit inline (transfer-pair-aware); delete =
  soft-delete with a Toast undo (direct `archived_at`).
- **Accounts** — create / edit / archive, cash-then-investment order; investment
  **snapshot logging** with a reverse-chronological history.
- **Recurring** — recurring bills: create, list, the next-3 upcoming, and
  three-scope edit/delete (reusing the calendar's `SeriesScopePrompt` verbatim).
- **Budgets** — per-category monthly limits with spend-vs-limit bars (**brick
  only when strictly over** — exactly 100% is not brick), an "everything else"
  aggregate line, and an italic **average-spend baseline** (trailing 6 months).
- **Trends** — the analysis pages, all off **one fetch, many views**:
  net-worth line (combined / per-account / cash-vs-investment, 6m/1y/2y),
  spend-by-category stacked bars, income-vs-expense paired bars, top-5
  categories, month-over-month deltas (↑↓, "new this month"), investment
  gain/loss (snapshot diff), and a spending heatmap (month grid, opacity =
  daily spend). Transfers are excluded from every spending/income view.
- **CSV import** — file picker → parser → **preview table** → dedupe
  (`csv_match_key`) → batched category auto-guess → batch insert.
  **Revolut: real** (quoted fields, State/Currency filtering with skip counts;
  29/29 rows of the real export verified; a synthetic fixture lives in the repo —
  no real data). **ING: an honest stub** — Piece 5c, waiting on nothing but the
  work.

## Calc layer (pure, compute-on-read)

`financeCalc.js` + `financeCalcSpend.js` (+ `financeTrendsData.js`,
`budgetData.js`, `ledgerRange.js`): one-pass running balances for cash,
step-function for investments, account-existence boundaries respected,
month-bucketing via the shared Amsterdam helper.

## Hermes integration (H-fin-a/b, 2026-07-11/12, live-verified)

- **Read** (`hermes-read`): a `finance` section in Marty's snapshot.
- **Write** (`hermes-write`): the `transaction` kind — Marty can log a spend/
  income by chat; undo-logged in `marty_actions` like every Hermes write.

## Known gaps / deferred

- **Piece 5c — ING CSV parser** (stubbed; needs a real sample export).
- **No budget-removal UI**; repeat-pattern editing unsupported (both by spec).
- **Mobile Finance** — deferred, its own later spec.
- This doc is a **reconstruction** (2026-07-15) — if a detail here ever fights
  the code or the roadmap session notes (2026-07-10/11), those win; fix me.

## Build record (Pieces 1–8)

| Piece | What | Track |
|---|---|---|
| 1 | Schema — the 4 tables (`db/44`) | DB, checker-gated |
| 2 | Nav wiring + calm stub | SRC |
| 3 | Accounts screen + snapshot logging | SRC |
| 4 | Transaction ledger + add/edit/delete + filters | SRC |
| 5a/5b | CSV import infra → real Revolut parser (5c ING open) | SRC |
| 6a/6b/6c | Recurring bills: schema (`db/45`), engine wiring, UI | DB + SRC |
| 7 | Budgets (limits, bars, baseline) | SRC |
| 8a–8d | Trends: net worth, spend, income, deltas, gain/loss, heatmap | SRC |
| H-fin-a/b | Hermes write + read wiring | Edge functions |
