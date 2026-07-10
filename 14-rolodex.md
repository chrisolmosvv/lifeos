# 14 · The Rolodex (People module)

> **Status:** spec locked, ready for build. Desktop + Hermes only — **mobile is deferred to its own doc** (desktop ships first, mobile is a fast-follow).
> **Working name → real name:** the section is called **Rolodex** in the nav.
> **Front-page direction:** "Directory + Focus" (mock #6) plus a "whole web" map toggle (the quieted constellation, mock #5).
> This doc supersedes the exploratory mocks — those were direction-finding; the decisions below are the source of truth.

---

## 1. What it is

A **personal reference file on the people in your life** — an "info dump" you open to recall what you know about someone, and navigate to fast. Its job is **recall**: *what do I actually know about this person, and who are they connected to.*

It is **not** a reconnection engine. Contact-frequency rides along as a quiet "last contact" stat — never a nag. There are **no proactive "you haven't spoken to X" nudges** in V1.

The soul in one line: *the people of your life, filed like the back pages of a paper — a name, what you know, who they're tied to.*

---

## 2. Design fit (non-negotiable)

Follows the house system exactly:

- Paper `#F6F5F1`, ink `#1C1916`, muted `#5C564C`, hairlines only. **No boxes, cards, fills, shadows, rounded corners.**
- **Circles are NOT colour-coded** — plain small-caps labels. They are a separate taxonomy from task/event categories; the People module never touches the spine.
- **Terracotta `#C8643D` appears exactly once per screen: the "+ Add" action.** Nowhere else.
- Fraunces for names/headlines; Inter for body/UI/labels; tabular numerals for the faint stats.
- Names read like a directory: name in Fraunces, a one-line descriptor in Inter, hairline rules and whitespace. **The "Rolodex" is the mental model, not the rendering — no literal cards.**
- Desktop zero-scroll where it falls out naturally; **calm wins** when they conflict.

---

## 3. Data model

All tables are **additive, owner-scoped (RLS), UUID PK, with `created_at` / `updated_at`**. They follow the Food/Marty precedent: **no foreign key into the spine (`categories`, `tasks`, `events`)** — any spine id is stored as a plain value. Intra-module FKs (person→circle etc.) are fine, as Food already does. Every write-bearing table carries a `source` column (`'app'` | `'hermes'`) for audit.

**The whole schema is a Checker-gated change** (requires the exact phrase **"checker approved"**), additive-only, spine untouched, on its own `supabase/db/` commit(s) separate from any `src/` commit.

### 3.1 `people` — the entry
- `name` (text, **required**) — display name. **A name-only entry is valid** (e.g. "his wife Sarah").
- `how_you_know` (text, null) — the descriptor line ("uni — housemate, 2019–22").
- `notes` (text, null) — freeform body, **plain text, no formatting**.
- `phone` (text, null), `email` (text, null), `other_contact` (text, null) — optional, shown *below* the notes. Phone/email render tappable (`tel:` / `mailto:`).
- `archived_at` (timestamptz, null) — **soft delete** (archive, restorable, like the rest of the app). No hard delete in V1.
- `source`.

### 3.2 `circles` — owner-defined groupings
- `name` (text).
- `sort_order` (int) — **custom order**, set in the manage screen.
- Circles **start fully blank** — no seeded starters. ⟳ *(overrides the "a few starters" from the early spec.)*
- **"Unfiled" is not a row** — it's the virtual bucket for people with no home circle, always rendered **last**.

### 3.3 `person_circles` — membership (many-to-many)
- `person_id` → people, `circle_id` → circles.
- `is_home` (bool) — a person may sit in **many circles**, with **at most one home** (the directory files them there; others are tags on their file). None = Unfiled.

### 3.4 `connections` — mutual person-to-person links
- `person_a_id`, `person_b_id` → people (stored canonically to dedupe; the link is **mutual**).
- `label_for_a` (text, null), `label_for_b` (text, null) — the word shown **on A's file describing B**, and **on B's file describing A**. Label is **optional** (unlabelled = just "connected").
  - **Symmetric** labels (partner, sibling, friend, colleague, custom free-text): both equal.
  - **Directional presets** carry a **smart inverse** — picking "parent" sets one side "parent", the other "child" automatically. The picker knows the inverse pairs.
- Labels come from a **fuller preset list + your own custom additions** ⟳. Proposed presets (confirm/trim): partner, spouse, ex, sibling, parent ⇄ child, grandparent ⇄ grandchild, aunt/uncle ⇄ niece/nephew, cousin, friend, colleague, housemate, mentor ⇄ mentee, neighbour, other.
- The connection **web on the file/panel shows direct links only** (no friends-of-friends).
- When a person is archived, their connections are hidden from the other person's file.

### 3.5 `groups` + `group_members` — named cliques
- `groups`: `name` (text). `group_members`: `group_id`, `person_id`.
- A group (e.g. "the uni crew") **links all its members together at once**. On a member's file, co-members show under the **group's name** (the group name acts as the label). Group membership does **not** create individual `connections` rows — co-members are rendered virtually.
- Groups **have no page of their own** in V1 — they show on member files and are **managed in the Circles & Groups screen**.

### 3.6 `interactions` — the catch-up log
- `person_id` → people.
- `occurred_at` (timestamptz) — **any date, backdatable**; optional precise time.
- `channel` (text) — proposed set (confirm/trim): `in_person` · `call` · `video` · `message` · `letter` · `other`.
- `note` (text, null).
- **One-tap default** logs "saw them today"; expandable to set channel + note + timing.
- Entries are **fully editable and deletable**.
- `source`.
- **"Last contact"** = the most recent `occurred_at` for a person, **computed on read**, **any channel counts**. Nothing stored derived.

### 3.7 `person_dates` — birthday + custom dated notes
- `person_id` → people.
- `kind` (text) — `'birthday'` | `'custom'`. Birthday is a single first-class row.
- `label` (text) — for custom dates ("wedding", "met").
- `month` (int), `day` (int), `year` (int, **null allowed**) — **year is optional** (day+month is enough). If the birthday's year is known, the **file shows their age**.
- `show_on_calendar` (bool) — **birthday defaults true**; any custom date can be marked to appear.
- `event_id` (uuid, null) — **plain-value reference** to the generated spine event, for lifecycle (see §5).

---

## 4. Desktop screens

### 4.1 Directory + Focus (the front page)
Two-pane split (a **new split-pane layout component** — one of the two build watch-outs from recon).

**Left — the directory (navigation):**
- Search field at top. **Search scans name + how-you-know + circle** (not the notes body).
- **"+ Add"** — the single terracotta mark.
- People grouped by **home circle** (custom circle order; **Unfiled last**). Within a circle, sorted **most-recent-contact first**.
- Each row: name (Fraunces) · a faint **"last contact"** marker.
- Click a name → **fills the focus panel** (does not navigate).

**Right — the focus panel (glance):**
- Name, how-you-know, home circle.
- **A short notes snippet** (first line or two).
- Connections: **the small bounded web + a labelled list beside it** (direct links only).
- **The last 2–3 catch-ups.**
- **"Open full file →"** → the person's file page.
- **Resting state (nothing selected):** a gentle empty invitation to search or pick someone.

### 4.2 The "whole web" map toggle ⟳ *(pulled into V1)*
A toggle on the front page flips Directory+Focus ↔ **the quieted constellation** (mock #5):
- At rest, **just names in their circles — no lines drawn** (never a hairball).
- **Hover/focus a person → only their ties light up.** Circle chips isolate one group.
- Tap a name → opens their file. Search available.
- The single terracotta mark is the focused person.

### 4.3 The person file page
A dedicated view. **Two columns:**
- **Left (the human stuff):** home circle as a **small-caps kicker above the name** · name (Fraunces) · how-you-know (italic subtitle) · other circles · the **plain-text notes body** · contact fields (phone/email/other) · key dates (birthday with age if year known; custom dates).
- **Right (ties & history):** the connection **web + labelled list** · groups · the **catch-up history** (reverse-chronological, add / edit / delete) · the rolled-up **"last contact"**.
- **Edit toggle:** view by default; an **Edit** toggle opens fields in place; **Save** when done.
- **Archive** removes a person (soft, restorable). On archive, their connections drop off others' files and their birthday/date events are suspended.

### 4.4 Add a person
**Two flows:**
- **Quick add** — "+ Add" → type just a **name** → done; flesh out on the file.
- **Add with details** — the fuller form.

### 4.5 Circles & Groups management screen
Dedicated screen (circles are managed **only** here; you assign existing circles when filing a person, from **both the file and this screen**):
- **Circles:** create · rename · **merge** · delete · **reorder** (sets the directory order). **Deleting a circle with people in it → moves them to Unfiled.**
- **Groups:** create · rename · add/remove members · delete.

### 4.6 First run
Empty directory with a **warm one-line invitation** to add your first person.

---

## 5. Calendar integration (dates → spine, without touching it)

Per the architecture doc, modules feed the calendar by **writing events tagged with a `source`**, never touching the spine's guts.

- A `person_dates` row with `show_on_calendar = true` generates a **yearly all-day recurring event** in `events` via the **existing recurrence engine**, tagged **`source='people'`**.
- Events land in a **"Birthdays" category** by default (the module ensures it exists; Inbox is the fallback — confirm).
- The generated event's id is stored on the `person_dates` row (`event_id`, plain value) for **lifecycle**: editing the date updates the event; clearing `show_on_calendar`, deleting the date, or archiving the person **removes/suspends** the event. A stale pointer is simply "already gone."
- Birthday events are **plain calendar events — no deep-link back to the file** ⟳ *(chosen over a tap-through).*
- **No special morning-brief treatment** — as normal all-day events they already appear in the day's schedule.

> **Recon/Checker to confirm:** whether `'people'` is already an allowed value on the `events` (and `tasks`) `source` CHECK, or whether the CHECK needs an **additive** extension. If so, that extension is part of the Checker-gated schema step.

---

## 6. Input via Hermes

"Input via Marty" = **extend Hermes** (the self-hosted agent). Three pieces:

### 6.1 `hermes-read` — snapshot
Add a **`people`** section to the full-life snapshot so Hermes can answer **"what do I know about X"**: per person — name, how-you-know, home circle, notes, key dates, a connections summary, and last-contact. Respect the existing caps.

### 6.2 `hermes-write` — new domain
Add people write kinds to the typed `{ kind, data, confirmed }` door: **create person · append note · log catch-up · link people**. Semantics:
- **Tiered confirm** (server-enforced, matching the health/estimate pattern): **new person and new connection require `confirmed = true`** (Hermes proposes → you say yes); **appending a note or logging a catch-up on an already-matched person direct-logs.**
- **Name matching:** resolve to an **existing person**; ask only when genuinely **ambiguous** (two Toms). Don't spawn duplicates.
- **Undo** via `marty_actions` (`{table, id}`) — mistakes reverse for free.
- Rows tagged **`source='hermes'`**.
- **Scope V1 = add + query only.** Editing/removing people things is done **in-app** (or via undo); Hermes does not edit/delete in V1.

### 6.3 The box skill
Teach the people domain in `write-lifeos` / `read-lifeos` `SKILL.md` on the box.

### 6.4 Privacy note
Your **catch-up notes and what-you-know-about-people flow to the Hermes brain** with the rest of your life data — consistent with the full-life-synthesis choice already made. These are notes about **other people**; the owner has accepted this. (Reversible: people-notes could be held back from the brain, at the cost of "what do I know about X.")

---

## 7. Touch points & new pieces

**Reused (proven by Food — four nav touch points):**
- Nav entry + terracotta active-underline, the state-based `LoggedIn` view switch, the view component mount. **"Rolodex" sits last in the nav, after Food.**
- Kit primitives: search input, list rows, small-caps labels, hairlines, folio, empty-state, toast, the Edit-form pattern.
- Supabase read/write + RLS pattern; the recurrence engine; the Hermes read/write doors + `marty_actions` undo.

**New:**
- The **split-pane layout component** (Directory + Focus) — watch-out #1.
- The **quieted-constellation map** view.
- The **`people` Hermes domain** (read snapshot + write kinds + box skill).
- The full **people schema** (§3).
- *(Mobile tab-bar entry — watch-out #2 — deferred to the mobile doc.)*

---

## 8. Build sequence (risk-ordered)

Small verified pieces, one at a time. **Two-track commits** (`src/` and `supabase/db/` never share a commit). **Schema is Checker-gated.** "Deployed is not done" — verify each step by **database row**, not screen.

1. **Schema** — all people tables (§3) + any additive `source='people'` CHECK extension. **Checker-gated**, its own `db/` commit(s). Reload PostgREST after `ALTER`/create.
2. **Nav wiring** — the four touch points; a stub Rolodex view.
3. **Split-pane layout component** (kit).
4. **Directory + Focus** — directory list, focus panel, "+ Add", search, empty/first-run state.
5. **Person file page** — two-column view mode.
6. **Add person** (quick + details) & the **Edit toggle**.
7. **Circles & Groups management screen.**
8. **Connections UI** — add/remove links, preset + custom labels, smart inverse; groups on files.
9. **Catch-up log** — log, edit/delete, backdate, last-contact rollup.
10. **Dates + calendar generation** — birthday/custom dates → yearly all-day events; lifecycle. *(Any schema/category work here is Checker-gated.)*
11. **Map "whole web" toggle** — the quieted constellation.
12. **Hermes** — read snapshot + write people kinds + box skill.

Then: **mobile** (separate doc) as the fast-follow.

---

## 9. V1 scope vs later

**In V1 (desktop):** the person record; circles + Unfiled; connections (mutual, optional preset/custom label, smart inverse) + groups; the catch-up log with "last contact"; birthday + custom dates with calendar events; Directory + Focus **and** the map toggle; the file page with Edit; Circles & Groups management; archive; Hermes add + query.

**Deferred:** **mobile** (own doc); **import** (manual only in V1); a standalone **group page**; **Hermes edits/deletes**; in-app Hermes parity; any reconnection nudges (not planned).

---

## 10. Decisions & overrides log

- ⟳ **Circles start blank** — no seeded starters (overrides "a few starters").
- ⟳ **Map/"whole web" view is in V1** — was headed for "later toggle."
- ⟳ **Birthday calendar events are plain** — no deep-link back to the file.
- ⟳ **Connections: fuller preset list + custom additions** — expanded from "preset only".
- **Name kept as "Rolodex"** (over "People"/"Friends").
- **"Last contact"** (any channel), not "last seen."
- **Contact = phone · email · free "other" line** (not platform-tagged).
- **Notes = plain text**, no formatting.
- **Focus panel:** short notes snippet · last 2–3 catch-ups · web + labelled list.
- **File page:** two columns; home circle as a kicker above the name.
- **Editing:** Edit toggle (not live-autosave, not a separate form).
- **Removal:** archive only (soft), no hard delete in V1.
- **Directional soul (info dump, not reconnection)** confirmed by the owner, overriding the design doc's "Social pages" nudge framing.

## 11. Open items to confirm before/at build

- The exact **preset connection-label set** (§3.4) and the **channel set** (§3.6).
- **"Birthdays" category** vs Inbox for generated events.
- Whether **`source='people'`** needs an additive CHECK extension on the spine (recon/Checker).
- Behaviour of connections/date-events **on archive** (assumed: connections hidden from others' files; date events suspended).
