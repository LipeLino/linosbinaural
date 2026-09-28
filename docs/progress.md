# Progress

## 2026-09-28 production release

- Live at https://www.mateuslino.com/builds/linosbinaural/.
- Independent Vercel project deployed as `dpl_7edQPBX5pyJkm9TvWdcXtZpePuwu`.
- Guest-only release: accounts, billing, entitlement, analytics, ad networks, and tip providers are absent from the public experience.
- Added Miso and Maple, silent pet interactions, five intent-based starting mixes, an accessible first-use tour, motion controls, direct player guidance, and a bilingual frequency guide with careful evidence language.
- Local and public Playwright runs each passed 22/22 scenarios.
- Local and public visual audits each covered 19 states with no WCAG A/AA findings or horizontal overflow.
- Unit/backend suite passed 34 tests; two opt-in live-local Supabase tests remained skipped.
- Production dependency audit found no known vulnerabilities; repository secret scan passed.
- Live release check passed canonical, slash, apex, deep-link, fallback, portfolio, and Veranila checks with the required security headers and no third-party requests from Lino's page.

Future work is intentionally separate: create the external tip account, move to commercially permitted hosting, and later evaluate one subtle ad placement with consent and privacy updates. Hosted accounts and the legacy Stripe purchase model are not release goals.
