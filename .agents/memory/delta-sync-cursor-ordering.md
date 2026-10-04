---
name: Delta-sync cursor query ordering
description: When returning a sync cursor plus a delta list in one response, query the cursor BEFORE the list to avoid permanently skipped updates.
---

Rule: in any endpoint that returns both a "latest version" cursor and a filtered list of changed items (e.g. `?since=` delta sync), compute the cursor **before** querying the list.

**Why:** if the list is queried first and a version bump lands between the two queries, the cursor would include a version whose item is missing from the list — the client persists the cursor and permanently skips that update. Querying the cursor first means a racing bump exceeds the returned cursor and is simply re-fetched next sync (safe direction: at-least-once, never lost).

**How to apply:** any `/v1`-style read API with `since`/`latestVersion` semantics in this project (boards delta sync), and any future delta-sync endpoint. Also remember: bump content versions for the union of old ∪ new memberships when an item moves between parents — the parent it *left* must re-version too.

Cursor-first reads are necessary but not sufficient: version allocation must also respect commit visibility.

**Why:** a transaction can allocate a lower sequence number and commit after another transaction with a higher number. A client that advances to the higher committed version can then permanently miss the later commit with the lower number.

**How to apply:** use commit-ordered change tracking, or serialize version allocation through transaction commit. Do not assume a PostgreSQL sequence alone guarantees a lossless global sync cursor.
