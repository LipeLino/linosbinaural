# Threat model

## Shipped scope

The public app is a static guest-only site under the shared `www.mateuslino.com` origin. It stores a draft mix and interface preferences in local storage. It does not hold credentials, account sessions, private cloud data, payment data, analytics identifiers, or advertising identifiers.

## Controls

- Audio starts only after a user gesture and no recording is requested before it is enabled.
- React renders owned strings and fixed data; the app does not inject user HTML.
- CSP denies all sources by default and allows only same-origin scripts, styles, fonts, images, audio, and workers. Frames, objects, script attributes, and form submissions are blocked.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, COOP, and CORP are verified on the canonical response.
- The production page made requests only to `www.mateuslino.com`; no analytics, ad, payment, or other third-party script ran.
- Exact routing rules limit the external rewrite to `/builds/linosbinaural/`.
- Dependencies are exactly locked. Only the exact locked `esbuild` and `workerd` packages may run install scripts.
- Secret scanning covers tracked candidate files; `.env.local`, `.dev.vars`, and `.vercel` remain ignored.

## Residual risks

- The static Next.js response currently needs `'unsafe-inline'` for hydration. Other CSP directives and React escaping reduce exposure, but this is weaker than a per-response nonce or a complete script hash policy.
- A path is not a browser security boundary. An origin-wide script injection in the portfolio could reach Lino's local storage. Keep the entire shared origin free of untrusted HTML and third-party script sprawl.
- Browser automation does not prove behavior on every physical device, assistive technology, headphone, or audio system.
- The dormant Worker, Supabase, sharing, report, entitlement, and Stripe paths have broader trust boundaries. They are not production-approved by this review.

No high or critical finding remained open after the canonical header remediation.
