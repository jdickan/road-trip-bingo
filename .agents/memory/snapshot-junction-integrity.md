---
name: Snapshot dumps must include junction tables
description: Backup/restore of a table with a many-to-many junction must dump the junction rows too, not rebuild them from denormalized name columns.
---
Rule: when a pg_dump-based snapshot covers a table that participates in a junction (e.g. words ↔ boards), the dump must include the junction table itself. Never rely on rebuilding junction rows by joining a denormalized name column to the parent table.

**Why:** name columns go stale after renames (they are only rewritten on child-row writes), so a name-join rebuild silently drops associations for anything renamed since the snapshot. Caught in architect review of the boards redesign.

**How to apply:** include the junction in the dump and restore modern snapshots exactly. An empty junction is not proof of a legacy format. A failed modern junction import must fail the restore, not trigger name-based reconstruction. Refuse automatic recovery of legacy backups without verifiable exact links; keep them downloadable for manual recovery.

**Why:** a referenced board can be deleted and its name reused by a different board. Reconstructing a failed modern restore by name can silently attach words to the wrong board and conceal an import error.
