---
name: Snapshot resource budgets
description: Availability safeguards must preserve recovery data and coordinate shared-storage mutations across instances.
---

Snapshot quotas must refuse new creation rather than automatically deleting older backups.

**Why:** Hardening availability must not destroy the recovery data users rely on. Existing backups are not an expendable cache.

**How to apply:** Keep quota failures explicit and leave deletion under editor control, including when pre-existing backups exceed a new limit.

Every snapshot-producing or restore path must use cross-instance serialization, not only a process-local busy flag.

**Why:** Private backup storage and the database are shared across app instances; local locks cannot prevent concurrent quota overshoot or competing restores.

**How to apply:** Keep admission, quota checks, processing and cleanup in the same protected operation. Finish cleanup and lock release before acknowledging completion.