# Architecture and decisions

## Selected deployment

Next.js App Router exports static public pages with basePath `/linosbinaural`. A small Cloudflare Worker owns `/linosbinaural/api/*`, security headers and the static asset binding. Supabase provides Auth and PostgreSQL. Stripe-hosted Checkout provides one-time purchases. The client Web Audio engine has no network dependency after its selected recordings are loaded.

This avoids shipping a server-rendered Next.js runtime into the Workers Free CPU/bundle envelope. It remains one application and one deployment, with no separate microservice or LLM runtime. Worker CPU, compressed size and route behavior must be measured before deployment. Free limits can constrain growth; no unlimited or perpetual-hosting promise.

The exact canonical path requires Cloudflare zone/routing access or a verified commercially permitted origin integration. No DNS or portfolio mutations are authorized until the account, plan and routing impact are verified. Vercel Hobby is not a commercial deployment destination.

## Runtime boundaries

- Public shell, legal/evidence pages and artwork: static, cached.
- Audio engine: independent of React, persistent root provider; no automatic playback.
- Auth: Supabase browser SDK, namespaced local session. Browser-readable session material is part of this model; we do not claim HttpOnly protection. Same-origin portfolio XSS remains a shared-origin risk.
- API: bearer authentication validated against Supabase; exact Origin checks for mutations, bounded payloads, validated schemas, no-store private/public-share results.
- Database: RLS for ordinary user operations; explicit safe public share projection; privileged operations narrowly scoped.
- Payments: trusted price configuration, raw-body signatures and transactional event/entitlement reconciliation.
- Ads: disabled by default and blocked until entitlement and approved consent are resolved.

## Environment isolation

Local and automated tests use isolated test data. Live payments and real ads never run during tests. Public Supabase configuration is distinct from privileged Worker secrets. No client source maps or public debug routes.
