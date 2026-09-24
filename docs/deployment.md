# Deployment and rollback

## One architecture, fixed canonical path

Deploy the static `dist/linosbinaural` assets and `worker/index.ts` together to the **linos-binaural** Cloudflare Worker. Next.js uses `basePath=/linosbinaural` and trailing slashes. The Worker rejects other paths, applies per-page SHA-256 CSP hashes, and handles only the app API. No Next.js SSR runtime, proxy server, service worker, or LLM is needed.

`wrangler.jsonc` deliberately has no account ID or public route until the target is verified. `workers_dev=false`, preview URLs off, telemetry logging off. Never publish the present bundle: it contains the isolated local Supabase URL. `scripts/check-env.mjs --production` rejects it.

Read-only inventory on 2026-09-24: authenticated Vercel user `lipelino`, existing `portfolio` Next.js project in `lipelinos-projects`; commercial plan not verified. Apex nameservers are `ns1.dns-parking.com` / `ns2.dns-parking.com`. Wrangler is unauthenticated. No hosting, DNS, portfolio, or remote Git change was made.

Cloudflare's [pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [limits](https://developers.cloudflare.com/workers/platform/limits/) list Workers Free at 100,000 requests/day and 10 ms CPU per invocation. Network wait is not CPU; local wall-clock measurements do not prove edge CPU compliance. `run_worker_first=true` means even static requests traverse the Worker and must be counted in capacity planning. Free capacity can exhaust; no automatic paid upgrade is authorized. Cloudflare's commercial terms/account acceptance must be confirmed on the destination account. [Vercel terms](https://vercel.com/legal/terms) restrict Hobby to personal/non-commercial use; do not route the monetized app through Hobby to evade that restriction.

## Prepare services

1. Select an authorized Supabase organization with verified free project capacity. Create a dedicated project; never reuse `portfolio-prod` or another application's database. Apply the three timestamped migrations with `supabase db push` after linking that exact new project. Preserve rollback backups before subsequent schema changes. The first migration seeds the curated ambience metadata deterministically.
2. Set Auth Site URL to `https://mateuslino.com/linosbinaural/` and exact redirect allowlist `https://mateuslino.com/linosbinaural/account/`. Add only trusted localhost or access-protected test origins as needed. Install both versioned email templates and an authorized SMTP sender. Test EN/PT confirmation and recovery delivery before launch. Do not assume default Supabase email is production-ready.
3. Configure a real HTTPS support/contact path and an operator for abuse reports. The UI already renders its configured link and a working report form; no invented address is provided.
4. In Stripe **test mode**, create one product and fixed one-time prices USD 500 and BRL 2000. Configure the test secret, product/price IDs and endpoint signing secret. Send events to `/linosbinaural/api/stripe/webhook`: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, charge.refunded, charge.dispute.created, charge.dispute.closed. Follow backend.md for policy. Test both currencies, delayed/replayed webhooks, reconciliation, another signed-in session, refund/dispute ordering. No real charge/refund is authorized for acceptance. Repeat configuration with distinct live credentials only after merchant capabilities and external acceptance checks pass. Keep Checkout disabled until then.
5. Sponsorship can remain disabled at launch. Enabling requires an actual approved static creative in `public/sponsors`, rights/advertiser approval, destination HTTPS URL, and the configured public flags. Google/other ad networks are not implemented. Adding one requires its current consent requirements and CSP review; Google ads.txt belongs at the domain root and requires portfolio-owner coordination.

## Route without replacing the portfolio

The selected Worker architecture needs an authorized Cloudflare route on the existing hostname. Current DNS is outside Cloudflare. Do **not** change nameservers automatically. If the owner authorizes a Free Cloudflare zone migration, first export and reconcile every existing DNS record, mail/auth record, DNSSEC setting, TLS configuration, and the existing Vercel origin destination. Preserve the verified portfolio origin and all unrelated routes; keep mail records DNS-only. Confirm Full (strict) TLS works with that origin. This domain-wide integration needs human DNS access and explicit review.

After zone/account verification, add only these entries to Wrangler:

```json
"routes": [
  {"pattern":"mateuslino.com/linosbinaural","zone_name":"mateuslino.com"},
  {"pattern":"mateuslino.com/linosbinaural/*","zone_name":"mateuslino.com"}
]
```

Do not use `mateuslino.com/*`. Do not silently substitute a subdomain. If DNS migration is unsuitable, stop canonical publication; an alternative integration through the existing host must first prove commercial plan permission and routing/header/cache correctness. No such alternative has been installed.

## Build and release

1. Authenticate Wrangler to the verified account. Set `CLOUDFLARE_ACCOUNT_ID` securely; inspect `wrangler whoami`. Use only the free plan unless spending is separately approved.
2. Put production public configuration in ignored `.env.production.local`. Keep local/test settings out of it. Set the Worker non-secret vars `APP_ENV=production`, `PUBLIC_ORIGIN=https://mateuslino.com`, Supabase URL/public key, and explicit Stripe mode. Put service-role/Stripe/webhook secrets into `wrangler secret put NAME` via secure input, never on a command line. Use `wrangler secret list` only for names. Supply matching secure environment values to the release validator without printing them.
3. Stop local preview; `pnpm build`, `pnpm check:secrets`, `node scripts/check-env.mjs --production`, `pnpm deploy:dry`. Run acceptance against the configured protected test environment. Inspect `artifacts/build-metadata.json` and ensure no localhost origin or real ads in test screenshots. Preview noindex is not access control; protect any remote preview with Cloudflare Access.
4. Record current deployment version and baseline unrelated portfolio responses. Run `pnpm deploy` only when launch-checklist.md passes. Confirm Cloudflare account/route and output deployment version. No deployment was run during this build.
5. Verify bare path redirect, all deep links/404, font/art/audio/AudioWorklet URLs, API auth, confirmation/recovery callbacks, checkout returns/webhook, no-store account/shared responses, CSP hydration, no leaked maps/configuration, and unaffected portfolio pages. Check edge CPU/error metrics against free limits. Domain TLS/HTTPS redirect and HSTS need parent-site coordination; do not impose includeSubDomains from this app.
6. Submit `/linosbinaural/sitemap.xml` or minimally add that sitemap to the existing root robots.txt with owner approval. Do not replace root robots.txt or create a root-scoped service worker. Shared/account/library pages are noindex; shared social previews intentionally disclose no private title.

## Rollback and operation

Record a known-good Worker version before each release. Use `pnpm exec wrangler rollback VERSION_ID` after verifying the target worker. For first-launch failure, remove only the two app-specific routes, preserving the zone, DNS and portfolio origin. Do not drop databases or reverse transaction history. Code rollback must remain compatible with forward migrations.

For payment incidents, stop new checkout by removing configured current price IDs and disabling/rebuilding the checkout UI; preserve webhook and reconciliation processing for existing purchases. Reconcile confirmed payments by the authenticated endpoint, never by editing entitlement rows in a browser. Investigate with provider request/event IDs, not sensitive payload logs. Abuse reports are private operational records: review valid reports and revoke the affected mix publication through authorized administration, record the decision, and avoid exposing reporter details.

Retention must be confirmed by the operator before launch. Account deletion immediately removes app profile/mixes/entitlement; app purchase references retain a null user ID for transaction obligations. Stripe may retain its own records. Database backups expire on the configured provider policy; no unverified retention duration is promised. Export reads sequential pages and can reflect concurrent edits.
