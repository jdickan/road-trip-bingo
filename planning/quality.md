# Quality baseline

Use pnpm and Node 24. Run `pnpm install --frozen-lockfile` after fetching changed dependencies.

| Check | Command | Purpose |
| --- | --- | --- |
| Lint | `pnpm run lint` | Basic correctness rules on maintained TS/TSX, excluding generated/build output |
| Typecheck | `pnpm run typecheck` | Composite libraries followed by workspace leaves |
| Security/unit | `pnpm --filter @workspace/api-server run test:auth` | Database-free API security and focused pure-logic checks |
| API integration | `pnpm --filter @workspace/api-server run test` | Security suite then real PostgreSQL API regression tests |
| Build | `pnpm run build` | Typecheck plus package builds |

Database-backed tests TRUNCATE data: use an explicitly isolated test database, never
the master/development/production content database. Existing test setup requires
`TEST_DATABASE_URL` and rejects equality with `DATABASE_URL`; confirm actual target
isolation as well, not only string inequality. CI provisions disposable `bingo_test`
and applies schema there. Do not run `push-force` against master/production.

Basic lint does not replace type checking, React behavior/accessibility testing,
security review or API-contract tests. Avoid unrelated bulk reformatting.
The root typecheck command includes lint, so the existing GitHub CI typecheck step
also enforces lint without changing the Actions workflow. The initial lint rules
are ESLint recommended correctness checks parsed as TypeScript; undefined/unused
name rules are not enabled because the core rules misread TS signatures. Generated
API clients, build output and the separate design sandbox are excluded.
For a changed regression, add a focused test; retain existing coverage.
For docs-only changes, check references/consistency rather than rerunning the app.
For critical user journeys, verify real behavior, using browser/device tests when
requests, unit tests and logs cannot establish it. Re-run only checks invalidated
by subsequent changes. Document pre-existing failures separately.

The game/website have separate toolchains: audit and record their actual commands
there rather than claiming this repository's checks validate those products.
