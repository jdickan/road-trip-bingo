# Approved-content release and collaboration foundation

## Ownership and integration

- Owner: Replit Agent. Repository: `jdickan/road-trip-bingo`.
- Working branch: `replit/controlled-content-releases`.
- Shared claim: GitHub issue #1. The implementation is now shared in draft
  [PR #2](https://github.com/jdickan/road-trip-bingo/pull/2), so Claude can fetch
  this handoff from GitHub. The original six commits retain their local hashes.
- No merge or production deployment was performed. Development schema changes were
  applied to `heliumdb`; equivalent additive test schema changes were applied only
  to the separately verified `bingo_test` database. Production schema changes must
  go through Replit Publish.

## What changed

- Added the shared `AGENTS.md` / `CLAUDE.md` instructions and the tracked
  `planning/` roadmap, decision register, quality baseline and Git workflow.
  Added a PR template and `changes/README.md` so each LLM records scope, checks,
  limitations and safe parallel work.
- Added ESLint recommended TypeScript checks as `pnpm run lint`; root
  `pnpm run typecheck` now runs lint first. The existing GitHub CI typecheck job
  therefore enforces lint. Database-backed API regressions continue to run in the
  existing CI workflow against its disposable PostgreSQL service.
- Added immutable, versioned board-release payloads, checksum validation, an
  ordered global catalog cursor, explicit admin preview/publish/history/withdraw/
  restore routes, and the read-only `/api/v2` catalog and bundle endpoints.
- Added the board release dialog in both card and list editor views. Added API
  specification and generated client updates.
- Preserved `/api/v1` unchanged for compatibility. **Important:** existing v1
  clients still read mutable published-board content; they are not protected from
  master edits until they migrate to `/api/v2`.
- Added bounds for a release (25–10,000 playable unique words; up to 2 MiB) and
  prevented fetching any historical bundle while the board is withdrawn.

## Checks and results

- `pnpm run typecheck` — passed (includes ESLint and all workspace TypeScript checks).
- `pnpm --filter @workspace/api-spec run codegen` — passed.
- `pnpm --filter @workspace/api-server run test` — passed: 5 files, 55 tests,
  including release lifecycle, withdrawal, rollback, stale previews, API-key guard
  and concurrent version allocation. Ran against the isolated `bingo_test`.
- `pnpm --filter @workspace/api-server run build` — passed.
- `PORT=5000 BASE_PATH=/bingo-db pnpm --filter @workspace/bingo-db run build` —
  passed. Vite reported existing source-map/caniuse data notices and a bundle chunk
  above 500 KiB; build completed successfully.
- Restarted the API and editor workflows. The editor preview showed its password
  sign-in page. The browser tool cannot sign into the protected editor, so the
  release dialog itself was not visually exercised there. Database-backed tests
  validate the API behavior.
- The first GitHub CI run failed before the API tests loaded because the test
  process did not have OpenAI client environment values. The main-branch check
  from 2026-10-05 shows the same pre-existing failure. The test setup now uses a
  loopback-only endpoint and a non-credential placeholder; a PR rerun is pending.
- The web preview's auth screen is expected; no credentials were entered or exposed.

## Remaining work and risks

1. Owner: review draft PR #2 and its required CI rerun. The branch includes its
   original six commits and is shared with Claude. Do not force-push, merge, or
   apply production schema changes.
2. Owner/game maintainer: identify the actual App Store record (link or numeric ID),
   current status, territories and Apple notices. No App Store Connect access or
   native iOS project was available in this workspace; do not infer the reason for
   disappearance from search results.
3. Game maintainer/Claude: audit the game repo and every shipping client for v1 usage,
   review the v2 checksum/cursor/withdraw contract, then implement and test the
   versioned client migration on a separate claimed branch. Do not change gameplay,
   purchase IDs, privacy statements or the Capacitor/Rork choice without its owner.
4. Owner/game maintainer: establish the entitlement-to-download rules and
   foreground/manual/Wi-Fi behavior before clients consume the whole v2 catalog.
5. Owner/Replit: add release history and tombstone tables to a full-database
   backup/restore drill. Editor snapshots only restore words and membership links;
   they do not restore release history. Production schema changes only via Publish.
6. Owner/site maintainer: identify the existing ultttra.com source and verify the
   support/contact/privacy links against observed product behavior before submission.
7. Owner: confirm GitHub branch protection, required CI and merge policy. No merge
   or Apple submission is authorized by this handoff.

## Suggested non-overlapping Claude work

- Read-only audit of `jdickan/road-trip-bingo-adventure`: list active v1 API callers,
  offline/cache behavior, purchase/restore rules, platform targets and where an
  iOS project/archive lives. Return findings and exact files; do not edit Replit's
  repository, release contract, or shared main.
- Read-only audit of the existing ultttra.com site/repository: report repository
  ownership, support/privacy/contact URLs and gaps against actual product behavior.
- After owner authorizes the PR and the client owner agrees on the contract, claim
  a distinct client-migration work item/branch with explicit boundaries. This is a
  suggestion, not an assignment.

## Integration state

Replit implementation is shared in draft PR #2; it is not merged, deployed,
migrated to clients, or released to the App Store. The overall launch task remains
blocked on App Store identity/status and game-client migration decisions.

See the [2026-10-15 draft-PR handoff](2026-10-15-draft-pr-published.md) for current
publication and CI status.
