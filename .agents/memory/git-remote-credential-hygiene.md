---
name: Git remote credential hygiene
description: Safely inspect authenticated Git remotes without exposing credentials.
---

Never print authenticated Git remote URLs. Inspect remote names only, and sanitize Git command errors before returning them.

**Why:** This project's GitHub backup remote contained an embedded access credential. Printing remote URLs exposed it in diagnostic output.

**How to apply:** Use remote-name, status, and history commands without printing remote configuration. Use the managed integration for API calls or a credential-free URL when reading the public repository. Do not reuse an exposed credential for a push; confirm it has been revoked or replaced.