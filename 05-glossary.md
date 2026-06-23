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
- **Scheduler / cron (pg_cron)** — the alarm clock inside the database that runs
  something on a timer. It's what wakes your 7am brief every morning.
- **pg_net** — the database's ability to make a web call out to the internet. The
  7am alarm uses it to "phone" the brief function and tell it to run.
- **Vault** — a locked drawer inside the database for secrets (passwords/keys). The
  7am alarm keeps its master key (the service-role key) in the Vault and reads it only
  at run time, so the key is never written into the schedule or saved to GitHub.
- **The brief / morning brief** — the 7am text from Marty: a short, warm recap of
  your day (events, today's tasks, anything due or overdue), plus at most one gentle
  "you've been meaning to…" nudge and at most one "you've got a free window for X"
  offer. The whole point of the app — it pulls forgotten things back into view.
- **"brief" / "brief test" (triggers)** — text Marty **"brief"** any time to get the
  brief on demand (same as the 7am one). **"brief test"** is a temporary testing word
  that relaxes the "forgotten task" rule (treats anything waiting as fair game) so the
  nudge can be checked without waiting days — it'll be retired later.
- **Service-role key** — the database's master key that bypasses the usual privacy
  rules. Only trusted server code uses it (the 7am alarm, the bot). It lives in the
  Vault/secret store, never in the app or GitHub.
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
- **Status (3 states)** — a task is **To do → In progress → Done**. The little
  connected **status pill** on a task row sets it in one tap; "in progress" is an
  optional middle step. Marking done greys + strikes the row till midnight (undo
  always there).
- **Component kit** — the reusable, sealed building blocks the screens are made of
  (`src/kit/`): the masthead, hairline rules, the day grid, tinted calendar blocks,
  task rows, the status pill, the form + category picker, toasts. Change a block in
  one place and it updates everywhere; styles can't leak between screens.
- **Archive (soft-delete)** — deleting a task, event, or category doesn't destroy
  it — it's **archived** (hidden from the app but kept). Each delete is one
  **batch** you can **Restore** as a unit from the **Archive screen** (Settings →
  Archive). Archiving a category archives its whole branch (its sub-categories +
  their tasks/events) together.
- **Delete now** — the only permanent delete: on the Archive screen, wipe one batch
  for good (behind a confirm that names what it removes). The one irreversible action.
- **Tasks today / Next 7 days** — the two task modules on the rebuilt Today home:
  what's due/scheduled/bucketed for the viewed day, then the week ahead.
- **Drill-in picker** — choosing a category by drilling level-by-level (with a
  breadcrumb), used in the form; the Settings **category manager** is where you
  build/rename/recolour/reorder the tree.
- **Email + password (sign-in)** — the login: your email and a password, with a
  "Forgot password?" reset by email. The old **magic link** (a login-link email) was
  the first method and has been retired from the app.
- **Calendar (rebuilt)** — the week sheet, rebuilt to match Today: a full-day grid
  with soft, title-only colour blocks. It opens on a **rolling week** (today is the
  first column, the next six days follow); the arrows then step standard
  **Monday–Sunday** weeks, and **"Back to this week"** returns to the rolling start.
- **Week / Month toggle** — switch the Calendar between the **Week** sheet and a
  **Month** zoom-out. Month is a "how loaded am I" view: each day shows its events +
  tasks, capped with a "+N more"; clicking anything **jumps to that week** (Month
  never opens an edit form).
- **The tray (unscheduled)** — a drawer on the right of the Calendar holding loose /
  not-yet-time-blocked tasks. Open it and the week squeezes to make room. You can
  **+ add** a loose task, tick one done, **drag a row onto the grid** to schedule it,
  or click a row to edit it. Drag a block **off** the grid and it drops back here.
- **All-day band** — the strip above the timed grid for **all-day** items; a
  multi-day item stretches across the days it covers. It grows with how many all-day
  items there are and disappears when there are none.
- **All-day item** — an event with no specific time (it sits in the all-day band,
  not on the hour grid). Toggle **All-day** in the form to make one; multi-day spans
  are all-day items across several days.
- **The shared form** — **one** create/edit form used everywhere (Today, Calendar,
  All Tasks). A task/event toggle on top while creating; once saved, the type is
  fixed. Same form, so the screens never drift.
