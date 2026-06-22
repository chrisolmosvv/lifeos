# LifeOS — Design (Look & Feel)

> I am the "what it should feel like." Claude Code reads me before touching any
> screen. But I describe a **mood, not a blueprint** — I set the vibe, the
> colours, the type, the spacing and the spirit. I do **not** hand out finished
> layouts. For the actual shape of a screen, see the rule directly below.

---

## The one rule that matters most (Claude Code, read this twice)

**Absorb the vibe here, then talk to the owner before you build.**

I am not a spec you execute on your own. When it's time to design or change any
screen, Claude Code must:

1. Read this whole doc and soak up the feeling.
2. Then **come back to the owner** with a short, plain-English proposal — and
   **ask** before committing to:
   - **Layout** — where things sit, what's the lead, what's secondary.
   - **Styles** — type sizes, weights, how much colour, how much air.
   - **Details** — the little choices (a rule here, a small-caps label there).
3. Offer 2–3 concrete options with simple pros/cons when there's a real choice.
   If something is obvious, just suggest it and say why — but still show the
   owner before it's locked.

The owner is the art director. I'm the brief; Claude Code is the studio. Nothing
about a screen's look gets finalised without the owner seeing it first. When in
doubt, **show, don't assume.**

---

## The identity: a personal broadsheet

LifeOS is the **newspaper of one life** — calm, typographic, confident. It reads
like a beautifully set front page, not an app full of buttons and cards.

- **Steal the authority of** a classic newspaper front page: serif headlines,
  hairline rules, clear hierarchy, the quiet confidence of ink on paper.
- **Steal the data sense of** The Athletic and FiveThirtyEight: numbers that
  tell a story, charts that lead with the point, tables that mean something.
- **The warm twist:** a touch more space and a touch more warmth than a real
  newspaper. Modern, not stuffy. A broadsheet that likes you.
- **Never become:** a cable-news front page, a Temu storefront, a noisy
  dashboard. Loud, cluttered, fighting-for-attention is the enemy. **The whole
  product has one job: never shout.**

The feeling to chase: opening a well-made paper with your morning coffee. Quiet,
ordered, a little bit special. You feel *on top of things*, not buried by them.

---

## Mood & spirit

- **Calm is the product.** If a screen feels busy or anxious, the fix is almost
  always to *remove* something, not add. Restraint reads as quality.
- **Composed, like a sheet.** Each screen should feel like a single, finished
  page you can take in at a glance — settled and complete — rather than an
  endless scrolling feed. (How strict "one sheet" is on a given screen, and on
  the phone, is a per-screen conversation with the owner — not a hard law.)
- **Two registers, one paper.** Some pages are quiet and word-led (Today,
  Calendar, Social); some are richer and number-led (Gym, Nutrition, Finance).
  They share the exact same paper, ink and type — a data page is just the
  *sports or money section* of the same newspaper, never a different app. The
  owner will help decide, page by page, how far the data pages lean into charts
  versus staying spare.
- **Authority through type, not decoration.** Hierarchy comes from serif
  headlines, hairline rules and white space — not from boxes, shadows, badges or
  colour blocks.

---

## Colour

Colour is used **sparingly and on purpose**. Mostly it's ink on warm paper; a
little colour earns its place.

- **Paper** — a warm off-white, like good newsprint or uncoated stock. Working
  value `#F4EFE4`. The background is never stark white.
- **Ink** — a soft near-black, easy on the eye. Working value `#1C1916`. Plus a
  muted grey for secondary text and labels (around `#5C564C`).
- **Rules** — hairline divides, drawn in ink at full or low strength. These are
  the main way we separate things. No heavy borders, no rounded boxes.
- **The accent** — a **warm broadsheet red / vermilion** (working `#B23A2E`).
  Used rarely, for things that genuinely matter: today, what's urgent or
  overdue, the live "now" line, a record or a key number, the add action. When
  in doubt, *don't* use the accent. (Not finally locked — see open questions.
  We can warm it toward terracotta if the owner prefers.)
- **Category colours** — a small, **muted, editorial** set, like magazine
  section colours, never neon. Working set: Uni teal `#3B6B6B`, Health sage
  `#6E8B5A`, Social plum `#9A6A7B`, Admin ochre `#A87B3A`, Inbox slate
  `#6B7280`, plus warm tones for food and a muted green for money as those pages
  arrive. On calendars and lists they show as a small **dot + a short uppercase
  tag** — calm, not big blocks of colour. A category's colour can be used more
  fully on that category's own page.
- **Light is home; dark is the evening edition.** Light mode (paper + ink) is
  the default and the priority. A dark mode — soft charcoal, never true black,
  off-white text, the accent brightened just enough to still glow — is a
  direction to tune later, with the owner, once light mode feels right.

Exact tones are starting points, not gospel. We tune them against real screens,
together.

---

## Type — this is the soul

The personality of LifeOS lives almost entirely in its lettering. Type does the
work that colour and boxes do in other apps.

- **The nameplate / masthead** — a **blackletter** wordmark ("LifeOS"), the way
  a classic paper sets its name. Distinctive, characterful, used once at the
  top. (Working face: UnifrakturCook. If it ever reads as costume rather than
  craft, we revisit — owner's call.)
- **Headlines & titles** — a **high-contrast serif** with character (working:
  Playfair Display). Confident, editorial, the thing your eye lands on first.
- **Body, labels & data** — a **readable book serif** (working: Libre Caslon
  Text) for everything you actually read, and for the numbers too. Small caps
  for quiet labels (categories, kickers, datelines); italics for asides and
  captions.
- **Numbers are set in serif and worn with confidence.** On the data pages, big
  serif numerals carry the story — like a printed results table or a racing
  form. (If a very dense table ever genuinely needs it for legibility, we can
  discuss a clean tabular companion face — but the default soul is serif.)
- **Restraint in weight.** Lean on the serif/sans-serif character and on size
  for hierarchy, not on lots of heavy bold. Two or three weights is plenty.

Hairline rules, small caps, italics, drop caps and a confident masthead are our
"furniture." They make it feel printed and considered.

---

## Spacing & texture

- **Generous, but never empty for its own sake.** White space is breathing room
  and a sign of calm — but a near-blank page that should carry content reads as
  unfinished. Aim for *settled*, not sparse, not crammed.
- **Hairline rules over boxes.** We organise with thin rules and columns, the
  way a newspaper does. Avoid cards, drop shadows, big fills and rounded
  corners — they fight the paper feel.
- **Ink-on-paper texture.** Flat, matte, printed. No glassy gradients, no
  glossy buttons. If it couldn't plausibly be printed, be suspicious of it.
- **Alignment is everything.** Things line up. Columns share baselines. Tidy
  alignment is most of what makes restraint look expensive.

---

## Motion

**Premium editorial** — smooth, eased and intentional, never playful or bouncy.

- Page changes glide; content fades or settles in; charts draw themselves in
  quietly.
- Moments worth making feel special: opening the app, turning from one view to
  the next (a refined "page-turn" feeling), completing something (a quiet,
  satisfying mark — never confetti), the morning brief arriving.
- Motion must always serve the calm. If an animation draws attention to itself,
  it's wrong. Impressive here means *elegant*, not busy.

---

## The pages — the feeling each one is after

These describe **mood and intent only**. The actual layout of each is a
conversation with the owner (see the rule at the top).

- **Today** — the home page, and the calmest. The feeling: *here is your day,
  already in order.* Today's hours and today's handful of tasks and
  appointments, read at a glance. Warm, unhurried, almost reassuring. This is
  where the product's promise — nothing forgotten, nothing shouting — should be
  felt most.

- **Calendar** — the week and the day as **proper calendar sheets**, in the
  spirit of Apple Calendar but rendered in newsprint. The feeling: a real,
  full **24-hour sheet** you can actually live in — events and time-blocked
  **tasks sitting together on the same timeline**, not two separate lists. A
  day view that shows the whole day top to bottom; a week view that reads like a
  clean set of columns. Calm and legible first, dense only where the day really
  is dense. (How the 24-hour sheet handles quiet hours, overlaps and the
  phone — all to be worked out with the owner.)

- **Gym** — the **form guide**. The feeling: a sports section about one athlete.
  Lead with the story ("a personal best — twelve straight days"), back it with
  honest numbers, a chart, a streak. Proud but not hype-y. A good columnist
  reporting on your training, not a cheerleader.

- **Nutrition** — the **daily intake report**. The feeling: a calm, factual
  account of what the body was fed and how it sits against your targets. Today's
  numbers, the week's shape, where the calories came from. Informative and
  matter-of-fact, never preachy or alarmist.

- **Social** — the **people pages**. The feeling: a warm, gentle ledger of the
  people who matter and a soft nudge toward the ones you've not spoken to in a
  while ("it's been nine days since you spoke with Mum"). This is the
  anti-staleness engine wearing a kinder hat — caring, never nagging.

- **Finance** — the **ledger / money section**. The feeling: a clear-eyed,
  unstressful read on where the money is. Balance, budget, the month's shape,
  recent movements, what's coming. Honest and steadying — the calm a good
  accountant gives you, not anxiety.

---

## Voice & words

The writing is part of the design. **Warm but restrained — a good columnist, not
a cheerleader.** Plain verbs, sentence case, no filler, no hype. Labels say what
the person controls, in their words. Empty states are an invitation, not an
apology. The little "edition" touches — the dateline, a quiet motto, a colophon
at the foot — give it the feel of a real paper. The same voice carries into the
**morning brief** (the 7am "edition"), which is the product's whole point: it
should read like a short, warm recap of the day ahead.

---

## Settled so far (working direction, tune on screen)

*Recorded as we build, so nothing drifts. Still the owner's to tweak.*

- **Type direction (Phase 2, Piece 1):** the masthead + headlines are set in
  **Fraunces** (a warm high-contrast serif), and all body, UI and numbers in
  **Inter**, two weights each (regular + medium). This supersedes the earlier
  *working* faces above (UnifrakturCook / Playfair / Libre Caslon), which were
  listed as open. Numbers use Inter's tabular figures so they line up. To be
  confirmed once the owner sees it on screen.
- **Accent (Phase 2, Piece 1):** warmed from broadsheet red to a **terracotta
  `#C8643D`**. Used for today, the now-line, key marks. Being validated by eye.
- **Theme variables:** all colours/fonts live in `src/theme.css` (see decisions
  doc for the exact starting hexes).

## Open questions — decide these *with* the owner

Be honest about what isn't settled. None of these get answered by Claude Code
alone:

- **The exact accent** — broadsheet red vs a warmer terracotta. Not locked.
- **Dark mode tones** — the whole "evening edition" palette, to tune later.
- **The category palette** — the muted set works on paper; validate it by eye in
  both light and dark before committing, and decide how many colours we really
  need.
- **The blackletter nameplate** — keep it, or choose a quieter high-contrast
  serif wordmark, if it ever feels like costume.
- **How "one sheet" we stay** — per screen, and especially on the phone, where
  some scrolling may be unavoidable.
- **Serif vs a tabular companion for dense data** — only if legibility ever
  demands it.

---

## How this doc is used

Claude Code reads me before designing or changing any screen. I give the
**mood**: the paper, the ink, the type, the spacing, the spirit of restraint. I
do **not** give finished layouts or pixel rules.

For the real shape of a screen — layout, styles, details — Claude Code proposes
and the **owner decides**, every time (see the rule at the top). If we settle a
new design choice together, write it down here with the reason, so nothing
drifts. When something here conflicts with a request, say so and ask. The vibe
is fixed; the layouts are a conversation.
