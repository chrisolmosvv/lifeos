# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

- **Supabase env vars must be set in Vercel by hand (twice).** The app reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables.
  Locally these live in a `.env` file that is gitignored, so it never reaches
  GitHub — and Vercel builds from GitHub. Why: keeping secrets out of GitHub is
  correct, but it means Vercel has no copy of them unless we add them in the
  Vercel dashboard (Settings → Environment Variables) ourselves. Without them the
  live site builds but renders blank. Trade-off: a manual step we must remember
  whenever the keys change or a new deploy target is added; Vercel bakes these in
  at BUILD time, so changing them requires a redeploy to take effect. (The anon
  key is safe to expose publicly — RLS is what protects the data, not the key.)

- **Plain CSS + inline styles for now, not Tailwind (yet).** Why: the app was
  built with simple inline styles from the start; Tailwind (named in the
  architecture doc as the intended styling tool) was never actually installed.
  Rather than bolt on a new tool mid-build, the calendar uses one small CSS file
  (`src/calendar.css`) for the grid and the desktop/phone switch. Trade-off: not
  yet on Tailwind as the architecture doc envisions — we can adopt it later if
  styling grows complex; revisit before the styling gets large.

- **GitHub repo is public.** Why: checker chats (Claude.ai) can read any file
  directly via its raw GitHub URL, with no login or file-upload needed. This
  keeps the review workflow smooth. Trade-off: source code is visible to anyone
  on the internet — acceptable because there are no secrets in the repo and this
  is a personal project with no proprietary logic yet.

- **npm global prefix set to ~/.npm-global.** Why: macOS system-owned directories
  block npm global installs by default, causing permission errors. A user-owned
  prefix (`~/.npm-global`) sidesteps this without using `sudo`. Trade-off: one-time
  setup step needed on any new machine.

- **Telegram, not iMessage.** Why: iMessage has no official way for an app to
  send/receive; the workarounds need the Mac on 24/7 and break constantly,
  killing "free + works when laptop closed." Telegram is free, official,
  cloud-based, two-way, supports voice notes. Trade-off: not in the native
  Messages app.

- **Notifications via Telegram, not PWA push.** Why: iPhone PWA push is flaky.
  Letting Telegram handle all nudges sidesteps it. Trade-off: none meaningful.

- **One responsive codebase, two layouts.** Desktop = full dashboard, phone =
  quick glance + fast input. Why: simplest path to both. Trade-off: none.

- **Gemini free tier for the agent (Flash).** Why: genuinely free, no card,
  plenty for one user. Trade-off: Google may train on inputs, and there's no
  uptime guarantee. **Plan:** start free; switch sensitive modules (mood,
  health) to pay-as-you-go (~$1-4/mo, no training) when we build them.

- **Consumer subscriptions can't power the in-app agent.** Why: Claude/ChatGPT/
  Gemini subscriptions are for the chat apps, not callable by code. The API is
  separate. (The Max plan DOES power Claude Code for *building*, though.)

- **Supabase + RLS for the database.** Why: free tier, built-in login and
  security, runs the agent code and the scheduler all in one place. Trade-off:
  free project can pause after long inactivity (fine for daily use).

- **Single user, no multi-user features.** Why: it's just the owner; skipping
  accounts/roles/sharing removes huge complexity. Trade-off: a friend can't use
  it later without real work.

- **Standalone calendar in V1, Apple sync as a later dream.** Why: standalone is
  far faster to build. We add a hidden external_id field now so future sync is
  "connect the pipes," not a rebuild. Trade-off: V1 calendar is separate from
  Apple Calendar until sync is built.

- **V1 = tasks + events only.** Why: keep the first usable version small so the
  owner engages fast. Other types (meals, friend notes) wait for their modules.
  Trade-off: can't capture a meal/note in V1.

- **Tasks live on the same calendar as events.** Tasks with a due date or a
  scheduled time block show up on the week view; tasks can be dragged onto slots.

- **Claude Code as the build tool (on Max).** Why: it keeps the whole project in
  view, the direct fix for past "AI loses the plot / messy codebase" failures.

- **All guardrails on (CLAUDE.md).** Brain docs, file-size ceiling, one feature
  at a time, commit after each feature, start/end session ritual.
