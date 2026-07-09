# Phase 4 handoff prompt — iOS sync layer (for Claude / Codex)

This is the paste-ready execution prompt for **Phase 4 — iOS integration** (`docs/IMPLEMENTATION_PLAN.md`, detail in `docs/IOS_INTEGRATION_PLAN.md` §5–6). Phase 4 is Swift/Xcode work that lives outside this repo; this prompt hands the deployed API contract and all offline/sync requirements to whichever coding assistant executes it.

Before pasting: fill in the three placeholders at the top of the prompt. Also verify `PUBLIC_API_KEY` is set in the production deployment — the public API fails closed (503) without it.

Optional: attach `lib/api-spec/openapi.yaml` to the session and add the line "an OpenAPI 3.1 spec is attached; you may use swift-openapi-generator or hand-write models, your call" — the Swift models are then guaranteed in sync rather than transcribed.

---

```markdown
You are implementing the sync layer for an existing iOS app, "Road Trip Bingo." The app already
has an on-device card-generation engine that consumes board definitions + word pools. Your job is
to add a networking + offline cache + background refresh layer that pulls published content from a
remote content database, following the requirements below exactly.

FILL THESE IN BEFORE STARTING:
- Base URL: https://<PRODUCTION_DOMAIN>/api   (Replit deployment, HTTPS, no ATS exceptions needed)
- API key: <PUBLIC_API_KEY value>  (ships in the binary; it is attribution/abuse control, not a secret)
- Existing app details: <UIKit or SwiftUI, min iOS version, how the card engine ingests board/word data>

## API contract (already deployed — do not redesign it)

Auth: every request must send header `X-API-Key: <key>`.
- 401 = missing/invalid key. 503 = server key not configured (fail closed).
- Rate limit: 60 requests/min per IP; 429 with JSON `{"error": "..."}`. Errors are always `{"error": string}`.

### GET /api/v1/boards[?since=<int>]
Lists ONLY published boards. `since` = highest contentVersion seen on a previous sync; returns only
boards whose contentVersion is greater. Omit for full list.
Response:
{
  "boards": [{
    "id": int, "name": string, "description": string|null,
    "ageLevels": [string],            // e.g. "Young", "Kid", "Tween"
    "difficulty": string|null,        // e.g. "Easy", "Medium", "Hard"
    "timeOfYear": string|null,        // e.g. "All Year", "Summer", "Winter"
    "contentVersion": int,            // globally monotonic, bumped on any content change
    "wordCount": int
  }],
  "total": int,            // count in THIS response (after the since filter)
  "latestVersion": int     // highest contentVersion across ALL published boards (0 if none),
                           // regardless of the since filter — persist this as the next `since` cursor
}

### GET /api/v1/boards/{id}/bundle
Self-contained payload to play one board fully offline.
- 404 for nonexistent AND unpublished boards (indistinguishable by design).
Response:
{
  "board": <same shape as a boards[] entry above>,
  "words": [{
    "id": int, "word": string, "spanish": string|null, "emoji": string|null,
    "age": string|null, "findability": string|null,
    "seasons": [string], "dayNight": [string], "regions": [string], "surroundings": [string]
  }],
  "contentVersion": int,
  "checksum": string   // "sha256:<hex>" over the server's canonical compact JSON of the words array
                       // (sorted by id, fixed key order exactly as listed above, no whitespace).
                       // Treat it primarily as an opaque change-detection token: compare stored vs.
                       // fetched checksum to skip unchanged re-downloads. Only attempt byte-level
                       // re-verification if you reproduce that exact serialization.
}

## What to build

1. **Models** — Codable structs for BoardSummary, BoardList, BundleWord, BoardBundle, matching the
   shapes above exactly (nullable fields as Optionals).
2. **API client** — async/await URLSession client with the X-API-Key header, typed errors
   (unauthorized, notFound, rateLimited, serverUnavailable, network, decoding), and a small retry
   policy for transient failures. Respect 429 by backing off, never by hammering.
3. **Bundle store (disk cache)** — persist each bundle to
   `Application Support/boards/<boardId>-v<contentVersion>.json` (excluded from iCloud backup is fine).
   Keep an index (boardId → cached contentVersion, checksum, downloadedAt). CRITICAL: never delete a
   cached bundle just because the board stopped appearing in /v1/boards — unpublishing server-side
   must not remove content from phones that already have it. Clean up superseded versions
   (same board, older contentVersion) only after the newer bundle is fully written and verified valid JSON.
4. **Sync coordinator** — single entry point `syncIfNeeded()`:
   - Load persisted `since` cursor → GET /v1/boards?since=… → for each returned board whose
     contentVersion is newer than the cached one, download its bundle → atomically write to disk →
     update index → persist `latestVersion` as the new cursor ONLY after all downloads succeed
     (a failed mid-sync must leave the cursor unchanged so the next sync retries the same delta).
   - Must be reentrancy-safe (a launch sync and a background sync must never run concurrently).
   - Must NEVER block app launch or gameplay; it is fire-and-forget from the app's perspective.
   - Any network failure = silent fallback to cache. No error dialogs during normal use.
5. **Background refresh** — register a BGAppRefreshTask (include the Info.plist
   BGTaskSchedulerPermittedIdentifiers entry and the registration + scheduling code in
   AppDelegate/App init) that calls syncIfNeeded() with an expiration handler that cancels cleanly.
6. **Manual refresh** — a "Check for new boards" action for the Settings screen that runs
   syncIfNeeded() and surfaces a "Last synced: <timestamp>" (persisted; shows even after relaunch).
   This is the ONE place where a failure may show a gentle inline message.
7. **First-run seed** — load a small set of bundle JSON files shipped in the app bundle so the app is
   fully playable before the first network call ever succeeds; the sync layer overlays anything newer
   (bundled seeds count as cached at their embedded contentVersion).
8. **Read API for the game engine** — a simple `BoardProvider` that returns all locally available
   boards (seeded + downloaded, newest version of each) so the existing card generator never touches
   the network.

## Edge cases you must handle explicitly
- Airplane mode from very first launch (seed boards only — everything still works).
- Sync that dies mid-download (partial files must never corrupt the cache; write-temp-then-rename).
- Board updated server-side while its old bundle is cached (new version downloaded, old one replaced
  atomically, game in progress with old data is not disturbed).
- Board unpublished server-side (cached copy remains playable forever; it just stops updating).
- 503 / 401 (treat like offline for automatic syncs; report clearly only in manual refresh).
- Stale cursor pointing above current latestVersion (server data was restored from backup): if
  /v1/boards?since= returns empty but latestVersion is LOWER than the stored cursor, reset the cursor
  to latestVersion and do a full re-list on the next sync.

## Constraints (App Store)
- HTTPS only, no ATS exceptions.
- No login/account of any kind.
- Downloaded content is data, not code — keep it that way (no remote config that alters behavior).
- App Review tests airplane mode; every flow above must degrade gracefully with zero network.

## Deliverables
- Swift files organized as: Models, APIClient, BundleStore, SyncCoordinator, BackgroundRefresh,
  BoardProvider, plus the Settings-screen refresh hook.
- Unit tests for: cursor persistence rules (including the failed-mid-sync and stale-cursor cases),
  BundleStore atomicity/version-supersede logic, and API client error mapping (use URLProtocol stubs).
- A short integration note listing exactly what to add to Info.plist and where to call the
  registration/scheduling code.

Ask me for the missing placeholder values and the app's architecture details before writing code if
anything above is ambiguous.
```
