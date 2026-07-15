# LifeOS — The Hermes Track (00)

> Read me first for anything about Marty's new brain. I am the "why" and the source
> of truth for the Hermes rebuild. Plain English only.
> Started 2026-07-08. **Status: infrastructure COMPLETE and secured. The two missions
> (the actual Chief-of-Staff / food-logger behaviours) are NOT built yet.**

## ⚠️ Open tidy-ups (do these on a fresh head, before new features)
1. **Rotate the read secret** — `HERMES_READ_SECRET` leaked into the planning chat.
   Read-only so low severity, but rotate it: `openssl rand -base64 32` →
   `env -u SUPABASE_ACCESS_TOKEN supabase secrets set --project-ref cntlptuacsujbdtwvbis
   HERMES_READ_SECRET="<new>"` → update `LIFEOS_HERMES_SECRET` in the box's `.env` →
   restart Hermes → confirm read still works.
2. **Retro Checker pass** — `hermes-read` deployed without its Checker gate, and
   `hermes-write` + `db/42_hermes_source_tags.sql` shipped without a confirmed Checker/
   security pass. All additive/low-risk, but the gate bent under momentum. Run a fresh
   Checker over both to keep the discipline from rotting.
3. **BotFather app-side toggles** — set Group Privacy **ON** and Allow Groups **OFF** in
   @BotFather (server-side owner-lock is done; this locks the Telegram side).
4. **Verify cutover state** — confirm whether the OLD serverless Marty (`telegram`/`brief`
   edge functions) is cleanly parked and how Telegram is delivering to Hermes (polling vs
   webhook). Telegram allows only one of webhook/polling at a time — make sure the old
   webhook isn't fighting Hermes. (Hermes answers on Telegram, so this is working, but the
   old-bot status should be confirmed and the old bot parked-not-deleted.)

---

## What this is (the point)

We are **replacing the old AI proactive layer** (the serverless `telegram` + `brief`
edge functions, the "M-track" Marty) with a **new, smarter, conversational Marty** — a
**Live Chief of Staff** with a distinct personality that reaches out on its own, learns
the owner's patterns, and keeps him engaged with the app.

The brain is **Hermes Agent** (Nous Research's open-source harness) running on a
**self-hosted Hetzner VPS**, powered by the owner's **ChatGPT subscription** via the
Codex auth bridge. It talks over **Telegram** (in-app parity later), and reads/writes
LifeOS data in **Supabase**.

### Two missions (the whole scope of the new Marty)
1. **Work / focus / task Chief of Staff** — notices the exam with nothing logged against
   its category, the task list that grows while nothing ships, and pushes the owner to
   start — with real suggestions on how to attack a task, not just "do it."
2. **Conversational food logger** — "had a spag bol at an Italian place" → estimates
   cals/macros and logs it; notices a skipped lunch; spots the identical daily breakfast
   and offers to just log it.

**Important status:** the plumbing to *do* these (read + write to LifeOS) is now built
and working. The proactive *behaviours* — Marty actually noticing and reaching out — are
**not built yet.** That's SOUL/skill/cron work, the next real phase. Personality is a
later, owner-directed decision.

---

## How we got here (honest record)

Landed on the **Life Synthesizer wearing a Chief of Staff's voice.** The owner then chose
a **major architecture pivot**: self-host Hermes on a VPS running off his ChatGPT
subscription, rather than upgrade the existing serverless Marty with a paid API key.

**Decided against the Planner's initial recommendation, recorded openly per house style.**
Owner's rationale: fixed/predictable cost (a subscription, not a metered bill); a
deep-research ambition (heavy autonomous overnight analysis, where fixed cost can beat
metered); own infrastructure (a box that can later hold document context); and a friend
running the same combo successfully. The Planner's engineering caveats (bridge fragility,
box must be hardened, LifeOS must never depend on the box) are logged as risks below; they
did not change the decision — but note the box **is now hardened** (see Current State).

---

## The architecture (six phases) — with status

Golden rule threaded through all of it: **LifeOS keeps working if the box dies.** Hermes
is bolted **on top** of the serverless system, never a dependency of it.

- **Phase 0 — Decide & prep.** ✅ Done.
- **Phase 1 — Stand up + harden the box.** ✅ Done. Box live **and hardened** (key-only
  SSH, root login off, password auth off, ufw SSH-only, fail2ban, non-root user `chris`).
- **Phase 2 — Hermes + brain + Telegram.** ✅ Done. Hermes running, on Telegram, on the
  ChatGPT subscription via the Codex bridge. **Bot owner-locked** (see Current State).
- **Phase 3 — Connect Hermes to LifeOS (read, then write).** ✅ Done. `hermes-read` and
  `hermes-write` both built, deployed, working.
- **Phase 4 — The two missions on Hermes.** ⬜ **Next.** Build the work Chief of Staff +
  food logger as real Hermes behaviours (skills + native cron + memory + personality).
- **Phase 5 — Deep research while you sleep.** ⬜ Later — subagents + overnight cron,
  iteration caps mandatory.
- **Phase 6 — Documents / knowledge layer.** ⬜ Parked — files + embeddings.

### Cutover posture
Direct replace of the old Telegram bot, done safely: old edge-function bot kept **parked,
not deleted** for 30-second rollback; dead-code sweep only after ~a week of Hermes proving
stable. **(Cutover/webhook state to be verified — see tidy-up #4.)**

---

## The guardrails (non-negotiable)

1. **LifeOS survives the box dying.** Hermes is additive; the serverless spine stands alone.
2. **Hermes NEVER writes to Supabase raw.** All writes go through the purpose-built
   `hermes-write` door (or the existing `telegram` function), so every write is
   undo-logged and spine-safe. Hermes holds only the read + write secrets, never the
   service-role key.
3. **Reads via `hermes-read`** — read-only by construction (no write code exists in it).
4. **Writes via `hermes-write`** — see its design below. Confirm-gate is server-enforced.
5. **No Supabase schema change without the Checker** and the exact phrase **"checker
   approved."** (This bent twice this session — see tidy-up #2.)
6. **Frankfurt only** (`cntlptuacsujbdtwvbis`). Never the Ireland ref
   (`qupudazcutkbnxseciwn`). Use `env -u SUPABASE_ACCESS_TOKEN` / explicit inline token.
7. **Capped API-key fallback brain** — so a bridge break degrades instead of going dark
   (deterministic-fallback rule applied to the brain). *(Confirm it's configured.)*
8. **`config.toml` pins `verify_jwt = false`** for every header-authed function
   (`hermes-read`, `hermes-write`, `health-ingest`) — else a plain redeploy silently
   re-enables JWT and breaks them. *(Corrected 2026-07-15: the enumeration was
   incomplete, and one KNOWN GAP stands — the old `telegram` webhook, our documented
   30-second rollback, is header-authed and NOT pinned; a redeploy would break it
   exactly when it's needed. The one-line config fix is code, carried on the Part B
   list — audit D-03.)*
9. **Secure token/credential handling** (a condition of the OpenAI permission) — tokens/
   secrets on the box at `600`, never in a repo, never logged. ✅ box now hardened.
10. **Single-user only.** Never expose Hermes/its endpoints publicly. Telegram bot is
    owner-locked to one chat ID.
11. **Iteration caps on autonomous/overnight jobs** — the owner is responsible for
    everything the agent does through his account (per OpenAI terms). No runaway loops.
12. **Human-confirm health + estimates before logging** — enforced by construction in
    `hermes-write` (see below), not just prompt instruction.

---

## The write layer — `hermes-write` (design, as built)

**One unified write door**, symmetric with `hermes-read`. Secret-authed
(`X-Hermes-Write-Secret`, separate from the read secret so it's independently revocable),
takes a typed payload `{ kind, data, confirmed }`, validates per kind, writes undoably.

- **Domains:** task, event, food, weight/body, sleep, focus — **plus, added since
  this doc's 2026-07-08 close (corrected 2026-07-15): people** (person / note /
  catchup / connect, D14b — person + connect confirm-gated) **and finance
  transactions** (H-fin-a). **GYM EXCLUDED** —
  `gym_workouts` is a Hevy cache keyed on `hevy_id`; writing it by hand corrupts the sync.
  Conversational workout logging, if ever wanted, is a separate table/design (parked).
- **Undo — free, no new machinery.** `marty_actions` logs by a plain `table` string and
  reverses by `kind`, so any create logged as `{table, id}` is reversed by the existing
  DELETE-by-id undo. Every Hermes write across every domain is undoable from day one. **No
  schema change was needed for undo.**
- **Confirm-gate, SERVER-ENFORCED.** The function **rejects (422)** any write of kind
  body/sleep, or food where `is_estimated=true`, unless `confirmed=true`. Task, event,
  explicit food, and focus log directly. The model *cannot* silently log a weight or a
  guessed meal — the flag is only set after the owner says yes.
- **Dedup.** Upsert `body_metrics` and `sleep_nights` on their natural unique keys.
  Check-before-insert for task/event/food/focus (no natural key) to stop retry double-logs.
- **Food = macro snapshot** — macros frozen at write time (`logSnapshot` contract);
  never re-reads a live source.
- **Source tags** — Hermes-logged rows are distinguishable for audit: `entry_source='hermes'`
  on food, `source='hermes'` on focus. This required the one schema change this session
  (`db/42_hermes_source_tags.sql`, two additive CHECK-constraint expansions, applied +
  PostgREST reloaded).
- **Typed/bounded, owner-scoped, no raw SQL, no arbitrary table/column.**

---

## Key decisions (with reasons + trade-offs)

- **[Self-host Hermes on a VPS, not upgrade the serverless Marty.]** Fixed-cost brain,
  deep-research ambition, own infra. Trade-off: ops burden + a fragile bridge; the box had
  to be hardened (done) and must never be load-bearing for LifeOS. Against Planner's rec.
- **[ChatGPT subscription via the Codex bridge, not a paid API key.]** OpenAI confirmed in
  writing it's permitted for his own account (below). Trade-off: the bridge breaks when
  OpenAI shifts something — mitigated by the capped API-key fallback.
- **[Full-life snapshot to the AI brain — health data included.]** Sleep, body, food,
  focus all flow to the brain. This is the point of the Synthesizer. **Deliberately relaxes**
  the old "health data never touches AI" boundary; accepted because it's his own account,
  OpenAI-permitted, and a conscious choice.
- **[One unified `hermes-write` door.]** Symmetric with read, one secret, one validated
  entry point for all domains. Chosen over reuse-telegram-plus-separate-writers (sprawl).
- **[Keep source tags — the two-CHECK schema touch.]** Preserves an audit trail of what
  Marty logged vs what the owner logged. Trade-off: two Checker-gated schema commits.
- **[Confirm health + estimates, direct-log the rest — enforced server-side.]** Confirmation
  as construction, not vibes.

---

## The OpenAI permission (recorded)

The owner obtained written OpenAI-support confirmation that using his ChatGPT subscription
with a third-party Codex-compatible bridge, for his own account, is permitted — the thing
that unblocked the subscription-brain path. It is **conditional** (his account only, secure
token handling, no public exposure, responsibility for autonomous activity), and those
conditions are guardrails 9–11.

> "…OpenAI permits you to use your ChatGPT subscription credentials or Codex authentication
> flow with a third-party Codex-compatible client, bridge, wrapper, or development tool,
> including tools not created or operated by OpenAI, provided that the tool is used only by
> you, for your own account… so long as the third-party tool does not bypass OpenAI access
> controls, misrepresent the user, share or resell access, automate prohibited activity, or
> expose credentials or tokens to unauthorized parties…"

(Full text held by the owner.)

---

## Amendments to prior locked decisions (open record)

- **Supersedes the daytime-nudge cron fix (old debt "D1")** — the whole proactive layer is
  being replaced, so re-pointing the broken `marty-daytime-nudge` secret is moot; it retires
  with the old bot.
- **Old serverless Marty (M0–M10) being replaced by Hermes** — kept parked, not deleted.
- **Relaxes the "health data never reaches AI" boundary** from `01-architecture.md`,
  deliberately, for the Hermes brain.

---

## Current state (as of 2026-07-08, end of session)

**The box — live and HARDENED. ✅**
- Hetzner **CX23**: 2 vCPU / 4 GB / 40 GB. Ubuntu **26.04 LTS**. Nuremberg (eu-central).
  Name `ubuntu-4gb-nbg1-1`, Hetzner project "lifeos-Marty". ~€6.64/mo. IP `46.225.81.162`.
- **Hardened:** non-root sudo user `chris`; root SSH login disabled; password auth disabled
  (**key-only**); ufw default-deny inbound + allow SSH only (Hermes is outbound-only, needs
  no inbound port); fail2ban active; unattended-upgrades on.
- **Connect from now on:** `ssh -i ~/.ssh/hetzner_lifeos chris@46.225.81.162` (NOT `root@`;
  use `sudo` for admin). The Mac's key file is `~/.ssh/hetzner_lifeos`.
- *Session note:* a fail2ban self-ban occurred during key testing (from retries against the
  wrong key filename); recovered via the **Hetzner web console** + `fail2ban-client unban
  --all`. The web console (browser terminal, password login, bypasses SSH bans) is the
  always-works lockout fallback. ~51 apt updates pending — `unattended-upgrades` will clear
  them; or `sudo apt update && sudo apt upgrade -y`.

**Hermes — running, on the subscription, owner-locked. ✅**
- Hermes Agent (v0.18.2) under `/usr/local/`, data in `/root/.hermes`. Brain = ChatGPT
  subscription via Codex bridge. Fallback = capped API key *(confirm configured)*.
- On Telegram via `@lifeos_marty_bot`. **Owner-locked:** `TELEGRAM_ALLOWED_USERS=8864259574`
  in `.env`, enforced in `gateway/authz_mixin.py`; non-owner messages silently dropped (no
  reply). Bot token in `/root/.hermes/.env` at `600`, not in any repo.

**LifeOS connection — read + write, both WORKING. ✅**
- **`hermes-read`** — deployed, verified. Read-only by construction. Header `X-Hermes-Secret`.
  Returns a full-life JSON snapshot (tasks, events, categories, food, sleep, body, activity
  [daily-rolled-up], focus, gym, health_goals). `days` param 1–90 (default 7), per-table
  caps. verify_jwt=false pinned.
- **`hermes-write`** — deployed. Unified door (design above). Header `X-Hermes-Write-Secret`.
  Schema `db/42_hermes_source_tags.sql` applied + PostgREST reloaded. verify_jwt=false pinned.
- **On the box:** skills `/root/.hermes/skills/lifeos/read-lifeos/SKILL.md` and
  `write-lifeos/SKILL.md`; secrets `LIFEOS_HERMES_SECRET` (read) + `LIFEOS_HERMES_WRITE_SECRET`
  (write) in `/root/.hermes/.env`.

---

## On the horizon (sequenced)

1. **Tidy-ups** (top of file): rotate read secret · retro Checker pass · BotFather toggles ·
   verify cutover/webhook.
2. **The two missions as real behaviours** — the actual product. Right now Hermes *can*
   read/write on request; it doesn't yet *proactively* run the Chief of Staff or food-logger
   missions. Build these as Hermes skills + native cron + memory + the confirm rule, and
   settle Marty's personality (owner-directed).
3. **Deep research while you sleep** — subagents + overnight cron, iteration caps.
4. **In-app parity** — Marty present inside the LifeOS web app, not just Telegram.
5. **Documents / knowledge layer** — parked pillar.
6. **Cutover finalise** — retire the old serverless Marty after Hermes proves stable.

---

## Known risks & debt

- **Leaked read secret** (tidy-up #1) — close it by rotating.
- **Checker gate bent twice** (tidy-up #2) — `hermes-read` and `hermes-write`/migration
  shipped without confirmed Checker passes. Retro-pass both; don't let the gate keep bending.
- **Bridge fragility** — breaks when OpenAI shifts; the capped API-key fallback is the
  mitigation and must actually be configured/verified.
- **Ops burden is real** — patch the box; verify LifeOS-survives-the-box regularly.
- **Cutover unverified** — old bot status + Telegram delivery method (tidy-up #4).
- **Old serverless debt now moot** — the broken nudge cron (D1) and dead `telegram_saves`
  retire with the old bot.
- **Brain docs are source of truth** — re-upload this file to project knowledge after the
  session (only the owner can update project knowledge).

---

## Environment quick-reference

- **Box:** Hetzner CX23, Ubuntu 26.04, IP `46.225.81.162`, Nuremberg. Connect:
  `ssh -i ~/.ssh/hetzner_lifeos chris@46.225.81.162` (key-only, non-root). Lockout
  fallback: Hetzner web console. (No secret VALUES stored in this doc or any repo.)
- **Agent:** Hermes Agent v0.18.2 on the box; brain = ChatGPT subscription via Codex
  bridge; fallback = capped API key (confirm).
- **Supabase:** Frankfurt `cntlptuacsujbdtwvbis` ONLY. Never Ireland `qupudazcutkbnxseciwn`.
- **Read door:** `hermes-read`, header `X-Hermes-Secret`.
- **Write door:** `hermes-write`, header `X-Hermes-Write-Secret`. Domains: task/event/food/
  body/sleep/focus + people + finance transactions (corrected 2026-07-15). Gym excluded.
  Code now split: health handlers in `health.ts` (H-0), people in `people.ts`, finance in
  `finance.ts`.
- **Undo:** `marty_actions` (generic; reverses any Hermes write).
- **Schema added this session:** `db/42_hermes_source_tags.sql` ('hermes' allowed on
  `food_log_entries.entry_source` + `focus_sessions.source`).
- **Telegram:** bot `@lifeos_marty_bot`, owner-locked to chat ID `8864259574`.
- **Box paths:** skills `/root/.hermes/skills/lifeos/{read-lifeos,write-lifeos}/SKILL.md`;
  secrets `/root/.hermes/.env`.
- **Recon docs in repo:** `hermes-recon.md` (read), `hermes-write-recon.md` (write) —
  both frozen 2026-07-08 snapshots, now carrying staleness banners (they predate the
  H-0 split + the people/finance domains).
