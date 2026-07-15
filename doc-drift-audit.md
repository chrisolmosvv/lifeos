# LifeOS — Doc-Drift Audit (Stage 1 report)

> Audit date: **2026-07-14**. Read-only — nothing in the repo was changed except creating this file.
> Every finding cites the doc location AND the code/repo evidence. Anything that can't be proven
> from the repo is marked **UNVERIFIABLE (owner)** and has an exact check in §5.
> **This is the FIND stage. Nothing gets fixed until you approve Stage 2.**

---

## 1. Executive summary

The docs are in better shape than most projects — the module docs (Focus, Rolodex, Food, Gym) and
the Hermes track doc are honest and current. The drift is concentrated in the **oldest, most-read
docs**: `01-architecture.md` still describes the app as a PWA with two edge functions and the old
Gemini Telegram bot as the live Marty — none of which is true any more. The **"free tiers only"
rule** in CLAUDE.md / AGENTS.md / the overview is dead in practice (a paid Hetzner server, a
ChatGPT subscription, and Hevy Pro now carry real features) but no doc amends it — a stale
guardrail a future session would obey. The **daytime nudge — promised as a working feature in
three docs — has never fired from its schedule**: the handoff log itself proved the cron reads a
Vault secret that doesn't exist, and the fact never made it back into the docs. The **Finance
module — fully built and live — has no brain doc and almost no decisions entries**; it exists only
in roadmap session notes. The **mobile app tree** (a whole parallel front-end) is likewise
invisible to the architecture doc. And one real booby-trap: the **`telegram` function breaks if
anyone redeploys it** (its JWT setting isn't pinned), and that function is documented as the
30-second rollback if Hermes dies.
Worst finding: **D-01/D-02** (dead free-tier rule + architecture doc describing the replaced Marty
as current). Shape of the work: one big rewrite (01-architecture), two surgical rule edits
(CLAUDE/AGENTS), a set of small correction blocks and banners, three append-entries to the
decisions doc, and one new doc (Finance).

**Counts: 4×S1 · 9×S2 · 11×S3 · 4×S4 · 7×N · 4×Q** — plus 6 leads checked and **disproved**
(recorded in §9, because a disproved suspicion is also worth keeping).

---

## 2. Doc inventory + class

| Doc | Class | Last-true (approx) | Verdict |
|---|---|---|---|
| `00-overview.md` | LIVING SPEC | ~2026-06-29 | DRIFTED (free-tier rule; old-Marty V1 description; progress note stops at F-track) |
| `01-architecture.md` | LIVING SPEC | data section ~2026-07-10; runtime section ~2026-06-24 | **DRIFTED (worst doc)** |
| `02-roadmap.md` | LIVING SPEC | session notes current (2026-07-14); interior markers stale | DRIFTED in places |
| `03-decisions.md` | APPEND-ONLY HISTORY | current to 2026-07-14 | CURRENT but **has coverage gaps** (no Hermes, ~no Finance, no mobile) + one out-of-order entry |
| `04-handoff-log.md` | APPEND-ONLY HISTORY | 2026-07-14 | CURRENT (the single most complete record) |
| `05-glossary.md` | LIVING SPEC | ~2026-06-24 | DRIFTED (old-Marty vocabulary as current; whole modules missing) |
| `06-design.md` | LIVING SPEC | ~2026-07-01 | CURRENT-ish (tokens verified correct; stale paths + stale "built & live" bullet) |
| `07-ux-flows.md` | LIVING SPEC | amended 2026-07-14 | CURRENT-ish (describes the deleted All Tasks screen as live; §6 proactive layer = old bot) |
| `00-hermes-track.md` | LIVING SPEC | 2026-07-08 (+ H-0/H-fin work since) | CURRENT-ish (domains list now understates; tidy-ups still open) |
| `CLAUDE.md` | LIVING SPEC | rule-set predates Hermes | DRIFTED (free-tier rule) |
| `AGENTS.md` | LIVING SPEC | same | DRIFTED (same) |
| `SOUL.md` | LIVING SPEC | 2026-07-08 | CURRENT (tools line slightly understates: no people/finance) |
| `08-marty-upgrade.md` | MODULE SPEC | 2026-06-24 | **SUPERSEDED — not marked** |
| `09-gym-form-guide.md` | MODULE SPEC | 2026-06-25 | CURRENT (stale interior markers; AI-boundary claim overtaken at system level) |
| `10-sleep-body-stats.md` | MODULE SPEC | ~2026-06-28 | DRIFTED in places (awakenings cut from UI; two rebuild passes since) |
| `11-food-nutrition.md` | MODULE SPEC | 2026-07-08 | CURRENT-ish ("one AI touch" claim now false) |
| `12-focus.md` | MODULE SPEC | 2026-07-02 | CURRENT |
| `14-rolodex.md` | MODULE SPEC | 2026-07-10 | CURRENT |
| `hermes-recon.md` | DATED SNAPSHOT | 2026-07-08 | STALE SNAPSHOT (predates hermes-read/write + H-0 split) — banner |
| `hermes-write-recon.md` | DATED SNAPSHOT | 2026-07-08 | STALE SNAPSHOT (predates H-0 split + finance/people domains) — banner |
| `people-recon.md` / `people-recon-2.md` | DATED SNAPSHOT | 2026-07-09 | OK (module shipped since — small "since shipped" banner) |
| `food-recon-inventory.md` | DATED SNAPSHOT | 2026-07-05 | OK (honest date header) |
| `calendar-uiux-spec.md` | DATED SNAPSHOT | V1, self-described "archaeology" | OK |
| `calendar-v2-spec.md` | DATED SNAPSHOT (not in the class table — classified here) | 2026-06-30 | OK |
| `calendar-v2-build-plan.md` | DATED SNAPSHOT | 2026-06-30 | OK |
| `health-v2-build-doc.md` | DATED SNAPSHOT | STATUS header 2026-06-30 | STALE STATUS (sleep redesign Pieces 0–5 have run since, recorded only in the handoff log) — banner |
| **Finance brain doc** | MODULE SPEC | — | **MISSING** (see N-01) |
| **Mobile layer doc** | — | — | **MISSING / uncovered in architecture** (see N-02) |

Note: no `13-*.md` has ever existed (checked `git log --all -- '13-*'` — empty). The numbering
genuinely skips 13; Finance could take it.

---

## 3. Findings table (sorted S1 → Q)

| ID | Sev | Doc | Line/§ | The claim (short) | The reality (short) | Confidence |
|---|---|---|---|---|---|---|
| D-01 | S1 | CLAUDE.md, AGENTS.md, 00-overview.md, 01-architecture.md | rules / L44 / L241 | "Free tiers only" is a hard constraint | Paid Hetzner VPS (~€6.64/mo) runs Marty; ChatGPT subscription is his brain; Hevy Pro feeds Gym | HIGH |
| D-02 | S1 | 01-architecture.md | L196–238 | Marty = serverless Gemini bot; "Supabase runs two edge functions" | Marty = Hermes agent on a VPS via hermes-read/write; NINE edge functions exist; old bot parked | HIGH |
| D-03 | S1 | 03-decisions.md (rule) vs config.toml | L1306 | "config.toml MUST pin verify_jwt=false for every header-authed function" | `telegram` (header-authed, documented as the Hermes rollback) is NOT pinned — a plain redeploy would break it | HIGH |
| D-04 | S1 | 01-architecture.md, 05-glossary.md, 07-ux-flows.md §6 | L229–234 / nudge entries | The daytime nudge is a live, working feature | **Confirmed broken in the handoff log itself** (04-handoff L6504–6518, 2026-06-24): the cron reads Vault secret `service_role_key`, which does not exist (only `brief_service_role_key` does) — every hourly fire 401s. Flagged as backlog, never fixed, never propagated to the three docs above | HIGH (cron's current live state → V-01) |
| D-05 | S2 | 01-architecture.md | L8 | The app "installs to phone + desktop (PWA)" | No manifest, no service worker, no PWA plugin anywhere (index.html, vite.config.js, package.json) | HIGH |
| D-06 | S2 | 01-architecture.md | L101–104 | `activity_log` exists as the quiet signal-capture table | No migration creates it; roadmap Phase 8 lists "turn on the activity log" as ⬜ future (the real table is `activity_hourly`, a different thing — Apple Health activity) | HIGH |
| D-07 | S2 | 01-architecture.md | L28–49 | Front-end = single shell, eight views, `src/kit/`, `src/theme.css` | TEN views (finance + people added); tree is `src/desktop/` + `src/mobile/` + `src/spine/` with a viewport-gated front door (main.jsx) and a build guard; paths are `src/desktop/kit/`, `src/spine/theme/theme.css` | HIGH |
| D-08 | S2 | 05-glossary.md | Marty/Gemini/brief/nudge entries | Gemini "does all of Marty's language work"; old-bot behaviours described as current | Marty's brain is ChatGPT-via-Hermes; the old bot is parked; Gemini remains only in brief/telegram (parked), food-search rerank, meal-estimate, recipe-import | HIGH |
| D-09 | S2 | 08-marty-upgrade.md | whole doc | Reads as the current Marty architecture (M-track complete) | The entire serverless Marty is superseded by Hermes and kept only as a parked rollback — no banner says so | HIGH |
| D-10 | S2 | 11-food-nutrition.md | L30–36, L54–58 | "The ONE AI touch in V1 is recipe import"; "nothing reasons over the owner's intake" | `meal-estimate` (typed meal → Gemini → macros) exists and is live; food-search's reranker also calls Gemini; Hermes logs estimated food via ChatGPT | HIGH |
| D-11 | S2 | 01-architecture.md | L245–247 | "The moment the agent handles sensitive data (mood, health), switch to paid no-training key" (stated as a held rule) | Deliberately relaxed for Hermes (00-hermes-track "Amendments") — sleep/body/food/focus all flow to the ChatGPT brain; 01-architecture carries no amendment | HIGH |
| D-12 | S2 | 03-decisions.md | coverage | Decisions doc = "the record of what we chose" | ZERO Hermes entries, one incidental finance mention, no mobile front-door entry — the three biggest post-July decisions aren't in it | HIGH |
| D-13 | S2 | 07-ux-flows.md | §3 "All Tasks" | All Tasks inventory screen described as LOCKED, live spec | The screen was retired and deleted (Planning P6, commits 18c5498 + adc6b10); the Today box now opens Planning | HIGH |
| D-14 | S3 | 02-roadmap.md | L1005, G-track interior, Phase-7 backlog, "Later" section | M-track header "🔨 IN PROGRESS"; G2–G6 "awaiting checker"; "⬜ Calendar re-skin decision pending"; "⬜ Later — Health pillar, then Life pillar" | M-track complete (own closing line); G-track banner says COMPLETE; Calendar rebuild finished; both pillars largely shipped | HIGH |
| D-15 | S3 | 02-roadmap.md | L15–16 (P0 note) | "every file now under the ~250 ceiling" | src census: foodLog.css 706, cookbook.css 690, todayForm.css 509, formGuide.css 493, +9 more CSS files over; Today.jsx back at 272, WeekView.jsx 255 | HIGH |
| D-16 | S3 | 10-sleep-body-stats.md | L67–68, L120, §coach | Awakenings kept and shown; nudges via Marty; doc = source of truth for sleep UI | Awakenings + respiratory were cut from every Sleep surface (commit 313fc2d, 2026-07-13); the sleep UI has since been rebuilt twice (Health V2, then the sleep redesign) with no pointer from this doc | HIGH |
| D-17 | S3 | 00-hermes-track.md, SOUL.md | L281–282 / L104 | hermes-write domains: "task/event/food/body/sleep/focus. Gym excluded." | Also people (D14b, 4 kinds) and finance transactions (H-fin-a); hermes-read also serves people + finance sections | HIGH |
| D-18 | S3 | 06-design.md | L81, L95, L251, L257, L323 | Paths `src/theme.css`, `src/palette.js`, `src/kit/`; "Still on the OLD look: … mobile layouts"; nav = Today/Calendar/Settings | Real paths under `src/spine/` + `src/desktop/`; a full mobile tree exists with its own broadsheet screens; nav has 8 items | HIGH |
| D-19 | S3 | hermes-recon.md / hermes-write-recon.md | headers | "Seven edge functions are deployed"; hermes-write as one index.ts | Nine functions; hermes-write split (health.ts, people.ts, finance.ts, H-0) | HIGH (stale snapshot → banner, not rewrite) |
| D-20 | S3 | health-v2-build-doc.md | STATUS line | "STATUS (updated 2026-06-30)" presented as current | The sleep-redesign pass (Pieces 0–5, 2026-07-13/14) has run since, recorded only in the handoff log | HIGH |
| D-21 | S3 | 01-architecture.md | L123–195 | Module-tables section lists Marty, Food, People tables | Gym (7 tables), Sleep/Body (3), activity_hourly, sleep segments, focus_sessions, Finance (4 + recurrence extension) are absent — the doc's own table inventory covers ~half the live schema | HIGH |
| D-22 | S3 | 00-overview.md | L21–37 | "What V1 is" = old-Marty description; progress note ends at F-track | Focus, People, Finance, mobile, Hermes pivot all shipped since | HIGH |
| D-23 | S3 | 07-ux-flows.md §6, §7 | | Proactive layer = old bot's brief/nudge; "Health = Gym" | Proactive layer being rebuilt on Hermes (behaviours not built yet — truthfully NOT live at all right now, pending V-01); Health = Hub + Gym + Sleep + Body | HIGH |
| D-24 | S3 | 05-glossary.md | coverage | — | No entries for: Hermes, the VPS, Focus terms, Planning modes, Finance terms, Cook companion terms beyond Hero/Rail/Parked | HIGH |
| D-25 | S4 | 03-decisions.md | L3364 | "New decisions on top" | The Rolodex entry (2026-07-10) sits at the very bottom, below 2026-06-23 entries | HIGH |
| D-26 | S4 | 02-roadmap.md Track S | L1234+ | Status markers 🟦 | 🟦 isn't in the doc's own status key (✅🔨⬜) | HIGH |
| D-27 | S4 | 09-gym-form-guide.md | L105–155 | Interior G2–G15 markers still 🔨/⬜ | The banner above them says COMPLETE (G0–G16) | HIGH |
| D-28 | S4 | 06-design.md | L104–105 | "Dark-mode values: deferred (structure ready, none built)" | TRUE — verified (theme.css dark block exists but is commented out). Kept as a finding only to record it was CHECKED; no fix needed | HIGH |
| N-01 | N | — | — | — | **Finance module has NO brain doc** — 4 tables (db/44), recurrence extension (db/45), ~40 src files, CSV import, budgets, analysis charts, Hermes read+write wiring. Exists only in roadmap session notes | HIGH |
| N-02 | N | — | — | — | **The mobile layer + spine split is documented nowhere durable**: viewport-gated front door (max-width 860px, locked at load), desktop/mobile/spine trees, the bundle build-guard, the mobile-CSS-must-load-statically rule (main.jsx comments) | HIGH |
| N-03 | N | — | — | — | **No edge-function inventory exists**: 9 functions, 3 auth patterns (owner JWT / header secret / service-role), and the pin-state table (below, §6) — currently reconstructable only by reading config.toml + 9 index.ts files | HIGH |
| N-04 | N | — | — | — | The **"Update LifeOS" auto-commit/push tool** (6 commits in history, unidentified) is recorded only as a roadmap debt bullet — it's a standing operational hazard, not a session note | HIGH |
| N-05 | N | — | — | — | The **Checker gate** ("checker approved" exact phrase before any schema change) and the **two-track commit rule** are load-bearing but absent from CLAUDE.md/AGENTS.md — they live scattered in module docs + hermes-track | HIGH |
| N-06 | N | — | — | — | **Repo is 13 commits ahead of origin/main** (all of the sleep redesign is unpushed → the deployed site can't have it), while an unidentified tool sometimes pushes for you — the interplay is nowhere written as a rule ("push at end of session" or similar) | HIGH |
| N-07 | N | 04-handoff-log.md | ~L5177 | — | A **"Hard-won lessons" appendix is buried mid-file** (an old append boundary): the promoted operational-gotchas list — including "pin telegram/brief/gym in a future cleanup" — sits ~5,200 lines down where no fresh session will find it | HIGH |
| Q-01 | Q | 00-hermes-track.md | L109–110, L223, L262 | Guardrail 7: "Capped API-key fallback brain" — listed as non-negotiable, with an inline "(Confirm it's configured.)" | Cannot be verified from the repo; if unconfigured, the guardrail list overstates safety. Needs the owner's check (V-04) and then either configuring it or striking it from the guardrail list | UNVERIFIABLE (owner) |
| Q-02 | Q | 11-food-nutrition.md / 01-architecture.md | AI boundary | Is "typed meal description → free Gemini" (meal-estimate) inside or outside the owner's intended health-data boundary? | The rule's letter says intake data shouldn't hit the free training-enabled key; meal-estimate does exactly that. Deliberate (like the Hermes relaxation) or an unnoticed breach? Owner's call — then docs record it either way | UNVERIFIABLE (owner intent) |
| Q-03 | Q | 02-roadmap.md / cron | | Is the OLD 7am brief cron (`brief_daily_7am_ams`) still firing every morning alongside Hermes? | Telegram sends don't need the webhook, so the old brief may still be texting daily even with Hermes live — or may have been unscheduled. Repo can't tell (V-01) | UNVERIFIABLE (owner) |
| Q-04 | Q | CLAUDE.md 250-line rule | | Is the ~250-line ceiling meant to bind CSS files? | JS/JSX is near-compliant (2 files, worst 272); CSS has 13 files over (worst 706). Either the rule should say "code files, CSS judged looser" or the CSS needs splitting — owner's call, then the rule gets written the way it's meant | Q |

---

## 4. Finding detail

### D-01 · S1 · CLAUDE.md + AGENTS.md + 00-overview.md + 01-architecture.md
```
CLAIM (doc says):     "Free tiers only. If something would require paid hosting/DB/API, stop and
                      flag it before proceeding." — CLAUDE.md 'Architecture guardrails';
                      identically AGENTS.md; "Free to run. Everything sits inside free tiers"
                      — 00-overview.md L44; "Free tiers only." — 01-architecture.md L241.
REALITY (code says):  A paid Hetzner CX23 (~€6.64/mo) hosts Marty's brain (00-hermes-track.md
                      L208-209); the brain runs on the owner's paid ChatGPT subscription; Gym
                      requires Hevy Pro (09-gym L173 "api-key (Hevy Pro only)"). All owner-chosen,
                      all load-bearing.
EVIDENCE:             00-hermes-track.md L36-38, L208-209; 09-gym-form-guide.md L173.
WHY IT MATTERS:       A future session would either refuse legitimate Hermes/VPS work "because the
                      rule says free only", or — worse — assume no paid infrastructure exists and
                      design around its absence. A stale guardrail is worse than none.
CLASS:                ZOMBIE (the rule was real, was consciously outgrown, never amended).
PROPOSED FIX:         Reword in all four places to: free-by-default; the three standing paid
                      exceptions named; any NEW paid dependency still stops and flags. Add a ⟳/
                      supersession entry in 03-decisions.md recording when and why it changed.
CONFIDENCE:           HIGH.
```

### D-02 · S1 · 01-architecture.md (runtime section)
```
CLAIM (doc says):     "Supabase runs two edge functions — the public telegram webhook (Marty's
                      chat) and the private brief" (L196-199); the whole 'Marty — the
                      conversational + proactive bot' + 'morning brief + daytime nudge' sections
                      (L201-238) describe the M-track Gemini bot as the live runtime.
REALITY (code says):  Nine edge functions exist (telegram, brief, gym, health-ingest, food-search,
                      meal-estimate, recipe-import, hermes-read, hermes-write). Marty is a Hermes
                      agent on a Hetzner VPS speaking through hermes-read/hermes-write; the
                      serverless bot is parked as a rollback (cutover state itself unverified —
                      00-hermes-track tidy-up #4).
EVIDENCE:             supabase/functions/* (9 dirs); 00-hermes-track.md L28-38, L89-92, L199.
WHY IT MATTERS:       01-architecture is THE "how it's built" doc. A session asked to change bot
                      behaviour would edit the parked telegram/brief functions and wonder why
                      nothing changes; a session reasoning about attack surface would miss seven
                      functions.
CLASS:                DRIFT (was true; overtaken 2026-07-08).
PROPOSED FIX:         Rewrite the runtime section: the function inventory table (name · job · auth
                      · verify_jwt pin state), the Hermes runtime picture with a pointer to
                      00-hermes-track.md, and the old bot explicitly labelled "parked rollback".
CONFIDENCE:           HIGH.
```

### D-03 · S1 · decisions rule vs supabase/config.toml
```
CLAIM (doc says):     "config.toml MUST pin verify_jwt = false for every header-authed function…
                      otherwise a later deploy silently re-enables JWT" — 03-decisions.md L1306-1310
                      (the S5b lesson); restated as Hermes guardrail #8 (00-hermes-track L111-113)
                      but enumerating only hermes-read/hermes-write.
REALITY (code says):  config.toml pins 6 functions (health-ingest F, hermes-read F, hermes-write F,
                      food-search T, recipe-import T, meal-estimate T). `telegram` — header-authed
                      (X-Telegram-Bot-Api-Secret-Token, deployed --no-verify-jwt per Phase 5a) —
                      has NO entry. `brief`/`gym` also unpinned (they want true; default true, so
                      benign today).
EVIDENCE:             supabase/config.toml [functions.*] blocks; telegram/index.ts L6-27;
                      02-roadmap.md L320-321 (5a "deployed --no-verify-jwt").
WHY IT MATTERS:       The docs name the parked telegram bot as the 30-second rollback if Hermes
                      dies (00-hermes-track L90-92). Any redeploy of it — e.g. DURING that
                      emergency — re-enables JWT and the webhook dies exactly when it's needed.
                      This is the same failure mode that already bit health-ingest once.
CLASS:                DRIFT (a stated invariant, violated for one function).
PROPOSED FIX (docs):  Correct guardrail #8's enumeration; record the gap. The one-line config.toml
                      fix itself is a CODE change → carried to Part B untouched (§8).
CONFIDENCE:           HIGH.
```

### D-04 · S1 · daytime nudge described as live
```
CLAIM (doc says):     01-architecture L229-234, 05-glossary "Daytime nudge", 07-ux-flows §6b —
                      the guardrailed daytime nudge is presented as a working daily feature.
REALITY (code says):  The handoff log CONFIRMS it broken (L6504-6518, 2026-06-24, re-flagged
                      L6536-6539 + L6001): the live `marty-daytime-nudge` cron authenticates with
                      Vault secret 'service_role_key', WHICH DOES NOT EXIST — the only Vault
                      secret is 'brief_service_role_key' (confirmed then via a live query). Every
                      hourly fire 401s; only the on-demand "nudge" trigger works (different
                      path), which is why it slipped. Logged as backlog, never fixed. Source of
                      the bad name: db/16 committed its placeholder. 00-hermes-track L196-198
                      later declares the fix moot (the whole layer retires with the old bot) —
                      but the three docs above still sell the nudge as alive. Bonus
                      inconsistency: the 2026-07-14 gym-cron handoff entry (~L343) refers to "the
                      hourly marty-daytime-nudge" as if live-scheduled.
EVIDENCE:             04-handoff-log.md L6504-6518, L6536-6539, ~L343; db/16 L18-31; db/22
                      L41-56; 00-hermes-track.md L196-198.
WHY IT MATTERS:       Three docs promise a proactive safety-net behaviour that has not fired via
                      cron since it was created. False comfort about the product's core promise.
CLASS:                ZOMBIE (feature dead-in-fact, described as alive).
PROPOSED FIX:         Mark the nudge (and the old interactive brief) as "old bot — parked/broken,
                      being replaced by Hermes missions" in all three docs. Unscheduling the dead
                      cron is an OPS action → §8.
CONFIDENCE:           HIGH (whether the job still exists today → V-01).
```

### D-05 · S2 · 01-architecture.md L8 — PWA
```
CLAIM:                "The app … installs to phone + desktop (PWA)" (stack table, row 1).
REALITY:              No manifest.json, no service worker, no vite-plugin-pwa, no <link rel=
                      "manifest"> — checked index.html, vite.config.js, package.json, src/**.
                      It's a responsive web app opened in the browser.
EVIDENCE:             index.html (whole file); vite.config.js; package.json deps.
WHY IT MATTERS:       A session might promise offline behaviour, or debug "install" issues that
                      can't exist; 05-glossary's PWA entry reinforces the impression.
CLASS:                ASPIRATION written as fact.
PROPOSED FIX:         Stack row → "web app, works on phone + desktop in the browser; PWA install
                      is a possible later piece."
CONFIDENCE:           HIGH.
```

### D-06 · S2 · 01-architecture.md L101-104 — activity_log
```
CLAIM:                "activity_log — a low-key diary: 'task completed at 2pm', 'brief sent'…"
                      listed under the data foundation.
REALITY:              No migration creates activity_log (all 46 checked). Roadmap Phase 8 (⬜)
                      says "Turn on the activity log" — it is future work. The similarly-named
                      LIVE table is activity_hourly (db/25) — Apple-Health steps/kcal, unrelated.
EVIDENCE:             db/01–46 grep; 02-roadmap.md L1394-1396 ("Phase 8 — Signals & polish").
WHY IT MATTERS:       Name collision + presented-as-existing = a future session queries or writes
                      the wrong table, or "re-creates" it casually without the checker.
CLASS:                ASPIRATION (badly marked).
PROPOSED FIX:         Mark explicitly "NOT BUILT — Phase 8", and distinguish it from
                      activity_hourly by name in the same breath.
CONFIDENCE:           HIGH.
```

### D-07 · S2 · 01-architecture.md L28-49 — front-end shape
```
CLAIM:                Single shell over EIGHT views; kit at src/kit/; theme at src/theme.css.
REALITY:              TEN views (finance, people added 2026-07-10/11) — PILLARS array,
                      LoggedIn.jsx L26. Tree restructured into src/desktop/ + src/mobile/ +
                      src/spine/ with a viewport-gated front door (main.jsx: max-width 860px,
                      locked at load) and a build-time bundle guard (src/buildGuard.js) that
                      FAILS the build if the trees cross-import. Kit = src/desktop/kit/; theme =
                      src/spine/theme/theme.css; palette = src/spine/logic/palette.js.
EVIDENCE:             src/desktop/LoggedIn.jsx L26; src/main.jsx; src/buildGuard.js; tree listing.
WHY IT MATTERS:       Wrong paths waste every session's first ten minutes; the missing mobile
                      tree means a session could ship a desktop-only change believing it covered
                      the app.
CLASS:                DRIFT.
PROPOSED FIX:         Rewrite the front-end-shape block: three trees + front door + build guard +
                      the ten views + corrected paths.
CONFIDENCE:           HIGH.
```

### D-08 · S2 · 05-glossary.md — the Marty/Gemini vocabulary
```
CLAIM:                "Gemini — Google's AI. It does all of Marty's language work…"; "Marty — …
                      Now a full conversational + proactive assistant (see the Marty terms
                      below)" — plus ~15 entries describing capture/undo/brief/nudge as the
                      current product.
REALITY:              Marty's language work is ChatGPT-via-Hermes; the old bot is parked; whether
                      ANY proactive message currently arrives is exactly the unverified cutover
                      (tidy-up #4). Gemini still powers brief/telegram (parked), food-search
                      rerank, meal-estimate, recipe-import.
EVIDENCE:             00-hermes-track.md L28-38, L20-24; supabase/functions/* headers.
CLASS:                DRIFT.
PROPOSED FIX:         Retag the old-bot entries "(old bot — parked, superseded by Hermes)"; fix
                      the Gemini entry to its real current jobs; add Hermes/VPS/hermes-read/
                      hermes-write entries.
CONFIDENCE:           HIGH.
```

### D-09 · S2 · 08-marty-upgrade.md — no supersession banner
```
CLAIM:                Doc presents the M-track bot as Marty's architecture (completed, current).
REALITY:              Replaced by Hermes 2026-07-08; kept as parked rollback only.
EVIDENCE:             00-hermes-track.md L28-33, L199.
WHY IT MATTERS:       It's the doc literally titled "The Marty Upgrade" — the first thing a
                      session grep-ing "Marty" will read.
CLASS:                ZOMBIE (as a description of current Marty); the history within is valid.
PROPOSED FIX:         Top banner: "SUPERSEDED 2026-07-08 — Marty now runs on Hermes (see
                      00-hermes-track.md). This backend is parked as the rollback. Kept as the
                      record of the M-track." Body untouched.
CONFIDENCE:           HIGH.
```

### D-10 · S2 · 11-food-nutrition.md — "one AI touch"
```
CLAIM:                "The one AI touch in V1 is recipe import … Nothing reasons over the owner's
                      actual intake/goals in V1" (L30-36, L54-58, repeated in the F0 paste block).
REALITY:              meal-estimate (supabase/functions/meal-estimate) sends a typed description
                      of what the owner ATE to free-tier Gemini and returns kcal/P/C/F — live,
                      pinned in config.toml, wired to EstimateMealPanel.jsx. food-search's
                      reranker (rerank.ts) also calls Gemini on food queries. Hermes additionally
                      logs estimated meals through ChatGPT (confirm-gated).
EVIDENCE:             supabase/functions/meal-estimate/index.ts L7-12; config.toml
                      [functions.meal-estimate]; food-search/rerank.ts.
WHY IT MATTERS:       The AI-boundary claims are the module's safety story; they're now false as
                      written. Also feeds Q-02 (is intake→free-Gemini even intended?).
CLASS:                DRIFT.
PROPOSED FIX:         Correct the AI-touch inventory in the doc (recipe-import + rerank +
                      meal-estimate + the Hermes path), each with its key and confirm-gate noted.
CONFIDENCE:           HIGH.
```

### D-11 · S2 · 01-architecture.md L245-247 — the health-data/AI hard constraint
```
CLAIM:                Hard constraints: "Gemini free tier trains on inputs… The moment the agent
                      handles sensitive data (mood, health), switch that to cheap pay-as-you-go."
REALITY:              00-hermes-track.md "Amendments" explicitly and deliberately relaxes this
                      ("Relaxes the 'health data never reaches AI' boundary from
                      01-architecture.md") — sleep/body/food/focus flow to the ChatGPT brain.
                      01-architecture itself was never annotated.
EVIDENCE:             00-hermes-track.md L163-165, L200-201.
WHY IT MATTERS:       Two living docs now assert opposite safety rules; whichever a session reads
                      first wins.
CLASS:                DRIFT (an amendment recorded in one doc but not applied to the amended doc).
PROPOSED FIX:         Amend the constraint in place: original rule + "deliberately relaxed for the
                      Hermes brain (owner's decision, 2026-07-08, see 00-hermes-track) — still
                      binding for any OTHER AI use" (pending Q-02's answer for meal-estimate).
CONFIDENCE:           HIGH.
```

### D-12 · S2 · 03-decisions.md — coverage gaps
```
CLAIM:                "I am the record of 'what we chose and why', so we never re-argue settled
                      things."
REALITY:              grep finds ZERO 'hermes' matches, ONE incidental 'finance' match, and no
                      mobile front-door entry in 3,387 lines. The Hermes pivot (the project's
                      biggest decision), the entire Finance V1 decision set, and the
                      mobile/desktop split live only in 00-hermes-track.md / roadmap session
                      notes / code comments ("Decision 2: locked at load", main.jsx).
EVIDENCE:             grep output (this audit); 03-decisions.md headers list.
WHY IT MATTERS:       The doc that exists to prevent re-litigating is silent on exactly the
                      decisions most likely to be re-litigated.
CLASS:                DRIFT (of the doc's completeness, not its entries).
PROPOSED FIX:         APPEND (never edit): three new dated entries — Hermes pivot (pointer to
                      00-hermes-track), Finance V1 decision set (distilled from roadmap session
                      notes), mobile front-door (from main.jsx/handoff). Plus the free-tier
                      supersession entry (D-01).
CONFIDENCE:           HIGH.
```

### D-13 · S2 · 07-ux-flows.md §3 — All Tasks
```
CLAIM:                "All Tasks — the inventory screen (LOCKED, Phase 7 T11…)" — a full live
                      spec section; §3 layout says the Today box "opens the future All Tasks
                      inventory screen."
REALITY:              All Tasks was retired and DELETED (Planning P6, 2026-06-29; files
                      AllTasks.jsx/CategoryDrillRow.jsx/allTasksKit.css removed). The Today box
                      opens Planning; Planning's category mode is the backlog home.
EVIDENCE:             02-roadmap.md L767-782; tree (no AllTasks.jsx).
CLASS:                ZOMBIE.
PROPOSED FIX:         Superseded marker on the section (kept for the record), + one line in §3
                      pointing the box at Planning.
CONFIDENCE:           HIGH.
```

### D-14 → D-28 (S3/S4) — abbreviated detail
Each follows the same shape; quotes and evidence are in the table above. In brief:
- **D-14** roadmap interior markers contradict its own completion banners (M-track header L1005 "🔨 IN PROGRESS" vs L1093 "COMPLETE"; G2 L1131 "AWAITING checker" under a COMPLETE banner L1100; Phase-7 backlog L931-960 lists shipped things as ⬜; "Later — Health pillar, then Life pillar" L1400 predates both pillars shipping). Fix: flip the markers/add pointer lines — the session-note history underneath stays untouched.
- **D-15** the 2026-07-14 P0 note's "every file now under the ~250 ceiling" is false at its own date — census in §6; fix the line + feeds Q-04.
- **D-16** 10-sleep drift (awakenings cut 2026-07-13; two UI rebuild passes since; "nudges via Marty" = parked bot). Fix: a short "corrected" block up top + pointer to the current sleep-redesign record.
- **D-17** hermes domains list omits people + finance (00-hermes-track L131, L281-282; SOUL.md L104). One-line fixes.
- **D-18** 06-design stale paths + "mobile still on the OLD look" + stale nav enumeration. Small edits; the tokens themselves verified CORRECT.
- **D-19** hermes recons → staleness banners (class rule: never rewrite a snapshot body).
- **D-20** health-v2-build-doc STATUS line → dated staleness banner pointing at the handoff-log sleep-redesign entries.
- **D-21** 01-architecture's module-table inventory misses Gym/Sleep/Body/activity_hourly/Focus/Finance — add the missing subsections (part of the D-02/D-07 rewrite).
- **D-22** 00-overview progress paragraph + pillars list refresh.
- **D-23** 07-ux-flows §6/§7 currency notes (pending V-01: what proactive layer actually runs TODAY may be "none").
- **D-24** glossary additions (Hermes, Focus, Planning, Finance vocab).
- **D-25** decisions ordering: one-line editor's note at top ("one entry sits out of order at the bottom — Rolodex 2026-07-10"); the entry itself is never moved (append-only rule).
- **D-26/27** cosmetic marker fixes.
- **D-28** verified-correct; no action.

*(N-01 … N-06 are expanded in §6; Q-01 … Q-04 in the table are the owner's calls, fed by §5.)*

---

## 5. Owner verification queue (exact checks — results feed Stage 2)

Run these in the **Frankfurt** project (`cntlptuacsujbdtwvbis`) SQL editor unless said otherwise.
Never the Ireland project.

1. **V-01 — What crons actually exist and run?**
   ```sql
   select jobid, jobname, schedule, active from cron.job order by jobid;
   select jobname, status, return_message, start_time
   from cron.job_run_details order by start_time desc limit 20;
   ```
   CONFIRMS: whether `marty-daytime-nudge` exists/is active and whether its recent runs fail
   (D-04); whether `brief_daily_7am_ams` still fires the old 7am brief (Q-03); the gym sync state.

2. **V-02 — Which Vault secrets exist (names only)?**
   ```sql
   select name from vault.secrets order by name;
   ```
   Expected (per handoff 2026-06-24): exactly one — `brief_service_role_key`. That alone
   re-confirms D-04 (the nudge cron reads a name that doesn't exist). Anything extra is news.

3. **V-03 — Telegram delivery state.** In a terminal (uses your bot token — don't paste the
   token anywhere else):
   ```
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```
   An empty `url` = webhook removed (Hermes polling owns the bot; old bot fully parked).
   A supabase URL = the old webhook is still attached. Settles hermes-track tidy-up #4.

4. **V-04 — Fallback brain configured?** On the box:
   `ssh -i ~/.ssh/hetzner_lifeos chris@46.225.81.162`, then look in `/root/.hermes/.env` (via
   sudo) for a fallback/API-key entry, and in the Hermes config for a fallback model block.
   Settles Q-01. (While there: confirm the two SKILL.md files + their `.bak-20260710` backups
   still exist — N-item from 14-rolodex.)

5. **V-05 — Was HERMES_READ_SECRET rotated?** If you don't remember doing the rotation in
   tidy-up #1: it wasn't. `env -u SUPABASE_ACCESS_TOKEN supabase secrets list --project-ref
   cntlptuacsujbdtwvbis` shows secret digests — compare against a fresh set if unsure.

6. **V-06 — BotFather toggles** (tidy-up #3): open @BotFather → your bot → Group Privacy should
   be ON, Allow Groups OFF. 30 seconds.

7. **V-07 — Is production up to date?** The repo is **13 commits ahead of origin/main** (the
   whole sleep redesign is unpushed). Open the Vercel dashboard → check the last deployed commit.
   Then decide: push now, and find/pause the "Update LifeOS" auto-push tool (N-04) before the
   next multi-commit piece.

8. **V-08 — Migrations 44-46 applied live?**
   ```sql
   select to_regclass('public.finance_accounts') is not null as finance_live;
   select schedule from cron.job where jobname = 'gym-twice-daily-sync';
   ```
   Second query should show the 7-hour union schedule from db/46 if it was applied.

---

## 6. Undocumented invariants (the N items) + the true inventories

These came from the direct audit plus a full sweep of the 14,755 lines of the handoff log +
decisions doc. An important discovery: a **"Hard-won lessons" appendix already exists** — but it's
buried at handoff-log ~L5177, mid-file, where entries stopped being appended above it (N-07). Most
of the rules below are stated there or repeated across entries (some ~10–20 times) and were never
promoted to a living doc.

**Invariants that exist only as scar tissue / code comments — each needs a durable home:**

| # | Invariant (one line) | Where it lives now | Should live |
|---|---|---|---|
| I-1 | Every header-authed edge function MUST be pinned `verify_jwt=false` in config.toml before any deploy; JWT-authed ones pinned `true`; deploy pinned functions ALONE | 03-decisions L1306 (S5b lesson) + config.toml comments | 01-architecture (function inventory) + CLAUDE.md one-liner |
| I-2 | `SUPABASE_ACCESS_TOKEN` in the shell points at the WRONG account — prefix every CLI call with `env -u SUPABASE_ACCESS_TOKEN` and confirm the ref | 00-hermes-track guardrail 6 | CLAUDE.md (it bites every session that touches the CLI) |
| I-3 | After any `ALTER TABLE`, run `notify pgrst, 'reload schema'` or writes silently drop the new column | migration file comments (db/42 etc.) | 01-architecture ops notes |
| I-4 | Schema changes need the Checker and the exact phrase "checker approved"; db/ and src/ never share a commit (two-track) | scattered: module docs + hermes-track G5 | CLAUDE.md |
| I-5 | The desktop and mobile trees must never cross-import; spine/ is the only shared code; mobile CSS must be imported statically in main.jsx (dynamic-chunk CSS preload is broken in Vite 5) | src/buildGuard.js + main.jsx comments ONLY | 01-architecture front-end section |
| I-6 | One definition of "a day" — the shared Amsterdam-timezone helper — for every module | module docs (S/F/G) | 01-architecture data section |
| I-7 | `gym_workouts` is a Hevy CACHE keyed on hevy_id — nothing but the sync may ever write it | 00-hermes-track (gym excluded) + 09-gym | 01-architecture module-tables section |
| I-8 | An unidentified tool auto-commits and PUSHES as "Update LifeOS" — pause it before multi-commit refactors | 02-roadmap debt bullet L40-45 | CLAUDE.md warning until identified |
| I-9 | tasks.time_bucket is NOT NULL DEFAULT 'Today' — there is no bucket-less task; the buckets are hidden-but-present under the dates-only UI | decisions L925/937; handoff L5149-5171 | 01-architecture data section |
| I-10 | Verify a write by `updated_at` / row identity, never by "the value looks right" — AND: the `tasks` table has NO `updated_at` (42703); verify tasks by id/title/`completed_at` | handoff L5192-5194; decisions L1318-1322 | 01-architecture ops notes |
| I-11 | Any token/secret pasted into a chat gets rotated at session close | decisions L1327; handoff L5930, L6735 | CLAUDE.md |
| I-12 | CSS regressions are only real on a HARD reload — Vite HMR re-injects changed stylesheets at the END and fakes cascade breaks; CSS import ORDER is load-bearing (chart primitives before sleepNight.css) | handoff L293-296, L304-305 (single statements — highest promotion value) | 06-design or CLAUDE.md |
| I-13 | Synced caches delete by EXPLICIT delete events only — never infer a delete from absence; the cursor advances only on a fully clean pass | handoff L6580-6586 | 01-architecture (gym section) |
| I-14 | Test writes are ZZTEST-tagged and deleted by exact id after verify — never "most recent N" | handoff L770-771, L806, L1196, L9637+ | CLAUDE.md |
| I-15 | "Deployed ≠ done" — a cron/pipe proves itself only by firing; owner-verify is the gate | handoff L334-337, L5952, L6590 | CLAUDE.md (extends "don't claim done loosely") |
| I-16 | Category FK is SET NULL on delete, never cascade; derived category colours are computed at render, never written | handoff L8271, L10604 | 01-architecture data section |

**The true edge-function inventory (nothing in the docs holds this today — D-02/N-03):**

| Function | Auth | verify_jwt pinned? | Status |
|---|---|---|---|
| telegram | Telegram secret-token header + owner gate | **NOT PINNED (needs false)** | parked rollback (state → V-03) |
| brief | project JWT (service-role callers) | not pinned (default true = wanted) | parked-ish; 7am cron state → V-01 |
| gym | project JWT | not pinned (default true = wanted) | live (cron 4×/day, db/46) |
| health-ingest | x-health-secret header | pinned false ✓ | live (Apple Shortcut 4×/day) |
| food-search | owner JWT | pinned true ✓ | live |
| meal-estimate | owner JWT | pinned true ✓ | live |
| recipe-import | owner JWT | pinned true ✓ | live |
| hermes-read | X-Hermes-Secret header | pinned false ✓ | live |
| hermes-write | X-Hermes-Write-Secret header | pinned false ✓ | live |

**The 250-line census (worst offenders; rule: CLAUDE.md "~250 lines"):**
CSS: foodLog.css 706 · cookbook.css 690 · todayForm.css 509 · formGuide.css 493 · broadsheet.css
390 · foodModal.css 369 · bodyPage.css 362 · cook.css 319 · weekGrid.css 284 · foodGoals.css 276 ·
mobileFood.css 254. JS/JSX: Today.jsx 272 · WeekView.jsx 255. All .ts functions are compliant.
→ feeds Q-04 (is the ceiling meant for CSS?).

**Missing docs:** N-01 Finance (propose `13-finance.md`, filling the number gap) · N-02 the
mobile/spine architecture section.

---

## 7. Cross-doc contradictions

| # | Doc A says | Doc B says | Note |
|---|---|---|---|
| C-1 | CLAUDE.md/AGENTS.md/00-overview/01-arch: free tiers only, hard rule | 00-hermes-track: paid VPS + subscription, recorded as decided | = D-01 |
| C-2 | 01-arch L245-247: health data must never reach a training/free AI | 00-hermes-track: boundary deliberately relaxed | = D-11 |
| C-3 | 09-gym L32-34 + 10-sleep L36-39: "no health data is ever sent to an AI" (stated as a system guarantee) | hermes-read ships sleep/body/gym/food to the ChatGPT brain | module-level claims outgrown by the system; needs the same amendment note |
| C-4 | 07-ux-flows §3 + 05-glossary: All Tasks screen exists (opened from Today's box) | 02-roadmap P6: All Tasks retired + deleted; box opens Planning | = D-13 |
| C-5 | 02-roadmap L1005 header: M-track IN PROGRESS | same doc L1093: M-track COMPLETE; 08-marty: COMPLETE | = D-14 |
| C-6 | 00-hermes-track L131 + SOUL.md L104: hermes-write = task/event/food/body/sleep/focus, gym excluded | 14-rolodex D14b + roadmap H-fin-a: people + finance write kinds live | = D-17 |
| C-7 | 06-design L257+: mobile "still on the OLD look" | src/mobile/*: a full broadsheet mobile tree (Today, Food, Health, Cook, Capture…) | = D-18 |
| C-8 | 01-arch L64-65: Inbox "is just the first category" | 05-glossary + code: Inbox = category_id NULL (no row at all) | small but a real shape contradiction — the glossary/code version is the true one (CategoryPicker: "Inbox = null", roadmap T6) |
| C-9 | 03-decisions header: "New decisions on top" | Rolodex entry (2026-07-10) at the file's bottom | = D-25 |
| C-10 | 10-sleep: awakenings kept + shown | handoff 2026-07-13 (Piece 2): awakenings + respiratory cut from every Sleep surface | = D-16 |
| C-11 | 04-handoff L6504-6518: marty-daytime-nudge cron BROKEN (missing Vault secret) | 04-handoff ~L343 (2026-07-14 gym entry): "the hourly marty-daytime-nudge" spoken of as live | the broken-cron fact never propagated even inside the same doc |
| C-12 | 01-arch L11 stack table: "Gemini … (Flash, free tier)" | decisions L2716-2736: model is `gemini-3.1-flash-lite` (500/day) after 2.5-flash proved ~20/day | small model-name drift inside the stack table |

---

## 8. Code / operational problems — NOT doc problems (handed to Part B untouched)

1. **config.toml: `telegram` unpinned** (D-03) — one-line fix, but it's code; not touched here.
2. **HERMES_READ_SECRET leaked + apparently unrotated** (hermes-track tidy-up #1 still open).
3. **The daytime-nudge cron** (D-04): confirmed broken since creation (missing Vault secret);
   `select cron.unschedule('marty-daytime-nudge')` retires it cleanly — an ops decision.
4. **The old 7am brief cron** (Q-03): decide whether the parked bot should still text every morning.
5. **Fallback brain** (Q-01): actually configure it, or strike the guardrail.
6. **BotFather toggles** (tidy-up #3) — still open per docs.
7. **Retro Checker pass** over hermes-read/hermes-write + db/42 (tidy-up #2) — still open.
8. **13 unpushed commits** + the unidentified "Update LifeOS" auto-push tool (N-04/N-06).
9. **SKILL.md files not in version control** (known, recorded in 14-rolodex — a standing risk).
10. **250-line ceiling violations in CSS** (D-15/Q-04) — splitting is code work if the owner wants it.

---

## 9. Leads checked and DISPROVED (kept on the record)

1. **Design tokens (lead 16):** `06-design.md` values match `theme.css` exactly — paper #F6F5F1,
   ink #1C1916, accent #C8643D, overdue #A85C44, Fraunces/Inter (+ UnifrakturMaguntia). No drift.
2. **Dark mode:** docs say "not built" — TRUE; theme.css's dark block is commented out.
3. **`events` has no `source` column (lead 4):** TRUE — and the docs already say so correctly
   (01-arch L194, 14-rolodex Amendment 2, 08-marty L182). No drift.
4. **`telegram_saves` (lead 15):** zero references in src/ or functions — code-dead as documented;
   docs honestly say "left in place, no longer read or written". No drift (table drop remains a
   documented later cleanup).
5. **`brain/` directory (lead 2):** no living doc references a brain/ directory (docs live at
   repo root as numbered files, and the docs say so).
6. **"Next migration number" claims (lead 6):** no living doc states a next-migration number;
   highest is `db/46`, so the next is 47. Nothing to fix.
7. **Fallback-brain false comfort (lead 9), softened but strengthened:** 00-hermes-track does NOT
   flatly claim it exists — it lists it as a guardrail with an inline "(Confirm it's configured.)"
   hedge, so it isn't a clean textbook S1. BUT the full sweep of the handoff log + decisions doc
   found **zero mention of a fallback brain, a capped key, or its configuration anywhere else** —
   no session ever set one up on the record. Reported as Q-01 with V-04 as the decider.

Also checked: **no HERMES_READ_SECRET rotation is recorded anywhere** in the handoff log or
decisions doc (only HEALTH_INGEST_SECRET was ever rotated, 2026-06-25) — so hermes-track
tidy-up #1 (the leaked read secret) is almost certainly still open (V-05).

---

## 10. Proposed Stage 2 work order (docs only, one commit, every edit traced to an ID)

| # | Doc | Treatment (per class) | Findings | Size |
|---|---|---|---|---|
| 1 | 01-architecture.md | REWRITE (stack table, runtime/function inventory, front-end shape, module tables, constraints) | D-02 D-05 D-06 D-07 D-11 D-21 C-8 I-1 I-3 I-5 I-6 I-7 I-9 N-03 | full rewrite |
| 2 | CLAUDE.md | Surgical: free-tier rule reword; + checker-gate/two-track line; + CLI-token + auto-push warnings | D-01 I-2 I-4 I-8 | ~10 lines |
| 3 | AGENTS.md | Same edits as CLAUDE.md | D-01 I-4 | ~6 lines |
| 4 | 00-overview.md | Refresh "What V1 is" progress note, pillars status, free-to-run line | D-01 D-22 | 1 section |
| 5 | 05-glossary.md | Retag old-Marty entries; fix Gemini entry; add Hermes/Focus/Planning/Finance terms | D-08 D-24 | ~30 lines |
| 6 | 07-ux-flows.md | Superseded marker on All Tasks; §6/§7 currency notes | D-13 D-23 | 3 small blocks |
| 7 | 08-marty-upgrade.md | SUPERSEDED banner only | D-09 | 5 lines |
| 8 | 02-roadmap.md | Flip stale headers/markers; fix the 250-claim; refresh "Later" section | D-14 D-15 D-26 | ~10 line-edits |
| 9 | 06-design.md | Path fixes; "built & live" + mobile bullets refreshed | D-18 | ~10 lines |
| 10 | 10-sleep-body-stats.md | "Corrected" block up top (awakenings cut; two passes since; Marty note) | D-16 | 1 block |
| 11 | 11-food-nutrition.md | AI-touch inventory corrected | D-10 | 1 block |
| 12 | 09-gym-form-guide.md | Interior markers note + system-level AI-claim amendment note | D-27 C-3 | ~6 lines |
| 13 | 00-hermes-track.md | Domains list + guardrail-8 enumeration + (post-V-01..V-06) tidy-up status updates | D-17 D-03(doc side) | ~8 lines |
| 14 | SOUL.md | Tools line: + people/finance | D-17 | 1 line |
| 15 | hermes-recon.md, hermes-write-recon.md | Staleness BANNERS (bodies untouched) | D-19 | 2 banners |
| 16 | health-v2-build-doc.md | Staleness banner on the STATUS line | D-20 | 1 banner |
| 17 | people-recon.md, people-recon-2.md | One-line "since shipped as db/43" banner | inventory | 2 lines |
| 18 | 03-decisions.md | APPEND ONLY: Hermes-pivot entry, Finance-V1 entry, mobile front-door entry, free-tier supersession entry, ordering editor's note | D-12 D-25 D-01 | 4 new entries |
| 19 | **NEW 13-finance.md** | Write the missing module spec (from db/44-45, src/desktop/finance/, roadmap notes) | N-01 | new doc, ~150 lines |
| 20 | 04-handoff-log.md | New audit entry at top (standard template) | ritual | 1 entry |

Notes for approval: (a) item 19 creates a doc — say if you'd rather defer it; (b) several D-04/D-23
wordings depend on V-01/V-03 answers — Stage 2 marks them "unverified" if you haven't run the
checks; (c) the audit brief assumed a **⟳ override-marker convention in 03-decisions.md — it does
not exist** (zero occurrences, both history docs checked). The real house convention is a
**`> ⚠️ SUPERSEDED <date>` blockquote above the stale text + inline ~~strikethrough~~** (live
examples at decisions L432, L677, L766, L797). Stage 2 will follow THAT convention, not invent ⟳;
(d) one Stage-2 extra worth approving: **hoist the buried "Hard-won lessons" list (N-07) to the
top of the handoff log** (a pure move within the same append-only doc, content untouched) or fold
its rules into CLAUDE.md/01-architecture per §6 — say which you prefer.

---
*End of Stage 1 report. Waiting at the stop gate.*
