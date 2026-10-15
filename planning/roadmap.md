# Road Trip Bingo relaunch roadmap

Status key: not started / in progress / blocked / done / deferred.
“Done” requires evidence of the stated outcome, not only written code.
Branch implementation is not equivalent to merged, deployed or App Store live.

## Execution order

Coordination and quality first → audit and independent API preparation →
contract/release boundary → client integration plus independent public-site work →
critical-journey verification → submission/rehearsal → availability/discoverability.

| ID | Work / observable completion | Owner | Dependencies | Status |
| --- | --- | --- | --- | --- |
| COORD | Shared planning, decisions, changes, claims and PR/merge/cleanup procedures are readable through GitHub | Replit | None | In progress — shared in draft PR #2; owner review and repository protection/merge policy confirmation remain |
| QUALITY | Basic lint/typecheck/tests/build documented and CI enabled; isolated test data and honest baseline | Replit | COORD | In progress — lint/typecheck pass; auth tests pass locally; GitHub Actions `test` check passed on PR head `290b55a1de5a89d848f395e71e9b2046cbb601ce`; local full suite needs `TEST_DATABASE_URL` |
| AUDIT | Actual App Store identity/status/storefront/distribution and submitted native baseline verified; feature/platform/purchase inventory recorded | Owner + game maintainer; Claude may claim audit | Apple account/source access | Blocked |
| CONTRACT | Agree schema/checksum, global cursor, withdrawal, compatibility and client download preferences; share fixtures | Replit + client owner | Existing API audit; implementation choice before client coding | In progress — v2 contract exists; client confirmation, entitlement/download policy and cross-client fixture review remain |
| RELEASE | Immutable approved metadata + resolved word snapshots; explicit publish, routine withdrawal and new-version rollback | Replit | CONTRACT, QUALITY | Done in the Replit working branch; production publish and operational rehearsal remain |
| EDITOR | Preview/validation and intentional release approval; draft edits cannot change approved bundles | Replit | RELEASE | Done in the Replit working branch; not yet merged or deployed |
| API | Approved-only catalog/bundle contract tested, compatible existing consumers or explicit versioned migration | Replit | RELEASE, CONTRACT | In progress — v2 API and tests exist locally; v1 remains live/mutable until every shipping client migrates |
| CLIENT | Bounded typed downloads, validated atomic cache writes, serialized sync; cursor advances only after required downloads succeed | Game maintainer/Rork, coordinated Claude contributions | CONTRACT, AUDIT, client choice | Blocked |
| PLAY | Starter bundles work at first launch offline; local generation/play, progress persistence and active-game version pinning | Game maintainer | CLIENT | Blocked |
| SYNC | Foreground/manual refresh, auto/manual and Wi-Fi preferences, caps, sync-disable preserving play, privacy-conscious diagnostics | Game maintainer | CLIENT | Blocked |
| OPS | Stable HTTPS production API, cache/ETags, admin protection, multi-instance limits, monitoring/recovery and hosting decision | Replit + owner | Contract; hosting assessment before migration | Not started |
| PRIVACY | Actual SDK/log/AI data practices, one-time premium purchase/restore and downloadable entitlement rules, audience/rating/content rights verified | Owner + game maintainer | AUDIT | Blocked |
| SITE | Existing ultttra.com support/contact/privacy/landing pages updated without duplicating gameplay; correct public/in-app links | Website owner; Claude may claim audit | Source ownership and PRIVACY for final policy | Blocked |
| VERIFY | Offline/resume, malformed/interrupted download, cursor race, schema mismatch, withdrawal/rollback/outage/upgrade and retained purchase journeys verified on supported devices | Respective implementers | API, PLAY, SYNC, PRIVACY | Not started |
| REWRITE-GATE | Capacitor vs Rork choice preserves audited features/entitlements and reproducible maintainable builds; reassess if parity fails | Owner + game maintainer | AUDIT; before rewrite and again before submission | Blocked |
| SUBMIT | Current SDK/signing/identity/metadata/screenshots/privacy/encryption/review notes and TestFlight ready; owner performs Apple actions | Owner + game maintainer | VERIFY, SITE, REWRITE-GATE | Blocked |
| REHEARSE | Publish/update/withdraw/rollback and recovery rehearsed; distinguish server data releases from reviewed binary changes | Replit + game maintainer | API, OPS, VERIFY | Not started |
| LIVE | Intended-storefront direct listing works; exact displayed-name/brand searches observed and documented separately; owner authorizes manual release | Owner | SUBMIT approved; availability issue resolved | Blocked |

## Non-negotiable acceptance checks

- Approved bundles freeze metadata and resolved words, include a schema version and
  checksum, and never change when master data is edited. Versions are immutable.
- Keep global catalog cursors separate from per-board revisions. Serialize allocation
  with commit ordering so later commits are not permanently skipped.
- Routine withdrawal prevents discovery/new downloads but leaves cached play intact.
  Any exceptional rights/safety takedown requires a separately agreed next-sync policy;
  offline devices cannot be remotely controlled. Rollback creates a higher version.
- Preserve working caches on invalid/interrupted downloads and active games on updates.
  New optional boards and updates follow agreed user download preferences.
- Phones use a stable production read-only API, not admin endpoints or preview URLs.
- Preserve one-time premium entitlements and restore behavior. No new subscription or
  AI implementation is assumed merely because another assistant described one.
- Define browser desktop, Designed for iPad on Mac/Vision Pro, native macOS and Windows
  explicitly. Do not treat them as interchangeable.
- No gameplay, executable downloads, login requirement for basic play, ads/tracking,
  location collection, chat or multiplayer is introduced here.
- Keep one production database; source merging does not merge data. No Vercel migration
  without testing native snapshot tools, storage auth, DB connections and runtime limits.
- Public support/contact and accurate privacy policy are required; marketing URL is
  optional. Final labels/ratings follow verified implementation, not assumptions.
- A working Capacitor game is not automatically an App Review rejection. A Swift rewrite
  or website marketing is not a guaranteed remedy for availability/search problems.

## Audit evidence and unresolved identity

The earlier game-source inspection found React/Vite/Capacitor, Android source,
RevenueCat purchase/restore, and a one-time premium pack. No Foundation Models
implementation was located in the inspected README/tree/main component.
Tracked `ios/` contained an ignore file, not the submitted Xcode project.
A release titled “Submitted to App Store” is not proof of approval or live-binary identity.

This workspace implements a separate `/api/v2` approved-release contract. Existing `/api/v1`
remains unchanged during client transition; it still serves mutable live published-board
data, so v1-only clients are not protected from draft edits until an intentional cutover.
Never claim otherwise. Current release history/events remain in the primary app database;
editor snapshots back up only words/junctions, not release history. The release history's
full-database backup and restore/recovery process must be rehearsed before launch. Approved
release payloads stay unchanged across master-word snapshot restores; published v2 clients
continue to see the same release. A production schema update only occurs through Replit Publish.

The owner reported on 2026-10-05 that the game had been live but no longer seemed
available, and exact-name search for “Bingo Road Trip Adventure” did not find it
while live. The repository title is “Road Trip Bingo Adventure.” Reconcile both
with the actual App Store record; a zero-result US bundle lookup did not establish
that the app never shipped. Check public/unlisted distribution, storefronts,
status/notices and historical identifiers separately from search metadata.

## Evidence and next action

See [decisions](decisions.md) for gates and [changes](../changes/README.md) for actual
checks and implementation outcomes. Replit can prepare and deliver API work
independently of the native rewrite decision once the server contract is reviewed.
Claude may claim a read-only game/native-project or website ownership audit without
editing Replit-owned files. Neither suggestion is an automatic assignment.
