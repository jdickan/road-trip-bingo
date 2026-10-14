# Decisions, deferred actions and blockers

| Topic | State / reason | Owner | Next action / revisit trigger |
| --- | --- | --- | --- |
| App identity and availability | Unknown actual App Store record/status, public/unlisted mode, territories and Apple notices; repository name differs from reported store name | Owner | Supply record/app ID, status and relevant notices (no credentials) before restoration/submission |
| Native baseline | Submitted Xcode project not located in inspected game source | Game maintainer | Locate archive/source and identify live binary before promising reproducible updates |
| Client implementation | Capacitor extension vs Rork SwiftUI unresolved; preserve existing game/platform/purchases | Owner + game maintainer | Compare audited feature parity, build reproducibility and maintainability before rewrite |
| Premium access | Existing one-time pack, not confirmed subscription; exact product/entitlement and downloadable-board mapping need audit | Owner + game maintainer | Verify purchase/restore and IDs before client/catalog entitlement rules |
| AI claims | Foundation Models not located in inspected source | Game maintainer | Identify other source/branch if present; otherwise do not invent or silently drop an assumed feature |
| API compatibility | v1 currently serves live working rows and legacy word-only checksum; approved snapshot contract may need v2 | Replit + client owner | Review versioned contract/fixtures before clients switch; never silently reinterpret checksum/cursor |
| Download/takedown policy | Auto/manual, Wi-Fi, caps and exceptional rights/safety withdrawal not finalized | Owner + client maintainer | Decide before client UX/contract freeze; routine withdrawal preserves cached play |
| Hosting | Keep Replit baseline; Vercel compatibility unproven | Owner + Replit | Assess snapshot binaries/storage auth/DB/runtime/multi-instance limits before any migration |
| Site ownership/audience | Existing ultttra.com pages known, source owner and exact desktop/audience targets unresolved | Owner + website maintainer | Locate existing source; avoid creating duplicate game/site |
| Git integration authority | GitHub main inspected unprotected; owner retains merge approval | Owner | Confirm protection/required CI and squash-merge policy; no agent merge without delegation |
| Baseline source synchronization | Local baseline has two existing commits above GitHub main, including attached planning reference | Replit + owner | Preserve history, disclose baseline delta in PR; never force main |
| Apple signing/submission | Owner-controlled external actions | Owner | Perform after test/privacy/identity gates; no secrets through chat or repo |
| App Attest/DeviceCheck | Deferred: no demonstrated need for additional abuse controls | Owner + Replit | Revisit if actual abuse warrants complexity |

Resolved decisions should retain the reasoning and date, not disappear. New actions
belong here or in the roadmap with an owner and revisit trigger; do not hide them in chat.
