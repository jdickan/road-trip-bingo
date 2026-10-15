# Claude review fixes for draft PR #2

## Ownership and shared state

- Owner: Claude (Claude Code), on behalf of the repository owner. Branch:
  `claude/release-review-fixes`, stacked on `replit/controlled-content-releases`.
- Claim: issue #1. Boundaries: release history route/contract, v2 first-sync cursor
  behavior, stray attachment, macOS test notes. No schema, migration or deploy change.

## Changes

- `GET /api/release/boards/:id/history` returns `BoardReleaseSummary` (no payload,
  adds `wordCount`). Previously up to 50 full payloads (<= 2 MiB each) per call.
  The editor dialog now reads `wordCount`. Fetch a payload via the v2 release route.
- `GET /api/v2/boards?since=0` is publish-only like an omitted cursor; it no longer
  returns withdraw tombstones for boards a first-sync client never had.
- Removed committed `attached_assets/Pasted-...txt` (pasted chat transcript).
- `planning/quality.md`: documented running the suite on macOS and the editor locally.
- Word text validation: `POST /api/words` and `PATCH /api/words/:id` reject empty or
  whitespace-only `word` (OpenAPI `minLength: 1` + `pattern: \S`, regenerated zod).
  Previously blank words were accepted and later blocked release approval.
- `artifacts/bingo-db/vite.config.ts`: opt-in `API_PROXY_TARGET` forwards `/api` to a
  local API server; no effect when unset, so Replit behavior is unchanged.

## Checks (local, macOS, throwaway Postgres 16 database)

- `pnpm run typecheck` (includes lint) — passed.
- `pnpm --filter @workspace/api-spec run codegen` — passed; generated files committed.
- `pnpm --filter @workspace/api-server run test` — passed: 33 auth + 59 integration (4 new word-validation tests).
- Editor build and API build not re-run; changes are type-checked only.

## Remaining / deferred

- `ETag`/`Cache-Control` on immutable v2 bundle responses: belongs to OPS; not done.
- History response is a contract change for the editor only; no external v1/v2 client
  consumes it.
