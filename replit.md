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
- 28 boards (15 active + 1 draft + 12 concept) shown as cards
- Status badges: Active (green), Draft (amber), Concept (blue/sky)
- Card meta: description, age levels, difficulty, time of year, availability, word count
- Click a card to filter the Words tab to that board's words
- Inline edit: name + description; status cycles via badge click or enable/disable button
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
- Restore any snapshot (replaces all word data, with confirmation)
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
- `bingo_words` table: id, word, spanish, emoji, regions[], surroundings[], dayNight[], age, findability, seasons[], boards[], notes, createdAt, updatedAt
- `bingo_boards` table: id, name, description, ageLevels[], difficulty, timeOfYear, availability, status, notes, wordCount, createdAt, updatedAt
- Seed: `lib/db/seed-excel.mjs` parses the Excel source file (`attached_assets/Bingo_word_database-4_...xlsx`)

### Array column note
Array columns (dayNight, regions, surroundings, seasons, boards) are NOT NULL with defaults.
Use `cardinality(col) = 0` (not `IS NULL`) to detect empty/unset values in queries.

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
