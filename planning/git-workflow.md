# Work claims, PRs, merges and cleanup

## Start / isolate
1. Fetch or inspect current shared branches, roadmap, decisions and handoffs.
2. Claim a bounded item in the GitHub work register. Record owner, repo, branch,
   affected areas, dependencies and next action; confirm no overlapping claim.
   A local note is not a lock. A coordinator resolves disputes/stale ownership.
3. Inspect `git status --short`, `git branch --show-current`, local commits and
   `git worktree list`. Preserve dirty/untracked work. Do not auto-stash or reset it.
4. Use an agent/item branch in a separate clone/worktree for each concurrent agent.
   On a shared directory, serialize editing. Never switch another agent's checkout
   or a running service's branch. Keep Rork exports on their own branch.

## Implement / PR
5. Agree shared contracts/migrations/generated areas before parallel edits.
6. Stage only reviewed, item-owned files. Include a uniquely named `changes/` handoff
   with checks/results, limitations and proposed parallel next steps. Never broadly
   stage another contributor's files or secrets.
7. Commit and push the branch without rewriting shared history; open a draft PR while
   unfinished. PR body: roadmap item, scope/rationale, baseline/dependent PRs,
   checks, migrations/compatibility, risks and remaining work.
8. Require current CI and review. Resolve conflicts by understanding both changes,
   not selecting “ours/theirs.” Re-run invalidated checks and revisit affected
   approvals. Codex is reviewer/commenter only.

## Merge / synchronize
9. Owner approves merges unless authority is explicitly delegated. Protect the
   integration branch and require relevant checks where available; otherwise use
   documented manual review. Proposed merge policy: squash bounded PRs, owner to confirm.
10. Check latest integration baseline/dependencies; evidence must apply to the
    candidate being merged, not an old revision. Confirm PR merge succeeded.
11. Record the merged PR and release the claim in shared status. Merged code is not
    evidence of deployed code, applied migrations or released content.
12. Update each agent's own checkout. Use a fast-forward when possible; investigate
    divergence rather than forcing it. Repo/remote names must be verified first:
    this workspace has `github-backup`, not an assumed `origin`. Never print remote
    URLs because an authenticated URL can expose a credential.

## Cleanup
13. Inspect status, untracked files and local-only commits. Preserve unfinished work.
    Verify PR merge and dependent branches/worktrees/workflows before removing a
    completed branch/worktree. After squash merges, use actual PR merge evidence,
    not only Git ancestry, and inspect any post-PR commits.
14. Prune obsolete remote references only. No routine destructive reset, forced
    branch/worktree deletion or blanket untracked-file cleanup.
15. Finish on a known branch with a clean tree for the completed item and explicitly
    record retained branches/work. Unexpected dirty state requires coordination.

One agent integrates shared roadmap/status at a time; other agents contribute via
their PRs or the shared issue. Do not release a claim until the change is shared
and its integration state is clear.
