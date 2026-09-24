# Backend and account contract

The static Next.js application calls the same-origin Worker at `/linosbinaural/api`. `worker/api.ts` exports `handleApi(request, env)` for the integration Worker. Account calls send a Supabase Auth access token in the `Authorization: Bearer` header. The Worker calls Supabase Auth `/auth/v1/user` for each protected request, then forwards that token with the public project key to PostgREST, so row-level security remains the authorization boundary. The service-role key is used only for Auth admin account deletion and the payment-event transaction function. All API responses have `Cache-Control: no-store`.

`GET /mixes` returns 100 rows per offset page in deterministic update/id order; the browser client retrieves all pages for the current library UI. Account export reads all mix and purchase pages (500 rows each) and includes the account ID/email, public profile, saved mix definitions, and purchase summaries. The export is a sequential read, not a database snapshot if records change during download. Auth admin deletion cascades profiles, mixes, and entitlements; purchase transaction records remain with `user_id` set null for payment obligations, and the browser session is cleared after successful deletion.

`src/lib/auth.ts` uses the browser Supabase SDK with PKCE and a namespaced local-storage key. Its session is browser-readable, as required by this client flow; it is not an HttpOnly cookie. Redirects are fixed to the same-origin `/linosbinaural/account/` page. The production Supabase Auth URL allowlist must include this exact callback and trusted local/preview equivalents. Production email confirmation/recovery requires a configured delivery service and localized templates; Supabase's default email transport is not launch proof.

Protected routes: `GET/POST /mixes`, `GET/PATCH/DELETE /mixes/:id`, `POST /mixes/:id/duplicate|publish|unpublish`, `GET/PATCH/DELETE /account`, `GET /account/export`, `GET /entitlement`, `POST /checkout`, and `POST /checkout/reconcile`. Public routes: `GET /shared/:token` and `POST /reports`. Payment webhook: `POST /stripe/webhook`. Mix envelopes are `{title,description,mix}` and use `src/lib/mix.ts`. Public share tokens are random 192-bit values and unpublishing deletes the token. Shared reads use one SQL function projecting only title, description, mix, and optional display name. There is no direct anonymous `mixes` table read.

Worker variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_ORIGIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRODUCT_ID`, `STRIPE_PRICE_USD`, `STRIPE_PRICE_BRL`, `STRIPE_MODE=test|live`. The latter six are necessary only to enable purchases. The Cloudflare `RATE_LIMITER` native binding is required outside localhost and should be configured for 60 requests per 60 seconds; actor keys separate authenticated reads/writes and anonymous public reads/reports. Cloudflare's counters are approximate and local to each location, so this is abuse throttling, not payment accounting. Supabase Auth's own rate controls remain relevant. `PUBLIC_ORIGIN` must match the deployed scheme and host exactly; mutating browser requests with a missing or different Origin fail.

Stripe Checkout selects an allowlisted price. The Worker checks its live Stripe price details for the configured product, one-time type, currency, and exact minor units (USD 500 or BRL 2000) before creating the Checkout session. The return page must call `api.reconcileCheckout(sessionId)` and then `api.entitlement()`; the query string itself grants nothing. Webhooks verify the raw-body Stripe HMAC with a five-minute timestamp tolerance and re-fetch Checkout and line item details. SQL records event IDs and changes purchase status and entitlement in one transaction. Any refund, including a partial refund, revokes ad-free access; open disputes also revoke it. A won, non-refunded dispute may restore it. Historical Checkout sessions remain recoverable after a price is archived because reconciliation validates the app-bound session metadata and the purchased Stripe product, currency, one-time type, and amount rather than current price activity. Test and live purchases use separate environment rows and secret modes. Merchant/refund support policy and provider dashboard configuration require real account setup before live activation.

## Reproduce the isolated local Supabase stack

The local run used Supabase CLI **2.105.0** and Docker with `project_id = "linos-binaural"` in `supabase/config.toml`. Reserved ports are API 54331, database 54332, shadow database 54330, Studio 54333, and Mailpit 54334 (SMTP 54335, POP3 54336). From this repository root in PowerShell, after confirming those ports are free:

```powershell
supabase --version
supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor *> $null
if ($LASTEXITCODE -ne 0) { throw 'Local Supabase start failed; inspect Docker and reserved ports' }
supabase migration up --local
supabase migration list --local
```

The following fresh-checkout bootstrap writes local credentials **only** to ignored `.env.local` and `.dev.vars`. It refuses existing files and any Supabase API origin other than the reserved loopback port; it does not print secrets. Inspect existing files before replacing them. Never copy the local service-role key into a public `NEXT_PUBLIC_` variable.

```powershell
if ((Get-Content supabase/config.toml -Raw) -notmatch '(?m)^project_id = "linos-binaural"$') { throw 'Wrong local project' }
if ((Test-Path .env.local) -or (Test-Path .dev.vars)) { throw 'Local config already exists; inspect it first' }
$local = supabase status -o json | ConvertFrom-Json
if (([Uri]$local.API_URL).AbsoluteUri -ne 'http://127.0.0.1:54331/') { throw 'Unexpected Supabase API origin' }
$utf8 = [Text.UTF8Encoding]::new($false)
$front = @(
  "NEXT_PUBLIC_SUPABASE_URL=$($local.API_URL)",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($local.ANON_KEY)",
  'NEXT_PUBLIC_APP_ENV=development',
  'NEXT_PUBLIC_ADS_ENABLED=false'
)
$worker = @(
  "SUPABASE_URL=$($local.API_URL)",
  "SUPABASE_ANON_KEY=$($local.ANON_KEY)",
  "SUPABASE_SERVICE_ROLE_KEY=$($local.SERVICE_ROLE_KEY)",
  'PUBLIC_ORIGIN=http://127.0.0.1:8787',
  'STRIPE_MODE=test',
  'APP_ENV=development'
)
[IO.File]::WriteAllText((Join-Path $PWD.Path '.env.local'), (($front -join "`n") + "`n"), $utf8)
[IO.File]::WriteAllText((Join-Path $PWD.Path '.dev.vars'), (($worker -join "`n") + "`n"), $utf8)
```

Run `npx.cmd vitest run tests/backend/api.test.ts tests/backend/client-api.test.ts tests/backend/rls.test.ts`; for real local Auth/PostgREST checks, run `$env:LIVE_SUPABASE_LOCAL='1'; npx.cmd vitest run tests/backend/live-supabase.test.ts; Remove-Item Env:LIVE_SUPABASE_LOCAL`. The latter creates two unique local test users and removes them through local Auth admin in its cleanup. These commands do not use or modify any hosted Supabase project.

Local verification: `npx.cmd vitest run tests/backend/api.test.ts tests/backend/client-api.test.ts tests/backend/rls.test.ts` passed 16 tests, and `$env:LIVE_SUPABASE_LOCAL='1'; npx.cmd vitest run tests/backend/live-supabase.test.ts` passed 2 tests against this repository's isolated local Supabase at 127.0.0.1:54331. `npx.cmd tsc --noEmit` passed. The PGlite suite applies all three migrations with stubbed Supabase auth functions and proves direct SQL owner/publication/report and payment ordering semantics. The live local suite uses real Supabase Auth and PostgREST for anonymous, user A, user B, and service-role checks; it creates and removes its own confirmed test users. A real Stripe sandbox webhook, hosted Supabase setup, and email confirmation/recovery delivery remain separate unverified integrations.

Bilingual confirmation and recovery templates are versioned in `supabase/templates/`; `supabase/config.toml` applies them only to local CLI development. Hosted projects require copying their HTML and bilingual subjects into Supabase Auth Email Templates, configuring a production sender/SMTP service, setting the Site URL and exact callback allowlist, and testing both English and Portuguese. `signUp(email,password,locale)` stores the locale in user metadata; recovery reads that stored locale. No hosted template or SMTP installation is claimed.
