---
name: Snapshot dumps must include junction tables
description: Backup/restore of a table with a many-to-many junction must dump the junction rows too, not rebuild them from denormalized name columns.
---
Rule: when a pg_dump-based snapshot covers a table that participates in a junction (e.g. words ↔ boards), the dump must include the junction table itself. Never rely on rebuilding junction rows by joining a denormalized name column to the parent table.

**Why:** name columns go stale after renames (they are only rewritten on child-row writes), so a name-join rebuild silently drops associations for anything renamed since the snapshot. Caught in architect review of the boards redesign.

**How to apply:** add `--table=<junction>` to the pg_dump args; on restore, keep a name-based rebuild only as a fallback when the restored junction is empty (older snapshots / FK-failed COPY). Verify by counting junction rows before and after a restore cycle.
