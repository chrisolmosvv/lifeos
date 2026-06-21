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
- **Token** — a chunk of text (roughly a few characters). AI usage and cost are
  measured in tokens.
- **Context window** — how much an AI can "hold in its head" at once. When it's
  full, the AI forgets earlier stuff. The reason for small files + brain docs.
- **Frontend** — the part you see and click (the app).
- **Backend** — the parts you don't see (database, agent code, scheduler).
- **Deploy** — to put the app online so you can open it from anywhere.
- **Vercel** — the free service that hosts (deploys) your app.
