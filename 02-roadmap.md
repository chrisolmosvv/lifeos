# LifeOS — Roadmap

> I am "where we are." LIVING doc — update me at the end of every session.
> Status keys:  ✅ done   🔨 in progress   ⬜ not started

There are no dates. We work when there's time and will. We finish one phase
fully before starting the next. Each phase ends on a visible win.

---

## ✅ Phase 0 — Setup & the Project Brain
Goal: make the free accounts, get Claude Code running, put the brain docs
into the repo and the project knowledge.
**Done when:** the project has a memory and an empty app is live on the internet.
Tasks:
- ✅ Create accounts: GitHub, Supabase, Vercel, Telegram bot, Google AI Studio (Gemini)
- ✅ Install Claude Code, point it at a new repo
- ✅ Drop these brain docs into the repo; rename the rules file to CLAUDE.md
- ✅ First commit (first save point)
- ✅ Build minimal React+Vite app and deploy live on Vercel

## ✅ Phase 1 — The skeleton you can see
App shell deployed, login works, empty week-view calendar on desktop + a
stripped phone layout.
**Done when:** I open my app on my phone and log in.

## 🔨 Phase 2 — Categories & Inbox   ← CURRENT
Create/edit buckets with colors and sub-levels; Inbox as the default.
**Done when:** my real life categories exist.

## ⬜ Phase 3 — Tasks
Add, edit, complete, prioritize, time-bucket, subtasks, due dates.
**Done when:** I'm putting in real tasks and checking them off.

## ⬜ Phase 4 — Events & the week calendar
Add events; see events + scheduled tasks together; drag a task onto a slot.
Feels like Apple Calendar.
**Done when:** my week looks right and I'm living in it.
(This is where it's genuinely usable as a manual tool — before any AI.)

## ⬜ Phase 5 — Telegram capture
Connect the bot. Text "dentist Thursday 2pm" → Gemini reads it → it logs
correctly → replies telling me exactly what it did and where.
**Done when:** I add things by texting.

## ⬜ Phase 6 — The 7am brief + anti-staleness engine
Scheduler wakes the agent; Gemini writes a brief: day overview + stale-item
nudge + a suggestion to fill a gap.
**Done when:** it texts me every morning and it's actually useful.
**← This is the real V1 finish line.**

## ⬜ Phase 7 — Signals & polish
Turn on the activity log; smooth rough edges; make it nice to look at.
**Done when:** V1 done, foundations quietly logging for the future.

---

## ⬜ Later — Health pillar, then Life pillar
Each is its own cluster of phases that ADDS tables and screens and writes
tasks into the core. We do not touch the spine.

---

## Session notes (most recent on top)
- **2026-06-22 — Phase 2, Piece 1 of 3: shared visual foundation built (not yet
  locked).** Loaded Fraunces + Inter (Google Fonts, two weights each), added a
  single theme file of CSS variables (warm paper/ink palette + terracotta
  accent `#C8643D`), built one masthead strip (nameplate, live clock with
  tabular figures, hairline rule, Log out moved in), and made login + calendar
  inherit the new type and colours. No categories, no Inbox, no palette, no
  tables — those are Pieces 2 & 3. Builds clean. **Showing the owner to tweak
  the fonts/colours before locking; Phase 2 is NOT done.**
- **2026-06-22 — Phase 1 DONE & verified. Phase 2 is now current.** Pushed the
  calendar commit to GitHub and added the two Supabase env vars
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel — that fixed the blank
  live site. Owner then logged in successfully on both Mac and iPhone against the
  live Vercel site and the empty week-view calendar shows on both. Phase 1's
  "done when" (open the app on my phone and log in) is met. Next up: Phase 2 —
  Categories & Inbox.
- **2026-06-22 — Phase 1, step 2: empty calendar shell built.** After login, the
  "you're logged in" placeholder is replaced by the calendar. Desktop shows an
  empty Apple-Calendar-style week grid (Mon–Sun, hour rows, today's column marked
  with a red date circle + a live red "now" line). Phone shows a clean single-day
  view instead of a squished grid. No data, no tables touched. Builds cleanly.
  STILL TO DO for Phase 1: deploy to Vercel and log in on the phone.
- **2026-06-21 — Phase 1, step 1: login built.** Supabase email magic-link login
  working and confirmed on the owner's Mac.
- **2026-06-21 — Phase 0 complete.** Created all five accounts (GitHub, Supabase,
  Vercel, Telegram bot, Gemini). Installed Claude Code. Created the `lifeos` repo,
  added and verified all seven brain docs, built a minimal React+Vite app (single
  page showing "LifeOS"), confirmed it builds cleanly, and deployed it live on
  Vercel. Repo is public at github.com/chrisolmosvv/lifeos.
