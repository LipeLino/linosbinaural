# Launch checklist

Status: **guest release deployed and live-verified on 2026-09-28.**

- [x] Production build uses guest-only, ads-off, and checkout-off flags.
- [x] Unit/backend tests: 34 passed; two opt-in local-live tests skipped.
- [x] Local guest/guide browser suite: 22/22 passed.
- [x] Public guest/guide browser suite: 22/22 passed.
- [x] Local and public visual/accessibility audits: 19 screens each, no failures.
- [x] Dependency audit: no known production vulnerabilities.
- [x] Secret scan: no recognized privileged credentials.
- [x] Canonical, deep link, bare-path redirect, apex redirect, and fallback verified.
- [x] CSP, nosniff, framing denial, referrer, permissions, COOP, and CORP headers verified on the canonical response.
- [x] No third-party requests, ad requests, checkout flow, analytics, or pre-gesture audio on the public Lino page.
- [x] Portfolio root and Veranila remained healthy after route publication.
- [x] Security review recorded in `security-review-2026-09-28.md`.

Before tips or ads:

- [ ] Upgrade from Vercel Hobby or migrate to commercially permitted hosting.
- [ ] Create and verify the chosen creator payment account personally.
- [ ] Add only an external tip link, then update Privacy and Support with the real provider.
- [ ] For ad networks, complete site approval, root `ads.txt`, consent/CMP, CSP, privacy, and visual review before loading any script.
