# Agent handoffs

Read relevant recent entries **before** work, after fetching/inspecting the shared
branch or PR. Local notes are not automatically visible to another LLM.
Use one file per meaningful batch, e.g. `YYYY-MM-DD-agent-topic.md`; add a unique
suffix if necessary instead of two agents editing the same file.

Include:
- Owner, repository, branch, shared claim, and commit/PR reference when available.
- What changed and why; affected areas and API/migration implications.
- Exact checks and outcomes; label failed/skipped/unavailable checks honestly.
- Remaining actions, blockers and deferred decisions with owners/revisit triggers.
- Suggested parallel work with dependencies and explicit non-overlapping boundaries.
- Integration state: local / PR-ready / merged / migrated / deployed / released.

Update the roadmap/decision register as appropriate. A suggestion is not an
assignment: claim it before starting. Keep secrets, personal data and dumps out.
