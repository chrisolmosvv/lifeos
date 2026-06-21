# LifeOS — Architecture

> I am the "how it's built." Stable doc — changes rarely.

## The stack (six free helpers)
| Piece | Job | Service | Cost |
|---|---|---|---|
| The app | What you see and tap; installs to phone + desktop (PWA) | React + Vite + Tailwind, hosted on Vercel | Free |
| The brain | Stores data, handles login, runs the agent code | Supabase (Postgres + Auth + RLS + Edge Functions) | Free tier |
| The messenger | You ↔ agent chat | Telegram bot | Free |
| The intelligence | Reads the day, writes the brief in real words | Gemini API (Flash, free tier) | Free |
| The alarm | Wakes the agent at 7am | Supabase scheduler (pg_cron) | Free |
| The vault | Saves every version of the code | GitHub | Free |

Build tool: **Claude Code** on the owner's Claude Max plan.

## The data foundation (the part that lets pillars bolt on later)
Everything is a few simple lists that point at each other. V1 only fills in
the first three, but the shapes are built to grow.

- **categories** — buckets, where any bucket can live inside another
  (Uni → Q2 → Class A). The **Inbox is just the first category** (where
  uncategorized things land) — not special machinery.
- **tasks** — things to *do*. Fields: title, notes, category, parent task
  (for subtasks), priority (high/med/low), time bucket (Today / This Week /
  Someday), due date (optional), scheduled start/end (optional, for
  time-blocking on the calendar), status, **completed_at timestamp**.
- **events** — things that *happen* and you attend. Built to the calendar
  standard: start, end, location, repeat rule, plus a hidden **external_id**
  field (free prep for future Apple Calendar sync).

### The one move that unlocks everything
Every task carries an optional **source** ("typed by me", later "meal planner",
"people module", etc.). Future modules don't touch the calendar's guts — they
just **write tasks**, which then appear in the day automatically. This is how
Health and Life pillars plug in with no rebuild.

### Quiet signal capture (for future habit-learning)
- **activity_log** — a low-key diary: "task completed at 2pm", "brief sent",
  "app opened". Invisible to the user. Future habit-learning reads this to
  find productive hours, gym consistency, etc.
- Note: "what triggers doomscrolling" needs a data source we don't have yet
  (arrives with the Mind module + Screen Time). Don't fake it.

## How the pieces connect (runtime)
You → the app → Supabase (read/write your data). Supabase's agent talks to
Telegram (two-way chat) and Gemini (writes the brief). The 7am alarm wakes the
agent. GitHub just stores the code (not part of the running flow).

## Hard constraints
- **Free tiers only.** If a choice needs paid hosting/DB/API, stop and flag it.
- **RLS (row-level security) ON** — the database refuses to hand out data
  that isn't the owner's.
- **Single user.** No multi-user features, no sharing, no roles.
- **Gemini free tier trains on inputs.** Fine for tasks/events. The moment the
  agent handles sensitive data (mood, health), switch that to cheap
  pay-as-you-go (~$1-4/mo, no training). See decisions doc.
