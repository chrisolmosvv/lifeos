# LifeOS — Glossary

> Plain-English meanings for words that show up. If a chat or Claude Code uses
> a term that isn't here and you're unsure, ask them to add it.

- **Repo / repository** — the folder that holds all the project's code.
  Lives on your computer and is backed up to GitHub.
- **Commit** — a save point. Each commit is a snapshot you can return to.
- **GitHub** — the website that stores your commits safely (the vault).
- **PWA (progressive web app)** — a website that installs to your phone and
  desktop and behaves like a real app.
- **Supabase** — the service that stores your data, handles your login, and
  runs the agent's code. "The brain."
- **Database** — the organized store of your tasks, events, and categories.
- **Table** — one list in the database (e.g. the tasks table, the events table).
- **RLS (row-level security)** — a rule that makes the database refuse to hand
  out data that isn't yours. Privacy, enforced at the source.
- **Edge function** — a small piece of code that runs in the cloud on demand
  (e.g. the agent that writes your morning brief).
- **Scheduler / cron** — the alarm clock that runs something on a timer
  (your 7am brief).
- **API** — a way for two programs to talk to each other (e.g. our app asking
  Gemini to write text, or pulling data from the Hevy gym app later).
- **Gemini** — Google's AI that writes the morning brief in real words.
- **Telegram bot** — the chat account you text to add things and that texts
  you back.
- **Marty** — the name of your Telegram bot (@lifeos_marty_bot).
- **Webhook** — a "ping me when something happens" link: Telegram calls your
  cloud function at this address every time you text the bot.
- **Secret token** — a private password Telegram sends in a hidden header on
  every webhook call; the function refuses any request without it, so the public
  address can't be abused.
- **Undo (Marty)** — text "undo" and Marty removes the single most recent thing
  *he* saved. Never touches tasks/events you made in the app yourself.
- **Marty's save log (telegram_saves)** — a small private list noting what Marty
  saved, so "undo" knows exactly which one row to remove.
- **Token** — a chunk of text (roughly a few characters). AI usage and cost are
  measured in tokens.
- **Context window** — how much an AI can "hold in its head" at once. When it's
  full, the AI forgets earlier stuff. The reason for small files + brain docs.
- **Frontend** — the part you see and click (the app).
- **Backend** — the parts you don't see (database, agent code, scheduler).
- **Deploy** — to put the app online so you can open it from anywhere.
- **Vercel** — the free service that hosts (deploys) your app.
- **Bucket (time bucket)** — which list a task sits in: **Today**, **This Week**,
  or **Someday**. Every task is in exactly one. Someday is the quiet "not now,
  but don't lose it" drawer.
- **Due date** — "this is due *by* this day" — a deadline, no time of day. Shows
  as a calm dateline on the task; turns brick-coloured when it's in the past
  (overdue). It does **not** put the task on the calendar.
- **Scheduled task (time-block)** — a task you've dragged onto the calendar to
  block time to *do* it (it gets a start and end time). It's still a task (still
  in its list, still ticked there); the calendar block is just a second view of
  it. Different from a due date: a due date is *when it's due*, a time-block is
  *when you'll do it*.
- **Subtask** — a smaller task nested under a parent task. One level only (a
  subtask can't have its own subtasks). The parent shows an "X of Y done" count
  but isn't completed automatically.
- **Now-line** — the thin terracotta line across today's calendar column showing
  the current time (like Apple Calendar's red line).
