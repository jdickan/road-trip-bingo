# Boards Screen Redesign

Companion to `docs/ANALYSIS.md` §2.2. This is the concrete redesign for the screen you said feels wrong — `artifacts/bingo-db/src/components/BoardsPanel.tsx`.

## Why it feels wrong today

It's a metadata form for the board *idea*, but it manages the container without ever previewing the content grouped inside it. You edit name/description/status/difficulty, but to know "what words are actually on this board" you have to leave the screen and go filter the Words tab. For a content-curation tool, that's backwards — the whole point of a board idea is the set of words/icons that belong to it, and that's the one thing you can't see here.

## Design direction

### 1. Add a content preview to each card
Show a compact sample of the words/icons actually grouped into this board idea — not a rendered "playable bingo card" (this app doesn't produce those), but a curation preview: a small grid or chip list of a handful of representative words + their icons from that board's associated content, so you can tell at a glance "yes, this is Halloween-themed and looks right" without switching tabs. This is the single highest-impact change — it turns "a list of settings" into "a catalog of the content you're organizing."

- Sample deterministically (e.g. seeded by board id) so the preview doesn't jitter on every re-render/refetch.
- If a board idea has few or no words assigned yet, show the preview area empty/sparse rather than hiding it — that sparseness is useful information (this board idea needs more content assigned to it).
- Clicking the preview could open a larger view of the full associated word list — a quicker path than switching to the Words tab and re-applying a board filter.

### 2. Add a curation-quality indicator, not just a word count
Replace the bare `{wordCount} words` chip with a small status line that answers "is this board idea's content well-organized":
- Coverage check across age/findability so a board idea isn't accidentally all "Low findability" or missing a whole age tier.
- A minimum-count heuristic if you want one, but frame it as "how much content exists for this idea," not as a go/no-go gate for anything downstream.
- Render as a single compact badge: `Well-covered`, `Needs more words`, or `Unbalanced (all Low findability)` — not a wall of stats.

### 3. Split "lifecycle status" from "published to app" — stop overloading one field
Today one `status` enum (`active`/`draft`/`concept`) is driven by two different controls that don't fully agree (badge cycles all three, the ban icon only toggles `active`↔`concept`). Replace with two independent, single-purpose controls:
- **Lifecycle status** (`concept → draft → active`): editorial state, shown as a simple dropdown or 3-way segmented control instead of a "click to cycle, remember the order" badge.
- **Published** (boolean, separate control): controls whether this board idea's content is included in the iOS-facing export at all (ties directly into `docs/IOS_INTEGRATION_PLAN.md` — the app should only ever see `published = true` boards, never `draft`/`concept`, and being `active` shouldn't auto-publish). This is purely a content-release gate — it's about which curated sets you're ready to hand off, not a judgment about whether the board is "playable."

This also directly fixes the "why is the board dimmed and what do I do about it" confusion — a labeled `Concept` pill communicates the same thing the grayscale filter tried to, without relying on a hover tooltip to explain it.

### 4. Simplify the click model
One card, one primary action: click anywhere on the card body → filter Words tab to this board (the current behavior for the non-edit case). Move edit/disable/delete out of hover-reveal icons stacked in the footer and into a single overflow (`⋯`) menu in the card's top-right corner, opened deliberately rather than discovered by hovering. Keep inline rename-in-place (it's a nice touch) but trigger it from the menu, not a separate hover icon competing for the same footer real estate as delete.

### 5. Give the grid a second view mode: List
Cards are fine for browsing ~28 boards, but once you're triaging "which board ideas need more words," a dense table (name, status, published, word count, coverage, difficulty) sorted by coverage would answer that question faster than scanning card grids — this mirrors the density you already like in the Words tab. Add a view toggle (Cards / List) rather than replacing one with the other.

## Concrete component changes

| Change | File |
|---|---|
| Board content preview (new component) | new `components/BoardContentPreview.tsx`, consumes the resolved word/icon list for a board |
| Coverage calc (client or server) | prefer server-computed, added to the `GET /boards` response so the frontend doesn't duplicate the "what counts as well-covered" rule |
| Split status/published fields | schema change in `lib/db/src/schema/boards.ts` (add `published: boolean`), route changes in `artifacts/api-server/src/routes/boards.ts` |
| Overflow menu instead of hover icons | `BoardsPanel.tsx` — swap the hover-reveal button row for a `DropdownMenu` (already in `components/ui/dropdown-menu.tsx`, unused today) |
| List view toggle | `BoardsPanel.tsx` — reuse `Table`/`TableRow` primitives already used in `WordTable.tsx` for visual consistency |

## Sequencing note

Steps 1 and 2 above depend on boards having a clean, ID-based resolved word list, which depends on fixing the name-based word↔board linkage flagged in `docs/ANALYSIS.md` §3.1. Do that schema fix first (it's `Phase 0` in `docs/IMPLEMENTATION_PLAN.md`) — building the content preview against the current name-matching logic means rebuilding it again right after.
