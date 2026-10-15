---
name: Shared agent handoffs
description: The project's durable coordination rule for parallel LLM work and release decisions.
---

Multiple LLMs are expected to coordinate from Git-tracked `planning/` and `changes/`
files, with a shared GitHub claim/branch/PR register. A local handoff is not visible
to another checkout until its branch/PR is published. Preserve one active editor per
checkout; use distinct claimed branches/worktrees for parallel changes. Owner approval
is required to merge or make production-release decisions.

**Why:** The project owner explicitly requested one shared instruction set and a
written status trail, so progress does not have to be pasted between LLMs and one
agent cannot silently overwrite another's work.

**How to apply:** Read the roadmap, decision register, Git procedures and latest
relevant handoff before work. After meaningful changes, record exact checks, blockers,
deferred decisions and bounded parallel suggestions; identify whether the notes are
local, pushed, in a PR, merged or deployed.
