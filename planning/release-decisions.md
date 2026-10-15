# Release decisions awaiting the owner

Status: **open, 2026-10-15.** Each item needs an owner decision before the work it
gates. Recommendations are Claude's, with reasoning; record the chosen option and date
in `decisions.md` when resolved. Do not treat a recommendation as approval.

| # | Decision | Gates | Recommendation |
| --- | --- | --- | --- |
| R1 | Publish UX: what does "Published" mean in the editor? | EDITOR cleanup, v1 cutover | See R1 below |
| R2 | v1 cutover: when and how do legacy clients lose live/mutable content? | CLIENT, REHEARSE | See R2 |
| R3 | Entitlement: which boards are free vs one-time premium, enforced where? | CLIENT, PRIVACY, SUBMIT | See R3 |
| R4 | Kids' audience: Apple Kids Category / Google Families, or general audience? | PRIVACY, SDK choices | See R4 |
| R5 | Takedown policy for rights/safety issues on cached content | CONTRACT, client UX | See R5 |
| R6 | Download preferences: auto/manual, Wi-Fi only, caps, defaults | CLIENT, SYNC | See R6 |
| R7 | Release history retention and recovery drill | OPS, REHEARSE | See R7 |
| R8 | Merge and production publish authority | COORD | See R8 |

## R1. Publish UX

Today the editor shows two unrelated controls: the **Published** toggle (v1: live,
mutable, immediate) and **Releases** (v2: previewed, checksummed, frozen). The toggle
does not create a release and approving a release does not set the toggle.

- A. Keep both unlabeled. Rejected: it implies "Published" means approved and safe.
- B. Relabel toggle "Live (legacy v1)" with a warning that edits go out immediately,
  and add an "unreleased changes" badge comparing draft checksum to current release.
- C. Make Releases the only publish path; retire the toggle at v1 cutover.

**Recommend B now, C at cutover (R2).** B is a small, safe change; C depends on the
game migrating to v2.

## R2. v1 cutover

v1 serves any board with `published = true` and reflects every edit. Until every
shipping client reads v2, master edits can reach players unreviewed.

- Needs: an audit of which binaries still call v1 (game repo, read-only), and each
  board's initial v2 release published first.
- Options: (a) hard cut after min-supported-version adoption; (b) freeze v1 by
  republishing from the latest approved release; (c) leave v1 indefinitely.

**Recommend (b) as an interim step, then (a).** (b) protects shipped clients without
breaking them. Never silently reinterpret v1's checksum or cursor.

## R3. Entitlement

The v2 API has no entitlement check; the API key ships in the app and is not a
secret. Premium bundles are currently readable by anyone with the key.

- Decide: the free starter set, what the one-time premium pack unlocks, and whether
  the server validates a RevenueCat entitlement before serving premium bundles.
- Prerequisite: audit of actual purchase/restore product IDs in the game repo.

**Recommend server-enforced entitlement for premium bundles**, with starter bundles
shipped in the binary so basic play never needs login or network.

## R4. Kids' audience

Boards carry `ageLevels`. Kids categories restrict third-party analytics, ads and
SDKs and constrain data collection; this affects RevenueCat and diagnostics.

**Recommend deciding this first.** It narrows every later privacy and SDK choice. If
the intended audience is families but not a kids-category app, record that explicitly
and still avoid ads/tracking (already a roadmap non-negotiable).

## R5. Takedown policy

Routine withdrawal stops discovery and new downloads but cannot remove cached copies
from offline devices. Both stores expect prompt removal of infringing or unsafe content.

**Recommend:** routine withdrawal as built; for rights/safety, a documented path that
combines withdrawal, a minimum-content-version signal honored on next sync, and, if
needed, a binary update. Decide before the client contract freezes.

## R6. Download preferences

Defaults for: auto vs manual updates, Wi-Fi only, per-board and total size caps,
behavior when storage is low, and sync-disabled play.

**Recommend:** starter boards offline; optional boards manual by default; Wi-Fi only
on; updates never disturb an active game (version pinning, already specified).

## R7. Release history and recovery

Editor snapshots cover words and junctions, not the release tables. Approved releases
survive a master snapshot restore, but history needs full-database backup.

**Recommend:** run one restore drill into a scratch database before the first
production publish, and record it in `changes/`.

## R8. Merge and production publish authority

Main was unprotected when inspected. Production schema changes occur only through
Replit Publish, which is currently blocked on credits.

**Recommend:** owner merges #2 then #3; enable branch protection with the CI `test`
check required; keep agents unauthorized to merge or publish unless delegated per task.
