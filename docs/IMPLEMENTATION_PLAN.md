# Implementation Plan

Ties together `docs/ANALYSIS.md`, `docs/BOARDS_SCREEN_REDESIGN.md`, and `docs/IOS_INTEGRATION_PLAN.md` into an ordered set of phases. Each phase is meaningful on its own and doesn't require committing to the ones after it.

## Phase 0 — Data integrity foundations
*Do this first — every later phase (Boards redesign, iOS bundles) builds on boards having stable IDs.*

- [ ] Add a junction table `bingo_word_boards(word_id, board_id)` in `lib/db/src/schema/`; migrate existing `words.boards: text[]` name-array data into it by matching current names against `bingo_boards.name`.
- [ ] Update `GET /boards` in `artifacts/api-server/src/routes/boards.ts` to compute `wordCount` via a SQL join/`GROUP BY` instead of pulling the whole words table into memory.
- [ ] Update the Words tab's "Boards" cell editor (`WordTable.tsx` / `CellEditor.tsx`) to work off board IDs (still displaying names, resolved from a live boards list) instead of the hardcoded `constants.ts` array.
- [ ] Delete `BOARDS` from `artifacts/bingo-db/src/lib/constants.ts` and `VALID_BOARDS` from `artifacts/api-server/src/routes/ai.ts`; both read the live `bingo_boards` table instead. This removes two of the three duplicated sources of truth flagged in `docs/ANALYSIS.md` §3.2.
- [ ] Add a minimal test harness (Vitest is the natural fit given the existing Vite setup) covering: words CRUD, boards CRUD, and the new join-based word count. Add a GitHub Actions workflow running `pnpm run typecheck` + tests on push — there is currently zero automated verification anywhere in the repo.

## Phase 1 — Boards screen redesign
*Full detail in `docs/BOARDS_SCREEN_REDESIGN.md`.*

- [ ] Build `BoardPreviewGrid` component rendering a sampled 5×5 (or configurable) preview from a board's resolved word pool.
- [ ] Add server-computed content-coverage info to the `GET /boards` response (word count + age/findability spread check) so the redesigned screen can flag under-populated or unbalanced board ideas.
- [ ] Split `status` (lifecycle: concept/draft/active) from a new `published` boolean; update the status badge UI to two independent controls instead of one overloaded 3-way cycle.
- [ ] Replace hover-reveal edit/disable/delete icons with a single overflow menu (`components/ui/dropdown-menu.tsx` is already in the project, unused).
- [ ] Add a Cards/List view toggle for the Boards tab, reusing the `Table` primitives already used in `WordTable.tsx`.

## Phase 2 — Theme panel improvements

- [ ] Replace the fake `SkinPreview` mockup with an actual embedded/scaled preview of real app chrome (tab bar + a few table rows) so changes are visible without leaving the Theme tab.
- [ ] Add a **density preset** (Compact/Cozy/Comfortable) as the primary, most prominent control — this is the highest-leverage single addition given your stated density preference, ahead of the existing raw radius/divider sliders.
- [ ] Support multiple named custom theme slots (not just one "My Theme") with the ability to switch between saved presets.
- [ ] Add inline copy clarifying that Background Tint has no visible effect in dark mode (or extend `applyTheme` to support a dark-mode tint variant, if you'd rather fix the gap than just document it).

## Phase 3 — API hardening for external consumption
*Detail in `docs/IOS_INTEGRATION_PLAN.md` §3–4.*

- [ ] Add `published`/`publishedAt`/`contentVersion` columns to `bingo_boards` and a "Publish" action in the redesigned Boards screen (depends on Phase 1's split of status vs. published).
- [ ] Add a versioned, read-only `/api/v1/boards` + `/api/v1/boards/:id/bundle` namespace to `lib/api-spec/openapi.yaml`, regenerate the Orval-generated Zod/React Query packages, implement the routes.
- [ ] Add API key check + rate limiting (`express-rate-limit`) in front of `/api/v1/*` only — leave existing admin routes on their current trust model.
- [ ] Confirm the deployed server is HTTPS-only (required by iOS App Transport Security; a Replit deployment provides this by default).

## Phase 4 — iOS integration
*Detail in `docs/IOS_INTEGRATION_PLAN.md` §5–6.*

- [ ] Generate (or hand-write, if generation is more friction than it saves) a Swift networking layer from `openapi.yaml`.
- [ ] Build the local bundle cache + version-check + background refresh (`BGAppRefreshTask`) layer in the iOS app.
- [ ] Add a "Check for new boards" manual refresh + last-synced timestamp in iOS Settings.
- [ ] Ship a small default set of published boards bundled inside the iOS binary for pre-first-sync/offline-from-install behavior.
- [ ] Test thoroughly offline: airplane mode from first launch, from a stale cache, and mid-failed-sync — before submitting to App Review.

## Phase 5 — Ongoing / not urgent

- [ ] Decide whether DeviceCheck/App Attest is worth adding later if `/api/v1/*` sees abuse (skip for v1 per the integration plan's reasoning).
- [ ] Basic uptime monitoring for the API server once an external iOS app depends on it being reachable (today it only needs to be up when you're actively using the admin tool).

## Suggested sequencing

Phases 0 and 1 are valuable regardless of whether you ever ship the iOS integration — they fix a real data-integrity bug and the screen you already said feels wrong. Phase 2 is independent and can slot in anytime. Phases 3–4 are the actual iOS-integration work and depend on Phase 0 (stable IDs) and benefit from Phase 1 (a `published` concept to gate on).
