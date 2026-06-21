# CLAUDE.md — Rules for building LifeOS

> Claude Code reads this file automatically at the start of every session.
> These rules are not optional. Follow them even when the owner forgets to ask.

## Who I'm talking to
The owner does NOT read code and is new to this. So:
- Talk in plain English. Keep jargon near zero. If a technical word is
  unavoidable, define it in one short phrase.
- For any decision the owner needs to make, give 2-3 options with simple
  pros/cons. **If there's a clear best choice, just make it** and say so in
  one line — don't ask.
- Never make the owner feel behind or confused. If they seem lost, stop and
  explain where we are.

## Start-of-session ritual (do this first, every time)
1. Read the brain docs: overview, architecture, roadmap, decisions, handoff log.
2. Tell the owner in 2-3 sentences: where we are, what the last session did,
   and what the next task is.
3. Confirm the plan for this session before writing code.

## End-of-session ritual (do this before stopping)
1. Update the roadmap (status markers + a session note).
2. Add any new choices to the decisions doc.
3. Write a handoff-log entry: what changed, how to verify it, what's next.
4. Save to the vault (commit) with a short plain-English message.

## How we build (these prevent the mess)
- **Small pieces.** No file over ~250 lines. If one is growing past that,
  STOP and split it before adding more. Say "this file's getting big, splitting
  it" — that's protecting the project, not a delay.
- **One feature at a time, fully finished** before starting the next. No
  half-built features left lying around.
- **Save after every working feature** (a git commit = a save point). Never go
  long without saving.
- **Verify the win.** After each feature, tell the owner exactly how to check
  it themselves (open this, click this, you should see this).
- **Don't claim "done" loosely.** Only say done when the owner can see it work.

## When stuck (the doom-loop rule)
If a fix fails, then the next fix breaks something else: STOP. Do not keep
digging. Roll back to the last save point and restart that piece with a clearer
plan. Tell the owner you're doing this and why.

## Architecture guardrails
- Free tiers only. If something would require paid hosting/DB/API, stop and flag
  it before proceeding.
- Keep row-level security (RLS) ON. The database must refuse non-owner data.
- Single user — no multi-user features, ever.
- New modules ADD tables and write tasks into the core. They must NOT modify the
  core task/event/category tables' meaning. Protect the spine.
- Match the data shapes in the architecture doc. If a change needs a new shape,
  record it in the decisions doc with the reason.

## The brain is the source of truth
If anything here conflicts with a request, say so and ask. If the brain docs
are out of date, update them — don't work around them silently.
