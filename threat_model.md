# Threat Model

## Project Overview

Road Trip Bingo Data Cockpit is a full-stack editorial application for managing bingo words, boards, todos, AI-assisted metadata generation, and database snapshots. The production stack is a React/Vite frontend in `artifacts/bingo-db`, an Express 5 API in `artifacts/api-server`, PostgreSQL via Drizzle in `lib/db`, and an OpenAI-backed server integration in `lib/integrations-openai-ai-server`.

The application is an editor/data-cockpit rather than a public read-only content site. Production analysis should therefore treat data mutation, backup/restore, and AI-triggering routes as privileged operations even if the current code does not implement authentication.

Assumptions for future scans:
- `artifacts/mockup-sandbox` is dev-only and out of scope unless production reachability is demonstrated.
- Replit-managed TLS protects traffic in production.
- `NODE_ENV` is `production` in deployed environments.

## Assets

- **Editorial dataset** — bingo words, tags, notes, deleted-word state, boards, and todos stored in PostgreSQL. Unauthorized changes directly damage application integrity and business value.
- **Database backup artifacts** — SQL snapshots under `artifacts/api-server/data/snapshots`. These provide bulk access to application data and can be used to roll the database backward or overwrite current state.
- **Application secrets** — `DATABASE_URL` and the OpenAI API credential used by `@workspace/integrations-openai-ai-server`. Exposure or abuse of these credentials can lead to data compromise or billing impact.
- **Service availability and cost budget** — snapshot creation/restoration and OpenAI-backed routes can consume compute, storage, and paid API credits.

## Trust Boundaries

- **Browser to API** — all frontend actions cross from an untrusted client to the Express API. Every route must assume the caller is untrusted.
- **API to PostgreSQL** — the API can read, mutate, truncate, and restore database state. Bugs at this boundary can disclose or destroy the entire dataset.
- **API to OpenAI** — `/api/ai/*` routes spend server-held API credentials on behalf of callers. This boundary requires abuse controls and least privilege.
- **API to local filesystem / subprocesses** — snapshot routes create and read SQL dumps on disk and execute `pg_dump`/`psql`, making them higher-risk than ordinary CRUD endpoints.
- **Public internet to privileged editor features** — snapshot management, word/board/todo mutation, and AI-triggering endpoints are privileged editor actions and should not be anonymously reachable.

## Scan Anchors

- Production backend entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*`
- Highest-risk code areas: `artifacts/api-server/src/routes/snapshots.ts`, `artifacts/api-server/src/routes/ai.ts`, mutable CRUD routes in `words.ts`, `boards.ts`, and `todos.ts`
- Public/authenticated/admin surfaces: no authentication boundary currently exists in the API; treat all privileged routes as needing one
- Dev-only areas usually ignored: `artifacts/mockup-sandbox/**`, build artifacts under `dist/**`

## Threat Categories

### Spoofing

This project currently has no user authentication or session-verification layer in the production API. The required guarantee is that privileged editor operations MUST require a verified server-side identity before any read/write action that changes data, triggers paid AI usage, or exposes backups.

### Tampering

Attackers should not be able to create, edit, soft-delete, purge, restore, or bulk-rewrite editorial records without authorization. The required guarantee is that all mutation routes MUST enforce server-side authorization independently of the frontend and MUST treat the client as fully untrusted.

### Information Disclosure

The dataset, deleted-word state, todo notes, and downloadable SQL snapshots can reveal business data in bulk. The required guarantee is that backup/list/export endpoints MUST only be available to authorized users and that logs and error responses MUST not expose secrets or internal details.

### Denial of Service

Snapshot creation/restoration and OpenAI-backed routes can consume substantial CPU, disk, database, and paid API quota. The required guarantee is that expensive endpoints MUST have strong access control and abuse controls such as authentication, rate limits, bounded inputs, and operational safeguards.

### Elevation of Privilege

Because the codebase is an editor/admin tool, anonymous callers must never inherit editor powers by default. The required guarantee is that privileged routes MUST be separated from public surfaces and protected by explicit authorization checks before any destructive database or filesystem action is performed.
