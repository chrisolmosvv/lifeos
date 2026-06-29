# LifeOS — Overview

> Read me first. I am the "why." Plain English only.

## What this is
A personal life-management app for one person (the owner). It pulls tasks,
events, and eventually health and life data into one place, and uses a
friendly agent (over Telegram) to keep things from going stale.

## The core insight (the actual point)
Previous attempts failed because a task list **just sits there**. The product
here is NOT the task list — it's the **proactive engagement layer**: the 7am
message that drags forgotten things back into view at the right moment.
The calendar and tasks are the foundation; the morning brief is the point.

## Three pillars (long-term vision)
1. **Work** — tasks, calendar, focus timer, uni overview.
2. **Health** — gym, habits, nutrition/cooking, sleep, body stats, mind.
3. **Life** — finances, people rolodex.

## What V1 is (deliberately small)
- Tasks + events + a week-view calendar (feels like Apple Calendar).
- Add and manage things manually in the app, OR by **talking to Marty** (the Telegram
  bot) — now a full conversational + proactive assistant: capture by **text or voice**
  (one or several things at once), ask questions ("what's on Thursday?"), change things
  ("move the dentist to Friday", "done report", "delete the 3pm"), and have him **guess +
  learn** which category things belong in. Every change is **undoable**.
- A **7am brief** (today's schedule first, then what needs attention, plus at most one
  stale-item nudge + one gap offer) — now **interactive**: reply "done 1" / "move 3 to
  Friday" to act straight from it.
- A **daytime nudge**: a calm, heavily-guardrailed offer (max twice a day, 9–6, never
  back-to-back) to use a real free hour for an overdue task or a quick win.
- Everything else (gym, meals, people, etc.) comes later as bolt-on modules.
- *(Progress since: the conversational + proactive Marty backend ("M-track", M0–M10) and the
  Phase-7 look-and-feel redesign are complete; the first bolt-on pillars have since shipped —
  Sleep/Body ("S-track"), Gym ("G-track"), and Food (Cookbook + Nutrition, "F-track", F0–F9 done,
  F10 next). Live per-piece status is in `02-roadmap.md`.)*

## Who it's for
One user. Just the owner. No accounts for other people, ever. This lets us
skip a huge amount of complexity.

## Guiding principles
- **Free to run.** Everything sits inside free tiers (see architecture doc).
- **Foundations first.** Build the data shapes so future pillars bolt on
  without a rebuild. Never rush V1 in a way that blocks V3.
- **Plain-English collaboration.** The owner does not read code. Explain
  decisions simply, give options with pros/cons, and just decide when the
  choice is obvious.
- **Small, tidy, saved often.** See CLAUDE.md for the working rules.
