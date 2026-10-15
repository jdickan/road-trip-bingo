# Launch planning

This is the Git-shared planning source of truth for the Road Trip Bingo relaunch.
The original local task draft is ignored by Git and is not a handoff mechanism.
The roadmap is approved for execution; unresolved decisions remain explicit gates,
not implicit permission to invent app identity, drop features or submit to Apple.

Start here:
1. Read [shared instructions](../AGENTS.md).
2. Read [roadmap and current status](roadmap.md).
3. Read [decisions and deferred actions](decisions.md).
4. Read [Git/work ownership procedures](git-workflow.md) and
   [quality checks](quality.md).
   Store-policy fit for the release model: [store-policy](store-policy.md).
   Open owner decisions on releases: [release-decisions](release-decisions.md).
5. Read relevant recent [changes](../changes/README.md), then claim a ready item.

## Ownership boundaries

| Repository | Owns | Does not own |
| --- | --- | --- |
| `jdickan/road-trip-bingo` (this repository) | Master words/boards, editor, approved releases, backups and API | Player gameplay, card generation or win detection |
| `jdickan/road-trip-bingo-adventure` | Browser/mobile gameplay, cache, purchases, packaging and any approved Rork rewrite | Master database access or content approval |
| Existing ultttra.com source, ownership to confirm | Shared game directory, marketing, support and privacy pages | A duplicate game implementation or admin API |

Rork backs up game source to GitHub, not database content or the Apple account.
Claude's database copy is isolated/non-production. Replit remains the hosting
baseline pending compatibility assessment. No automatic merge or Apple submission.

## Shared work register

Current content-manager claim:
https://github.com/jdickan/road-trip-bingo/issues/1

Replit owns `replit/controlled-content-releases` and draft
[PR #2](https://github.com/jdickan/road-trip-bingo/pull/2), covering coordination,
quality and approved-release work. Other agents must claim a separate item before
editing. Suggestions in a handoff are not assignments.

GitHub main was unprotected when inspected on 2026-10-14. Owner-authorized merges
and review remain mandatory; repository protection still needs owner confirmation.
Uncommitted changes are **not shared**. Each agent must fetch or inspect the
relevant published branch/PR; main alone does not contain unmerged work.
Before a branch is pushed, its `changes/` handoff is local to this checkout; do
not tell another LLM it can read that handoff yet. The owner must approve sharing
the branch/PR, and must separately approve any merge.
