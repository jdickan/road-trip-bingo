# Shared agent instructions

Read `planning/README.md`, `planning/roadmap.md`, `planning/decisions.md`,
`planning/git-workflow.md`, and relevant recent entries in `changes/` before work.
These instructions apply equally to Replit Agent, Claude, and other contributors.

- Claim work in the shared GitHub register before implementation. Include owner,
  branch, boundaries and dependencies; a local claim alone is not visible to others.
- Use an individual branch and separate checkout/worktree for each active agent.
  If there is only one working directory, allow one active editor at a time.
- Preserve existing/uncommitted work. Do not switch another agent's checkout,
  broadly stage files, force-push shared history, or discard files to obtain a clean tree.
- Keep gameplay in the game repository. This repository owns master content,
  editorial tools, approved releases and the read-only API.
- Maintain one production database. Other LLMs use isolated development/test data;
  never synchronize database records by merging Git branches.
- Keep secrets, connection strings, personal data and database dumps out of Git,
  handoffs, PRs and logs. Never print authenticated Git remote URLs.
- Include a concise `changes/` handoff in each meaningful change batch. Record
  exact checks/outcomes, limitations, remaining work and bounded parallel suggestions.
- Verify the observable outcome before marking an item done. Distinguish local,
  PR-ready, merged, migrated, deployed and released states. Unrun checks are not passes.
- Use focused tests and proportionate verification, not a ceremony for every edit.
  Record deferred actions with a reason, owner and revisit trigger.
- Submit scoped PRs. The owner retains merge approval unless explicitly delegated.
  Codex may review/comment but does not implement fixes or merge.
- Read fresh shared status before taking a suggested parallel item. Resolve overlapping
  claims, shared migrations and contract changes before editing.

See `planning/quality.md` for commands and test-database safety requirements.
