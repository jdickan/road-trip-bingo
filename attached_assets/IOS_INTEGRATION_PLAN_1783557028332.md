# iOS Integration Plan — pulling curated content from this database

Goal: let the existing Road Trip Bingo iOS app reference/pull board ideas and their associated words/icons from this content database, hosted on a server, in a way Apple has no reason to flag and that holds up in real road-trip conditions (spotty/no cellular). This database is a content/organization tool, not a card generator — the iOS app is where board ideas + word pools actually turn into playable cards, so everything below is about handing it clean, well-organized content, not about this server producing game boards itself.

## 1. Pick the sync model deliberately

Three options, in order of how much they trust the network:

- **A — Live client.** iOS calls the API every time it needs data. Simplest to build, worst fit here: road trips are exactly the scenario with the least reliable connectivity, and you don't want "no bars" to mean "can't start a game."
- **B — Publish-and-cache.** This tool publishes an immutable, versioned bundle per board. iOS downloads bundles opportunistically and plays entirely from local storage afterward. Best fit for the actual use case.
- **C — Hybrid (recommended).** Same as B, plus a lightweight background/manual refresh check so new or updated boards show up without the user thinking about it, with graceful fallback to whatever's cached when offline.

**Recommendation: C.** Everything below assumes it.

## 2. What "published" means, and why you need it

Don't let iOS read your live, mid-edit admin data. If you're fixing a typo in a board description at 11pm, nobody's phone should show a half-edited board mid-drive the next morning. Introduce an explicit **publish** step, separate from the day-to-day editing you already do:

- Add a `published: boolean` (+ `publishedAt`, `publishedVersion`) to `bingo_boards`, distinct from the existing `status` field (see `docs/BOARDS_SCREEN_REDESIGN.md` §3 — this is the same schema change, motivated from the iOS side here).
- The iOS-facing endpoints only ever serve `published = true` rows. `draft`/`concept` boards and unpublished edits are invisible to the app no matter what.
- This also gives you a natural rollback story: if a published board turns out to have a problem, unpublish it — already-downloaded copies on phones keep working (see §5), but it stops appearing for new downloads.
- You already have the building block for "frozen point-in-time state" in the Snapshots feature (`SnapshotsPanel.tsx`, `pg_dump`-based) — publishing a board is a narrower, per-board version of the same idea, not a new concept for the codebase.

## 3. API surface (add to `lib/api-spec/openapi.yaml`, not a parallel spec)

Add a small, deliberately read-only, versioned namespace rather than exposing the admin CRUD routes:

- `GET /api/v1/boards` — list published boards: id, name, description, ageLevels, difficulty, timeOfYear, contentVersion/hash, wordCount. No draft/concept ever appears here.
- `GET /api/v1/boards/:id/bundle` — the full self-contained payload for one board: metadata + its resolved word list (already joined server-side against the fixed word↔board relationship — see `docs/ANALYSIS.md` §3.1 fix — so iOS never has to re-implement your tag-matching logic), a `contentVersion`, and a `checksum`.
- `GET /api/v1/boards?since=<version>` (or `If-Modified-Since` header) — cheap delta check: "what changed since the version I last synced," so a phone that already has 20 boards doesn't re-download all 20 to notice one changed.

Because these live in the same OpenAPI spec that already drives the web app's Orval codegen, you (or a tool like Apple's `swift-openapi-generator`) can generate a typed Swift client straight from `openapi.yaml` — one contract, two generated clients, instead of hand-describing the API twice.

## 4. Auth — proportional to what's actually at risk

The data here is word lists for a kids' road-trip game — low sensitivity. Don't over-engineer this, but don't leave it wide open indefinitely either, especially once a public App Store binary embeds a way to call it.

- **Pragmatic default:** a static API key shipped in the iOS app (understand this is *not* a secret — anything in an app binary can be extracted — its job is attribution/rate-limiting, not access control) plus server-side rate limiting (`express-rate-limit` or similar) on the `/api/v1/*` namespace. This stops accidental abuse and runaway costs without adding real complexity.
- **If you want it done "properly":** Apple's **DeviceCheck** / **App Attest** lets your server verify a request genuinely came from your real app on a real device, without you managing user accounts. Worth it only if you start seeing scraping/abuse; skip it for v1.
- Either way: **no user login required to play.** Apple's review process and your own UX both want offline-first, account-free access to already-downloaded content.

## 5. iOS-side data flow

- **Storage:** each published bundle saved to disk (e.g. `Application Support/boards/<boardId>-v<version>.json`), loaded into whatever the existing card-generation engine already consumes. Keep raw bundles around even if a board is later unpublished server-side — a phone that already has a board should keep being able to play it; unpublishing only affects what *new* downloads see.
- **Sync check:** on launch (if online) and via a periodic `BGAppRefreshTask`, call `GET /api/v1/boards?since=<lastKnownVersion>`. Only download bundles that changed. Never block app launch or gameplay on this call — it's opportunistic.
- **Manual refresh:** a "Check for new boards" action in Settings, with a "last synced" timestamp shown, for users who want control.
- **Offline behavior:** if the sync check fails (no network), silently fall back to whatever's cached — no error dialog interrupting a game that's about to start in a dead zone.
- **First-run:** ship a small default set of published boards bundled *inside* the app binary (so it works before the very first network call ever succeeds), then let sync layer in anything newer.

## 6. Apple App Store considerations

Since you mentioned wanting this "connected in some way... that Apple finds appropriate":

- **This is data, not code.** Downloading word lists/board definitions that change app *content* is explicitly fine under App Store guidelines — it's the same category as downloadable levels/content packs in games. You are not downloading or executing new code (which *would* be a 3.3.2 issue), just structured data your existing on-device generator consumes.
- **HTTPS required.** App Transport Security blocks plain HTTP by default; make sure the server is served over TLS (a Replit deployment gives you this for free) — don't add ATS exceptions to work around it.
- **Must work offline.** App Review commonly tests airplane mode. Anything downloaded must keep working with zero network; anything not yet downloaded should fail gracefully, not crash or hang.
- **No surprise network use.** Be upfront in a Settings/About screen about when the app talks to the network and why (sync new boards) — avoids any perception of undisclosed data collection. You're not collecting personal data here, but stating that plainly is easy goodwill with reviewers and in your App Store privacy labels.
- **No login wall.** Don't require account creation to access core gameplay; that's a common rejection/friction point and isn't needed for this use case anyway.

## 7. Rollout order

1. Fix board↔word linkage to be ID-based (`docs/ANALYSIS.md` §3.1) — everything below depends on stable IDs.
2. Add `published`/`publishedAt`/`contentVersion` to `bingo_boards`; add a "Publish" action in the (redesigned) Boards screen.
3. Add the `/api/v1/*` read-only namespace + OpenAPI paths + regenerate Orval clients (confirms nothing on the web side broke).
4. Add API key + rate limiting middleware in front of `/api/v1/*` only (leave the existing admin routes as they are, on the same trust model as today, since only you use them).
5. Generate/write the Swift client, build the local cache + background refresh layer in the iOS app.
6. Test fully offline (airplane mode from first launch, from a stale cache, from a failed mid-sync) before ever submitting to App Review.

This mirrors the phased plan in `docs/IMPLEMENTATION_PLAN.md` (Phases 3–4) — this document is the detail behind those phases specifically for the iOS side.
