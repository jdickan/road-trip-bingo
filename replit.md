# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: Road Trip Bingo Word Database

A full-stack spreadsheet-style web editor for managing bingo word entries.

### Tabs & Features

#### Words tab
- 421 seeded words displayed in an inline-editable spreadsheet table
- Columns: Emoji, Word, Spanish, Region, Surroundings, Day/Night, Age, Findability, Season, Boards, Notes
- Inline editing: text inputs for scalar fields; popover multi-select/single-select for tag fields
- Color-coded tag badges per field type (findability, age, season, region, surroundings, board, dayNight)
- Filters: Search, Region, Surroundings, Age, Findability, Season, Board, Incomplete-only toggle
- Board filter pill shown in tab label when a board is active
- Sticky filter bar: scrolls with page; a fixed overlay replaces it once it leaves the viewport
- Quick-add row at the bottom of the table; delete button per row (hover-reveal)
- Pagination (server-side, 100 words per page)
- AI green dot indicators: cells recently updated by AI autofill show an emerald dot for 90 seconds
- **AI Autofill** (batch, up to 50 words): selectable fields, run repeatedly to fill all gaps
- **AI Word Suggestions**: suggest new words by theme; one-click add to database
- **Export JSON**: download filtered word list as JSON

#### Boards tab
- 28 boards shown in two views: Cards (default) or List (dense table), toggle in filter bar
- Coverage badge per board (computed server-side): "No words yet" / "Needs more words (n/25)" (amber) / "Unbalanced" (rose) / "Well covered" (emerald)
- Published toggle (Switch) per board, independent of lifecycle status; publishedAt = last publish time; "· published" indicator in card eyebrow
- Lifecycle status via 3-way segmented control: concept → draft → active
- Content preview: up to 8 deterministic sample word chips per card (seeded hash, stable across reloads); dashed placeholders when board has no words
- Whole card clickable → filters Words tab to that board's words
- Right rail per card: overflow menu (Rename/Delete), open arrow, segmented status, Published switch
- List view: table sorted by coverage severity (needs-words → unbalanced → well-covered, then word count asc) with columns Board/Status/Published/Words/Coverage/Difficulty
- Delete with confirmation; create new board inline
- Filter by status; search by name/description

#### Analysis tab
- KPI strip: Total, Complete, Incomplete, Day Only, Night Only, Day+Night, High/Med/Low Findability
- Completion arc (SVG ring showing % of words with age + findability filled)
- 4-column card grid:
  - Completion summary, Day/Night, Age Group, Findability
  - Seasons, US Regions, Surroundings (2-col), Boards (full-width 4-col)
- Each card shows color-coded horizontal bar charts scaled to the max value in that category
- Clicking the stats module (Total / Incomplete) in the header jumps to this tab

#### Definitions tab
- Reference glossary for all tag values and their meanings

#### Theme tab
- Light/dark mode toggle and accent color customization

#### Snapshots tab
- Save named point-in-time database copies (pg_dump stored in `data/snapshots/`)
- Dumps include both `bingo_words` and the `bingo_word_boards` junction, so restores preserve exact word↔board links even after board renames
- Restore any snapshot (replaces all word data, with confirmation); older snapshots without junction rows fall back to a name-based rebuild
- Delete snapshots; list shows label, date, word count, file size

### Header
- App icon + "Road Trip Bingo / Data Cockpit" branding (click to reset to Words tab with no filters)
- Stats module (Total / Incomplete counts) in top-right — clickable to navigate to Analysis tab
- Tab bar with icons: Words, Boards, Analysis, Definitions, Theme, Snapshots

### API Security & Validation
- All AI autofill responses are validated before writing: array type checks, per-element guards, ID allowlist, enum validation, per-element logging of dropped values
- AI suggest responses also guarded with array type check
- All routes use Zod schemas for request/response validation

### Database
- `bingo_words` table: id, word, spanish, emoji, regions[], surroundings[], dayNight[], age, findability, seasons[], boards[], notes, createdAt, updatedAt, deletedAt
- `bingo_boards` table: id, name, description, ageLevels[], difficulty, timeOfYear, availability, status, published, publishedAt, notes, wordCount, createdAt, updatedAt
- `bingo_word_boards` junction table (word_id, board_id, composite PK, FKs with cascade delete) — **source of truth** for word↔board membership; the `bingo_words.boards` name array is a denormalized read-model kept in sync on word writes
- Seed: `lib/db/seed-excel.mjs` parses the Excel source file (`attached_assets/Bingo_word_database-4_...xlsx`)

### Array column note
Array columns (dayNight, regions, surroundings, seasons, boards) are NOT NULL with defaults.
Use `cardinality(col) = 0` (not `IS NULL`) to detect empty/unset values in queries.

### Testing & CI
- API tests: Vitest + supertest in `artifacts/api-server/src/__tests__/` (41 tests: words CRUD/filters/junction, boards publish/coverage/preview, v1 public API/contentVersion bumps/API key guard, AI autofill bumps with mocked OpenAI)
- Tests run against a separate `bingo_test` database: set `TEST_DATABASE_URL` (same host as `DATABASE_URL`, pathname `/bingo_test`), then `pnpm --filter @workspace/api-server run test`
- CI: `.github/workflows/ci.yml` — postgres:16 service, pnpm 10 + Node 24, runs typecheck → drizzle push-force → tests on push/PR to main

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── bingo-db/           # React + Vite frontend (Road Trip Bingo Data Cockpit)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── seed-excel.mjs  # Excel seed script for words + boards
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### API Routes

#### Words
- `GET /api/words` — list words (filters: search, region, surroundings, age, findability, season, board, dayNight, incomplete; pagination: limit/offset)
- `POST /api/words` — create a word
- `GET /api/words/:id` — get a single word
- `PATCH /api/words/:id` — update a word (partial)
- `DELETE /api/words/:id` — delete a word
- `GET /api/words/stats` — aggregated stats: total, incomplete, byFindability, byAge, bySeason, byBoard, byRegion, bySurroundings, byDayNight
- `GET /api/words/export` — export filtered words as JSON

#### Boards
- `GET /api/boards` — list all boards
- `POST /api/boards` — create a board
- `GET /api/boards/:id` — get a single board
- `PATCH /api/boards/:id` — update a board (partial)
- `DELETE /api/boards/:id` — delete a board

#### AI
- `POST /api/ai/suggest` — AI word suggestions (theme, count)
- `POST /api/ai/autofill` — AI batch autofill for incomplete words (wordIds?, fields, 50-word cap)

#### Snapshots
- `GET /api/snapshots` — list snapshots
- `POST /api/snapshots` — create a snapshot
- `POST /api/snapshots/:id/restore` — restore a snapshot
- `DELETE /api/snapshots/:id` — delete a snapshot

#### Public v1 (read-only, for the iOS app)
- `GET /api/v1/boards` — published boards only (`?since=<version>` for delta sync; response includes global `latestVersion` cursor)
- `GET /api/v1/boards/:id/bundle` — self-contained bundle: board metadata + resolved word list (soft-deleted excluded, sorted by id) + `contentVersion` + `sha256:<hex>` checksum over the canonical word-list JSON
- Auth: exempt from the admin Bearer guard; gated by `X-API-Key` header matching `PUBLIC_API_KEY` (read at request time; unset → 503 in production, open in dev/test) + 60 req/min/IP rate limit
- Strictly GET-only — never add mutation routes under `/v1`

#### Content versioning (`contentVersion`)
- `bingo_boards.content_version` (int, default 0) is stamped from the global `bingo_content_version_seq` PG sequence via `artifacts/api-server/src/lib/content-version.ts`
- Bump events (published boards only): publish transition (false→true), bundle-visible board metadata edits (name/description/ageLevels/difficulty/timeOfYear), word content edits (all fields except `notes`, including AI autofill), board-membership changes (bumps old ∪ new boards), word soft-delete/restore/bulk ops, snapshot restore (bumps ALL published boards)
- No bump: editorial fields (board `notes`/`status`/`availability`, word `notes`), unpublish, purge of already-deleted words, edits touching only unpublished boards
- `publishedAt` is set on the false→true transition, cleared on unpublish, untouched by republish no-ops

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, use `pnpm --filter @workspace/db run push`, and fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec. Used by the frontend.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## GitHub Backup

The project is backed up to GitHub at:
  https://github.com/jdickan/road-trip-bingo

Remote name: `github-backup` (not `origin` — reserved for Replit platform remotes)

To push future updates, re-authenticate via the GitHub integration and run:
  `git push github-backup main`
