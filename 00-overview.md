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
- Add things manually in the app, OR by texting the Telegram agent.
- A 7am brief: today's overview + nudges on stale items + a suggestion to
  fill a gap in the day.
- Everything else (gym, meals, people, etc.) comes later as bolt-on modules.

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
