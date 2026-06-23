# LifeOS — The Marty Upgrade (backend track M0–M9)

> I am the plan for making Marty (the Telegram bot) **conversational**.
> Plain English. This track is **backend only** — it touches ONLY
> `supabase/functions/`. It must not disturb the Phase 7 front-end redesign,
> which lives in `src/` and is mid-flight. The two tracks run side by side and
> do not collide.

## Why a separate M-track (and not "Phase 8")
The redesign is numbered as **Phase 7** and is unfinished. To avoid confusing
two unfinished bodies of work that touch different folders, the Marty upgrade
gets its own short prefix — **M0 through M9** — so a roadmap line, a commit, or
a decision is instantly recognisable as "the bot track" vs "the redesign track."
See the decision recorded in `03-decisions.md`.

## What we're building (the point)
Today Marty can do three things: **capture** a texted task/event, **undo** the
last thing he saved, and fire the **brief** ("brief" / "brief test"). Routing is a
short ladder of exact-word checks in `telegram/index.ts`; anything that isn't a
known word is assumed to be a capture and sent to Gemini.

The upgrade makes him a real assistant you can **talk to**: ask him questions,
have him **edit / delete / move** things, finish a capture over a **short
back-and-forth**, learn which **category** things belong in, take **voice notes**,
let you **reply to the morning brief**, and get a gentle **daytime nudge**.

## The two ground rules for the whole track
1. **Backend only.** Never edit `src/`. If a change seems to need the front-end,
   STOP and flag it — it belongs to Phase 7, not here.
2. **Protect the spine.** New abilities ADD tables and write tasks/events through
   the existing shapes. They never change what a task/event/category *means*, and
   RLS stays owner-only. (Same rule as the rest of LifeOS.)

---

## The phases

Only **M0** is built and locked. **M1–M9 below are the intended shape, not yet
locked** — each gets its own small piece, its own save point, its own owner
verify, and its own decision entry when we actually build it. The order may shift.

- **M0 — Prep + one Gemini config seam.** *(built this session)*
  A clean docs rollback anchor for the whole track, then route **both** existing
  Gemini callers (`telegram/understand.ts`, `brief/write.ts`) through **one**
  shared module (`_shared/gemini.ts`) that owns the key, the model name, the
  endpoint, and the fetch+retry+rate-limit loop. Pure refactor — **no behaviour
  change**. Makes a future switch to a paid Gemini key a one-place change.

- **M1 — The router (the seam for everything after).** Replace the inline
  word-ladder in `telegram/index.ts` with a small, readable step that decides what
  a message *is*: a command (undo/brief), a **question**, an **edit/delete**, or a
  **capture**. Nothing new for the user yet — same behaviour, but now there's a
  clean place to add the new message types.

- **M2 — Questions ("what's on Thursday?").** Read-only. Marty reads the relevant
  day/range and answers in plain words. Never writes anything.

- **M3 — Edit / delete / move by chat.** "move the dentist to Friday", "rename …",
  "delete the call to mum". Extends the bookkeeping so these actions can be
  reversed too (today's `undo` is **create-only** — it can only remove things Marty
  *made*; this phase has to design for reversing changes).

- **M4 — Multi-turn capture.** When a capture is missing something (no date, an
  ambiguous time, no obvious category), Marty asks **one** short follow-up instead
  of guessing — and remembers the half-finished item until you answer.

- **M5 — Category learning.** Instead of everything landing in **Inbox**, Marty
  suggests/uses the right category, learning from how you file things.

- **M6 — Voice notes.** A Telegram voice message → transcribed → straight into the
  capture path. (Today non-text messages are silently dropped.)

- **M7 — The interactive brief.** Reply to the 7am brief to act on it — tick a
  nudge done, reschedule a forgotten task, accept a free-window offer — by chat.

- **M8 — Daytime nudges.** A gentle, reserved midday check-in (the same
  "proactive engagement" idea as the brief, but during the day), built on the same
  safety rails: never spammy, never invents work.

- **M9 — Hardening + retire the test scaffolding.** Remove the temporary aids
  ("brief test" 0-day threshold, the brief's `force` gate, the every-3-min test
  job) once the real features make them unnecessary; tighten and tidy.

---

## Known things to design around (carried from the M0 recon)
- **Bare dates with no year** (e.g. "Jan 10") have no explicit rule today and could
  resolve to a *past* date — pin this down before leaning harder on capture (M1/M4).
- **`undo` is create-only and one level** — editing/deleting (M3) needs its own
  reversal design; the current `telegram_saves` log only points at created rows.
- **`source='telegram'` is stamped on tasks but not events** — remember this if a
  feature wants "everything Marty made" uniformly.
- **The telegram function keeps its own copy of the date/time helpers**; the shared
  `_shared/datetime.ts` is used only by the brief. Unifying those is a **separate
  later cleanup**, deliberately NOT part of M0.
