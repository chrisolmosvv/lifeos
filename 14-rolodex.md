# LifeOS — Rolodex (People Module)

> I am the Rolodex. A personal reference file on the people in your life:
> who they are, how you know them, when you last saw them, and who connects
> to whom. An info-dump and recall-first tool — NOT a reconnection engine.
> Contact frequency is a quiet "last contact" stat, not a nudge system.
> **Status: SHIPPED** (D1–D14, desktop + Hermes). Mobile deferred.

---

## Ground rules (same as every module)

- **Additive only.** The 8 People tables sit beside the spine. They do not
  touch categories / tasks / events. A stale pointer is "already gone."
- **Owner-only RLS** on every table, four policies each. Single user.
- **No FK into the spine.** `recurrence_id` on `people_dates` is a plain
  uuid pointing at a `recurrences` row — not a foreign key.
- **Two-track commits.** Schema (`db/43_people.sql`) shipped alone, checker-
  gated. All src shipped separately.
- **Files under ~250 lines.** Data writes split across `peopleWrite.js` +
  `peopleWriteDates.js`; detail loads across `peopleLoad.js` +
  `peopleLoadDetail.js`; hermes-write people kinds in their own `people.ts`.

---

## Data model (8 tables, `db/43`)

All additive, owner-RLS, intra-module FKs only. `archive_batches.source_type`
gained `'person'` (additive CHECK expansion on the existing spine table).

- **`people`** — the person record. `name` (required), `how_you_know`,
  `notes`, `phone`, `email`, `other_contact`, `source` CHECK (`'app'`,
  `'hermes'`), `archived_at` (soft-delete), `created_at`, `updated_at`.
- **`people_circles`** — owner-defined groupings. Start blank (no seeded
  circles). Custom `sort_order`. "Unfiled" is virtual (no row), always last.
- **`people_circle_members`** — person-to-circle. Many circles per person;
  at most one `is_home` (app-enforced). UNIQUE `(person_id, circle_id)`.
- **`people_connections`** — mutual person-to-person links. ONE row per pair
  (`person_a_id < person_b_id`, CHECK-enforced). Two label columns
  (`label_a_to_b`, `label_b_to_a`) for smart-inverse. `source` CHECK
  (`'app'`, `'hermes'`). UNIQUE `(person_a_id, person_b_id)`.
- **`people_groups`** — named cliques. No per-group page in V1.
- **`people_group_members`** — person-to-group. Groups render virtually
  (co-members surfaced by shared membership). UNIQUE `(person_id, group_id)`.
- **`people_interactions`** — the catch-up log. `channel` CHECK
  (`'in_person'`, `'call'`, `'video'`, `'message'`, `'letter'`, `'other'`).
  "Last contact" = `MAX(interaction_date)`, computed on read. `source` CHECK
  (`'app'`, `'hermes'`). Fully editable/deletable.
- **`people_dates`** — birthday (`kind='birthday'`) + custom labelled dates.
  At most one birthday per person (app-enforced). Year-optional
  (`year_known`; placeholder year 2000 when unknown). `show_on_calendar`,
  `recurrence_id` (plain uuid).

---

## Amendments (locked — differed from the original plan)

### Amendment 1 — store the RECURRENCE recipe id, not the event id
Birthday/date calendar events store the **recurrence recipe id**
(`recurrence_id`) on the `people_dates` row — NOT the generated event's id.
The recurrence engine can regenerate events with new ids; the recipe id is
stable. Events are found via `events.series_id = recurrence_id`.
**Why:** the engine's edit/split paths archive old occurrences and create new
ones with new ids; a stored event id would go stale.

### Amendment 2 — NO source tag on birthday events
Birthday events carry **no source tag** — the `events` table has no `source`
column, and adding one would be a spine change (forbidden). Birthday events
are identified through the `people_dates.recurrence_id` →
`events.series_id` chain, and live in a find-or-created **"Birthdays"**
category (plum colour). Plain events, no deep-link back to the person file.

---

## Desktop screens (shipped)

- **Directory + Focus panel** — split-pane front page. Left: people grouped
  by home circle (Unfiled last), live search, quick-add. Right: summary of
  the selected person (web, catch-ups, "Open full file").
- **Directory / Map toggle** — switches to the constellation map (quiet at
  rest; ties on hover only; circle chips; search highlights; click → file).
- **Person file** — two-column dossier with Edit toggle. Left: name, circle,
  how-you-know, notes, contact, key dates. Right: connections (web + list),
  groups, catch-up log, last contact. Archive on the top bar.
- **Circles manager** — create, rename, reorder, delete.
- **Key dates** — birthday (year-optional, age when year known) + custom
  dates. Birthday defaults show-on-calendar ON (yearly all-day recurring
  event via the recurrence engine). Custom dates have a calendar toggle
  (default OFF). Editing the date retires the old series and creates a new
  one; deleting or archiving retires it; restoring re-materialises it.
- **Archive** — soft-delete with restore. Archiving retires all calendar-
  shown date series; restoring re-materialises them.

---

## Hermes integration (D14, shipped)

- **Read snapshot** (`hermes-read`): a `people` section in the JSON. Per
  non-archived person: name, how_you_know, notes (truncated 500), home
  circle, birthday, connections (name + label), last contact, last 2
  catch-ups. Not windowed.
- **Write kinds** (`hermes-write`): `person` (create, confirmed), `note`
  (append, direct-log), `catchup` (log interaction, direct-log), `connect`
  (link, confirmed). All source='hermes', all undo-logged.
- **Tiered confirm-gate** (server-enforced): person + connect need
  `confirmed=true`; note + catchup direct-log on a matched person.
- **Name matching**: case-insensitive partial. One → proceed. Zero → "add
  them first." Multiple → disambiguation list.
- **Box skills**: `read-lifeos/SKILL.md` + `write-lifeos/SKILL.md` on the
  Hetzner box. NOT in the repo (backups as `.bak-20260710`; known gap).
- **Scope**: add + query only (no edit/delete via Hermes in V1).

---

## Locked decisions

- **Name:** "Rolodex" (over "People"/"Friends").
- **Circles start blank** — no seeded starters.
- **Map/"whole web" in V1** — quiet at rest (the mess-defeater).
- **"Last contact" = any channel** counts, computed on read.
- **Connection smart-inverse** — directional presets auto-fill both labels.
- **Archive-only removal** — no hard delete in V1.
- **Birthday events are plain** — no deep-link, no special brief.
- **Info-dump soul** — recall-first, not a reconnection engine. No nudges.

---

## Deferred

- **Mobile** — deferred to its own doc.
- **Hermes edit/delete** — V1 is add + query only.
- **Import** — manual entry only (no contact import).
- **Box skill version control** — lives on the Hetzner box, not in the repo.
- **Standalone group page** — not in V1.

---

## Build order (shipped, D1–D14)

| Piece | What | Track |
|---|---|---|
| D1 | Schema (`db/43_people.sql`) | DB, checker-gated |
| D2 | Nav mount + SplitPane kit component | SRC |
| D3 | Directory + Focus panel | SRC |
| D4 | Quick-add + person creation | SRC |
| D5 | Circles + groups management | SRC |
| D6 | Person file page (view + edit) | SRC |
| D7 | Archive + restore + toast | SRC |
| D8 | Circle membership on edit | SRC |
| D9 | Groups management screen | SRC |
| D10 | Connections + connection web SVG | SRC (2 commits) |
| D11 | Catch-up log + last-contact rollup | SRC |
| D12 | Key dates + birthday → calendar event | SRC (2 commits + gap fix) |
| D13 | Constellation map (whole-web view) | SRC |
| D14a | Hermes read — people in snapshot | Edge function |
| D14b | Hermes write — 4 people kinds | Edge function |
| D14c | Box skills — teach Hermes | Hetzner box |
