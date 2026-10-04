---
name: Git remote credential hygiene
description: Safely inspect authenticated Git remotes without exposing credentials.
---

Never print authenticated Git remote URLs. Inspect remote names only, and sanitize Git command errors before returning them.

**Why:** This project's GitHub backup remote contained an embedded access credential. Printing remote URLs exposed it in diagnostic output.

**How to apply:** Use remote-name, status, and history commands without printing remote configuration. Use the managed integration for API calls or a credential-free URL when reading the public repository. Do not reuse an exposed credential for a push; confirm it has been revoked or replaced.

A successful read from a public repository does not validate the stored credential.

**Why:** Public Git reads can succeed without sending authentication, even when authenticated API requests fail.

**How to apply:** Do not infer token validity from public fetches or remote listings. Diagnose authorization through the supported managed connection, without reading credential values.

If command-line Git authorization remains unusable but the managed GitHub connection works, API-based synchronization must preserve the original object hashes and use a non-forced branch update.

**Why:** Reconnecting both the connector and Git provider did not repair this workspace's Git push authorization. The managed Git database API successfully reproduced original commits without copying credentials, so a fallback need not rewrite history.

**How to apply:** Verify uploaded blobs, trees, and commits against their original hashes, including author/committer dates and complete messages. Only advance the branch after the full parent chain is verified, with `force: false`; stop on any mismatch or divergent history.

Before using the managed API fallback, check whether outgoing history changes GitHub Actions workflows and whether the connection grants workflow write permission.

**Why:** This connector grants `repo` but not `workflow`. Importing ordinary history worked, but a tree containing a changed CI workflow returned 404 even though its base tree was accessible. Repeating connector reauthorization cannot add a scope absent from its declared scope sets.

**How to apply:** Do not omit workflow changes or bypass permission checks. Obtain supported authorization with the required permission first; any fallback credential must use the secure Secrets flow, never chat or an authenticated remote URL.