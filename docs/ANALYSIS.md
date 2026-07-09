# Road Trip Bingo — Codebase & UX Analysis

Scope: `artifacts/bingo-db` (React/Vite frontend), `artifacts/api-server` (Express 5), `lib/db` (Drizzle/Postgres), `lib/api-spec` + `lib/api-zod` + `lib/api-client-react` (OpenAPI/Orval codegen). Written 2026-07-08.

## 0. What this app actually is

This is a **content/database management app** for road-trip bingo assets — not a bingo game and not itself a board-*rendering* tool. Its job is to let you catalog, categorize, and create the raw material that boards are made from:

- **Tile words** — ~421 rows, each a word/phrase plus its icon (the `emoji` column), Spanish translation, and tag metadata (region, surroundings, day/night, age, findability, season).
- **Board ideas** — a catalog of 28 board *concepts* (name, description, difficulty, age levels, status) that groups of words get associated with.
- Categorization/organization tooling on top of both (filters, tag editing, AI-assisted tagging/suggestions, stats/analysis).

The iOS app is a separate consumer that would take curated content from here (a board concept + its associated words/icons) and do something with it on its own side. That boundary matters for how to read the rest of this doc: this tool's job stops at "well-organized, well-tagged content," not at simulating or previewing gameplay. Several of the UX observations below (§2.2 especially) are really about the Boards screen not fully supporting that curation job yet — not about it failing to feel like a game.

## 1. Architecture & build — what's solid

- **OpenAPI-first contract** (`lib/api-spec/openapi.yaml`) with Orval codegen into a typed Zod schema package and a typed React Query hook package. This is a genuinely good foundation — it's the same spec you'd point a Swift codegen tool at for iOS (see `docs/IOS_INTEGRATION_PLAN.md`).
- **Zod validation at the API boundary** on every route (request *and* response parsing) in [words.ts](artifacts/api-server/src/routes/words.ts) — response shapes can't silently drift from the spec.
- **AI autofill guardrails** in [ai.ts](artifacts/api-server/src/routes/ai.ts:163-274) are unusually careful for a solo project: allowlisted word IDs so the model can't touch rows it wasn't given, per-field enum validation, per-dropped-value logging. Worth preserving as a pattern when you add more AI features.
- Clean Drizzle schema, sensible use of Postgres array columns with the documented `cardinality(col) = 0` gotcha called out in `replit.md`.

## 2. UX walkthrough

### 2.1 Words tab
Matches your stated density preference well — compact rows, inline popovers for tag fields, sticky filter bar. This is the strongest screen in the app. No major complaints.

### 2.2 Boards tab — likely the source of "doesn't feel right"
[BoardsPanel.tsx](artifacts/bingo-db/src/components/BoardsPanel.tsx) is a card grid of board *metadata* — name, description, status badge, age-level chips, difficulty, word count. As a database-management screen for a "board idea" record, the fields are reasonable — but it never shows you the *content* underneath the concept: which words/icons are actually grouped into this board idea, at a glance. You have to click through to a differently-scoped Words tab to see that. For a tool whose whole job is curating and organizing content, that's a real gap: the Boards screen manages the container but never previews the contents.

Specific interaction problems on top of that:
- **Overloaded card surface.** A single card handles: click-to-filter-and-jump-to-Words, click-the-badge-to-cycle-status, hover-to-reveal edit/disable/delete icons, click-to-edit name/description inline. That's 5+ click targets doing different things on one surface ([BoardsPanel.tsx:379-563](artifacts/bingo-db/src/components/BoardsPanel.tsx:379)), all carefully `stopPropagation`-guarded — a sign the interaction model outgrew a single card.
- **Two overlapping status controls.** Clicking the status badge cycles `active → draft → concept → active`. A separate "ban" icon toggles only `concept ↔ active`, skipping `draft` entirely ([BoardsPanel.tsx:509-523](artifacts/bingo-db/src/components/BoardsPanel.tsx:509)). Two controls, two different mental models, same underlying field.
- **"Concept" boards are dimmed via `opacity-50 grayscale-[60%]`** with no label explaining it — discoverable only by hovering the badge tooltip ([BoardsPanel.tsx:389](artifacts/bingo-db/src/components/BoardsPanel.tsx:389)).
- **No "is this board idea well-curated" signal.** The card shows a raw word count but nothing about whether the words assigned to it are actually well-rounded — e.g. all tagged "Low findability," or missing age coverage. For a database whose value is the *quality* of its categorization, that's the metric this screen is missing.

See `docs/BOARDS_SCREEN_REDESIGN.md` for the concrete redesign.

### 2.3 Theme tab — you're right to be unsure about it
[ThemePanel.tsx](artifacts/bingo-db/src/components/ThemePanel.tsx) presents two "skins" — Basic (frozen, read-only) and Custom (HSL sliders) — as if choosing between multiple designed themes, but there is exactly **one** theme you can ever actually shape. The 2-card skin-selector pattern over-promises what's on offer.

- The **live preview is fake**: a tiny mockup of gray bars and colored pills ([ThemePanel.tsx:23-63](artifacts/bingo-db/src/components/ThemePanel.tsx:23)) plus a row of isolated shadcn buttons — neither shows real app chrome (the actual tab bar, table, badges) that the theme changes. You have to tab away to Words/Boards to see if a change looks right, which fights the "changes apply instantly" promise printed right below it ([ThemePanel.tsx:483](artifacts/bingo-db/src/components/ThemePanel.tsx:483)).
- **No named presets/save slots.** "My Theme" is one slot — you can't save "Ocean," try "Sunset," then compare. No export/import.
- **Background tint silently does nothing in dark mode** (by design — `applyTheme` only sets `--background` when `!darkMode`, [theme.ts:117-121](artifacts/bingo-db/src/lib/theme.ts:117)) but the UI never says so; a user in dark mode will drag those sliders and see zero effect.
- Given your stated preference for *density*, the highest-leverage single addition here isn't more color controls — it's a **density preset** (Compact/Cozy/Comfortable) driving row height, padding, and font-size together. Right now "Corner Radius" and "Row Divider" are the only density-adjacent controls, and they're raw numeric sliders with no semantic anchor.

### 2.4 Other tabs
Analysis, Definitions, Snapshots are straightforward and fine as-is; no notable UX complaints found.

## 3. Anti-patterns & code flaws

Ranked by actual risk, not by how easy they'd be to fix:

1. **Board↔word linkage by name string, not foreign key.** [`words.boards`](lib/db/src/schema/words.ts:14) is `text[]` storing board *names*. [`GET /boards`](artifacts/api-server/src/routes/boards.ts:52-59) computes word counts by string-matching `row.name` against every word's `boards` array. **Rename a board and every word that referenced the old name silently orphans** — no error, no cascade, the word count just quietly drops to 0. This is the single most important structural fix before this data goes anywhere external (iOS needs a stable ID to cache against, not a name that can change).
2. **Triple source of truth for the board list.** The same 16 board names are hardcoded three separate places that can drift independently:
   - the real `bingo_boards` table (source of truth, mutable via the UI)
   - [`constants.ts` `BOARDS`](artifacts/bingo-db/src/lib/constants.ts:7) (frontend tag/filter options)
   - [`ai.ts` `VALID_BOARDS`](artifacts/api-server/src/routes/ai.ts:21) (AI autofill's allowlist)
   
   Add a board through the UI today and it won't appear as a taggable option in the Words table or as a valid AI-autofill value until someone manually edits two more files.
3. **No auth on the API at all.** [`app.ts`](artifacts/api-server/src/app.ts:28) mounts `cors()` with no origin restriction and there's no auth middleware anywhere (`grep` for auth/token/bearer turns up only a log-redaction rule for a header nothing ever sends). Fine for a solo admin tool; a hard blocker the moment an iOS app or anyone else is meant to hit this over the network — see the integration plan for what "appropriate" auth looks like here.
4. **Zero automated verification.** No test files, no ESLint config (only Prettier), no `.github/workflows`. `replit.md` documents a careful validation discipline in the AI routes, but nothing enforces it stays that way over time.
5. **In-memory aggregation that won't scale.** `GET /boards` pulls the *entire* words table into Node to count boards in a loop ([boards.ts:52-59](artifacts/api-server/src/routes/boards.ts:52)) instead of a SQL `GROUP BY`. Harmless at 421 rows; becomes the wrong pattern to keep copying as this becomes an iOS-facing endpoint hit more frequently.
6. **Theme is local-storage only.** It doesn't sync across browsers/devices and has no bearing on iOS at all — worth being explicit with yourself that "Theme" here is scoped to *this admin tool's* look, not something that reaches players.
7. **No API versioning yet.** Routes are unversioned `/api/...`. Not urgent today; matters as soon as iOS ships against a snapshot of this contract on its own release cadence independent of this web app's deploys.
8. **No rate limiting on `/api/ai/*`**, which calls OpenAI per request. Not a problem while only you can reach it; becomes a cost/abuse question the moment the server is reachable by anything else.

## 4. What's already good and worth preserving

- The OpenAPI/Orval pipeline — don't replace it, extend it (add iOS-facing paths to the same `openapi.yaml`).
- The AI-response validation discipline in `ai.ts`.
- The Snapshots feature (`pg_dump`-based) — it's the natural seed for a "publish a frozen version to the app" concept (see integration plan).
- Words-tab density and inline-editing pattern — reuse this interaction language when redesigning Boards rather than inventing a new one.
