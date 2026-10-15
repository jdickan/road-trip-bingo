# App Store and Google Play policy fit for the v2 release model

Status: **assessment from general policy knowledge, 2026-10-15. Not verified against
current store text and not legal advice.** Re-read the live Apple App Review
Guidelines and Google Play Developer Policies before SUBMIT, and record the result in
`changes/`. Owner: Owner + game maintainer. Gate for: PRIVACY, REWRITE-GATE, SUBMIT.

## Bottom line

v2 is data-only content delivery from our own server, which both stores allow. The
risk is not the release mechanism; it is purchases, privacy disclosures, a possible
kids' audience, and server availability during review.

## Where v2 is fine

| Concern | Apple | Google Play |
| --- | --- | --- |
| Post-install content download | OK: 2.5.2 restricts downloaded *code* that changes functionality, not JSON word lists | OK: Device and Network Abuse restricts executable code (dex/native) from outside Play |
| Server-driven updates without a store release | OK for data; must not change the app's primary purpose | Same |
| No downloaded gameplay logic | Already a non-negotiable in `roadmap.md` (no executable downloads) | Same |

## Risks and required decisions

1. **Purchases/premium boards (highest risk).** Apple 3.1.1 requires in-app purchase
   to unlock features/content; do not steer users to external payment. Google requires
   Play Billing for digital goods (regional alternative-billing programs vary).
   *Gap:* the v2 API has no entitlement check, so premium bundles would be readable by
   anyone with the API key. Entitlement must be enforced server-side once a premium
   download policy exists (see `decisions.md`, "Premium access").
2. **Kids' audience.** Boards carry `ageLevels`. Apple Kids Category (1.3, 5.1.4) and
   Google Families policy restrict third-party analytics, ads and SDKs and data
   collection. Decide kids-category intent before the SDK/privacy audit; it gates what
   RevenueCat and any diagnostics may do.
3. **Privacy disclosures.** Apple nutrition labels/privacy manifest and Google Data
   Safety must match real behavior, including SDKs and logs. v2 collects no personal
   data itself. Disclose any sharing of personal data with third-party AI (Apple
   5.1.2(i)); the editor's OpenAI use is admin-side content, but the game's on-device
   AI claim is unverified (see `decisions.md`, "AI claims").
4. **Availability during review.** Reviewers test against production and reject (2.1)
   if content fails to load. Stable HTTPS API and monitoring (OPS) are effectively
   submission prerequisites. Ship starter bundles offline and explain server content in
   review notes.
5. **Wrapper risk.** A Capacitor app is not automatically rejected, but Apple 4.2
   (minimum functionality) and Google's minimum-functionality/spam policy apply.
   Offline play, purchases and persistence must give native-feeling value.
6. **Takedowns.** Both stores expect prompt removal of infringing/unsafe content. v2
   withdrawal cannot reach cached copies on offline devices; a rights/safety takedown
   may need a forced-update or binary path. Policy is still open (`decisions.md`,
   "Download/takedown policy").

## Technical hygiene

- HTTPS only (iOS ATS; Android blocks cleartext by default).
- `X-API-Key` ships in the app: it is abuse friction, not authorization. Do not rely on
  it to protect premium content.
- Android: confirm target API level and signing against current Play requirements.

## Recommended order

1. Decide the kids-category question.
2. Write the server-enforced entitlement/download policy.
3. Run the read-only SDK/data-practice/purchase audit of `road-trip-bingo-adventure`.
4. Draft review notes: content is data-only, server-delivered, non-executable.
