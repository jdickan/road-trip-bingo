# Draft PR publication and CI follow-up

## Ownership and shared state

- Owner: Replit Agent. Repository: `jdickan/road-trip-bingo`.
- Branch: `replit/controlled-content-releases`; shared claim: GitHub issue #1.
- Draft PR: https://github.com/jdickan/road-trip-bingo/pull/2
- The branch was published without rewriting its six existing commits. Every
  uploaded blob, tree and commit hash was verified against the local Git object.
  The PR base was `main` at `afedb1076366644312ec7ab118311ed1450863bb`.
- No merge, production migration, deployment, App Store submission or release
  action was performed. The working branch remains unfinished and owner-controlled.

## CI finding and action

- The first PR test job failed during module loading: the API router imports the
  OpenAI client eagerly, while CI intentionally has no AI provider credentials.
- The main-branch test check from 2026-10-05 had the same missing-configuration
  failure, so this was not introduced by the release implementation.
- API test setup now provides a loopback-only URL and a placeholder key, ensuring
  tests do not inherit real credentials or make outbound AI calls. AI behavior
  tests must mock the integration client. After this change, local auth tests
  passed; the full local suite requires `TEST_DATABASE_URL`, while CI supplies
  the isolated PostgreSQL service.
- GitHub Actions' `test` check passed on PR head
  `290b55a1de5a89d848f395e71e9b2046cbb601ce` on 2026-10-15. This is the latest
  code-bearing head; subsequent handoff updates, if any, are documentation-only.

## Verified local checks from the implementation batch

- `pnpm run typecheck` — passed; includes lint and workspace TypeScript checks.
- `pnpm --filter @workspace/api-spec run codegen` — passed.
- `pnpm --filter @workspace/api-server run test` — passed before the CI follow-up:
  5 files, 55 tests against isolated `bingo_test`; CI passed again after the
  test-only provider configuration was added.
- `pnpm --filter @workspace/api-server run build` — passed.
- `PORT=5000 BASE_PATH=/bingo-db pnpm --filter @workspace/bingo-db run build` —
  passed with non-fatal source-map, browserslist and bundle-size notices.
- After that change, the database-free auth suite passed (33 tests) and
  `pnpm run typecheck` passed. The local full-suite command stopped at its required
  `TEST_DATABASE_URL` guard because this shell has no isolated test database; GitHub
  Actions provides a disposable PostgreSQL service.
- The full API suite was exercised by the successful CI test check above. The
  local full-suite command remains unavailable without an isolated test database.

## Remaining work and safe parallel suggestions

- Owner: review the draft PR, confirm branch protection and merge policy, and
  approve any eventual merge separately.
- Game maintainer/Claude: read-only audit of `jdickan/road-trip-bingo-adventure`
  for shipped v1 API clients, offline behavior, purchases, platform targets and
  the submitted native project/archive. Do not edit this API repository.
- Website maintainer/Claude: read-only audit of the existing ultttra.com source,
  ownership, support/privacy/contact links and actual product behavior. Claim a
  distinct work item before making changes.
- Owner/game maintainer: provide the actual App Store listing link or numeric ID,
  current status, storefront availability and Apple notices. Do not provide login
  credentials.
- Client migration, entitlement/download policy, release-history recovery drill,
  production publish/rehearsal and App Store actions remain blocked or deferred as
  recorded in `planning/roadmap.md`.

## Integration state

Shared as draft PR #2; not merged, deployed, migrated to game clients or released
to the App Store. `/api/v1` remains mutable until all shipping clients migrate to
the approved `/api/v2` contract.
