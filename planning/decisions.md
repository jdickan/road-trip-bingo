# Decisions, deferred actions and blockers

| Topic | State / reason | Owner | Next action / revisit trigger |
| --- | --- | --- | --- |
| App identity and availability | Unknown actual App Store record/status, public/unlisted mode, territories and Apple notices; repository name differs from reported store name | Owner | Supply record/app ID, status and relevant notices (no credentials) before restoration/submission |
| Native baseline | Submitted Xcode project not located in inspected game source | Game maintainer | Locate archive/source and identify live binary before promising reproducible updates |
| Client implementation | Capacitor extension vs Rork SwiftUI unresolved; preserve existing game/platform/purchases | Owner + game maintainer | Compare audited feature parity, build reproducibility and maintainability before rewrite |
| Premium access | Existing one-time pack, not confirmed subscription; exact product/entitlement and downloadable-board mapping need audit | Owner + game maintainer | Verify purchase/restore and IDs before client/catalog entitlement rules |
| AI claims | Foundation Models not located in inspected source | Game maintainer | Identify other source/branch if present; otherwise do not invent or silently drop an assumed feature |
| API compatibility | v1 continues serving live working rows and legacy word-only checksum for existing clients. A new v2 API serves frozen approvals. Until every shipping app migrates to v2, editing master data can still affect v1 clients. | Replit + client owner | Verify all active binaries/API consumers, publish their required initial releases, then plan the owner-approved v1 cutover; never silently reinterpret checksum/cursor or imply old clients are protected |
| Download/takedown policy | Auto/manual, Wi-Fi, caps and exceptional rights/safety withdrawal not finalized | Owner + client maintainer | Decide before client UX/contract freeze; routine withdrawal preserves cached play |
| Hosting | Keep Replit baseline; Vercel compatibility unproven | Owner + Replit | Assess snapshot binaries/storage auth/DB/runtime/multi-instance limits before any migration |
| Release history backup/restore | Editor snapshots cover words and junctions, not the separate release-history tables. Approved snapshots remain immutable on master snapshot restore, but version/tombstone history needs an explicit full-database backup and recovery drill. | Owner + Replit | Add to launch operations/recovery rehearsal before production releases |
| Site ownership/audience | Existing ultttra.com pages known, source owner and exact desktop/audience targets unresolved | Owner + website maintainer | Locate existing source; avoid creating duplicate game/site |
| Git integration authority | GitHub main inspected unprotected; owner retains merge approval | Owner | Confirm protection/required CI and squash-merge policy; no agent merge without delegation |
| Baseline source synchronization | Local branches can contain commits not present on GitHub main; exact divergence must be checked immediately before publishing a PR | Replit + owner | Preserve original commit hashes, disclose the base and branch delta in PR, and use a non-forced branch update; never rewrite or merge main without owner approval |
| Apple signing/submission | Owner-controlled external actions | Owner | Perform after test/privacy/identity gates; no secrets through chat or repo |
| App Attest/DeviceCheck | Deferred: no demonstrated need for additional abuse controls | Owner + Replit | Revisit if actual abuse warrants complexity |

Resolved decisions should retain the reasoning and date, not disappear. New actions
belong here or in the roadmap with an owner and revisit trigger; do not hide them in chat.
