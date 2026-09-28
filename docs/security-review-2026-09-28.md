# Security review — 2026-09-28

## Scope

Reviewed the guest-only static release deployed as `dpl_7edQPBX5pyJkm9TvWdcXtZpePuwu` and served at https://www.mateuslino.com/builds/linosbinaural/. The dormant Cloudflare Worker, Supabase account stack, reports, public sharing, entitlement, and Stripe implementation were excluded because Vercel does not deploy them.

## Results

- `pnpm test`: 34 passed, 2 opt-in live-local tests skipped.
- Guest and room-guide browser suite: 22/22 passed locally and 22/22 passed on the public URL.
- Visual/accessibility review: 19 local and 19 public states; no WCAG A/AA Axe findings or horizontal overflow.
- `pnpm audit --prod --audit-level=low`: no known vulnerabilities.
- `pnpm check:secrets`: 271 candidate files checked; no recognized privileged credentials.
- Exact public-bundle scan found no Stripe Checkout, Google ad-network, purchase, or checkout call-to-action strings.
- The canonical page made no third-party requests and loaded no audio before a user gesture.
- Canonical, bare-path, apex, deep-link, fallback, portfolio-root, and Veranila route checks passed with no browser console errors.

## Finding and remediation

The first live check found that the portfolio's external Vercel rewrite did not forward the app project's security headers. Functionality was unaffected, but the canonical response lacked the intended policy. The exact Lino rewrite now sets CSP, nosniff, DENY framing, no-referrer, restrictive permissions, COOP, and CORP at the portfolio routing layer. A repeat live check passed every header assertion.

## Residual items

- **Low/medium:** CSP includes `'unsafe-inline'` for scripts and styles to support the static Next.js output. It still blocks external script origins, inline script attributes, frames, objects, forms, and all unlisted resource types. A future build pipeline could replace this with deployment-specific hashes or nonces.
- **Low:** The app shares an origin with the portfolio. Origin-wide XSS would cross the path boundary and could read guest preferences and draft data.
- **Operational:** The current Vercel Hobby plan is non-commercial. Tips or ads must wait for a plan upgrade or hosting migration.
- **Out of scope:** Account, sharing, report, and payment backend code needs a new review before any hosted activation.

No high or critical finding remains open for the deployed guest release.
