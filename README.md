# Lino's Binaural

An original woodland listening room: free binaural tones, eight ambience layers, private saved mixes, revocable sharing, and optional account-owned ad-free access. English and Brazilian Portuguese. Next.js static export + one Cloudflare Worker + Supabase + Stripe Checkout. No LLM service.

The listening cabinet now includes original pixel companions Miso and Maple, tactile controls, a choice of five listening intentions, an optional first-use tour, and a bilingual frequency field guide with research links and explicit evidence limits. Pet greetings are silent; room motion follows system preferences and can be paused separately from audio.

**Status:** implemented and locally verified; not deployed. The canonical target is `https://mateuslino.com/linosbinaural`. Cloud authentication/routing, hosted account/email setup, merchant setup, and an operational support contact remain external launch gates. Read [evidence](docs/evidence.md), [acceptance matrix](docs/acceptance.md), and [human-only blockers](docs/dev-to-do.md). Account browser E2E is separately awaiting automatic-review approval; API/RLS tests are not a substitute for it.

## Run locally

Use Node 24+ and the pinned pnpm 11.5.2. On Windows use `pnpm.cmd` if PowerShell blocks the script shim.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Open `http://127.0.0.1:8787/linosbinaural/`. Without account variables, guest listening works and account features clearly report unavailable. `pnpm dev` runs the frontend at localhost:3000, but the integrated API/CSP acceptance target is the production Worker on 8787. Stop the Worker before rebuilding on Windows so its asset handles do not lock `dist`.

For local accounts, start the isolated Supabase stack using [backend setup](docs/backend.md), apply its migrations, and copy `.env.example` to ignored `.env.local` and `.dev.vars.example` to ignored `.dev.vars`. Use only the stack's public URL/anon key in `.env.local`; the service-role key belongs only in `.dev.vars`. Keep `APP_ENV=development`, `PUBLIC_ORIGIN=http://127.0.0.1:8787`, and `STRIPE_MODE=test`. Rebuild after changing any `NEXT_PUBLIC_*` value. No production credentials or data belong in local tests.

## Verify

```sh
pnpm check:env
pnpm test
pnpm build
pnpm check:secrets
pnpm preview
# In another terminal, while the production preview is running:
pnpm test:e2e
node scripts/visual-check.mjs
node scripts/audio-browser-check.mjs --soak
pnpm deploy:dry
```

The audio harness runs its own isolated localhost fixture. The optional real-Supabase tests use `LIVE_SUPABASE_LOCAL=1`; see backend.md for Windows syntax. They are skipped by default. Tests use synthetic local data; never point them at production. `pnpm audit --prod` scans production dependencies. CI performs local tests/build/browser/dry-bundle checks with no deployment secrets; it has been authored, not remotely executed.

## Configuration and deployment

The public environment template documents build-time feature flags. Accounts use Supabase's browser PKCE flow and browser-readable, namespaced local storage; no HttpOnly claim. Ads and Checkout default off. The only implemented ad adapter is a manually approved, self-hosted sponsor image and HTTPS link, with no ad-network scripts or tracking. It requires production hostname, resolved non-entitlement, and an explicit allow preference. Tests and previews never make real ad requests.

Follow [deployment and rollback](docs/deployment.md) and [launch gates](docs/launch-checklist.md). `pnpm deploy` runs strict production configuration and credential scans before Wrangler. It intentionally fails against the current localhost configuration. Supply privileged variables securely to the process and Cloudflare secret store; never commit or print them. A successful dry run is a bundle check, not a cloud deployment or proof of free-tier CPU performance.

## Maintenance and assets

- Audio design, licenses, budgets, real signal tests and unrun listening checks: [audio.md](docs/audio.md), `public/audio/manifest.json`.
- Original pixel art: `scripts/generate-art.mjs`; social PNG: `node scripts/social-card.mjs`. Run both after changing artwork. `public/art/manifest.json` declares the original art CC0.
- Fonts are locally hosted and licensed under SIL OFL; copies are in `docs/licenses/`.
- Database changes are forward migrations. Apply tested additive migrations; never reset a hosted project to roll back code.
- Review dependencies and licenses before updates, rebuild CSP hashes with the app, rerun affected signal/security/browser tests, then release. Do not edit generated CSP hashes manually.
- Monitor provider errors and resource quotas after launch. Do not log auth headers, request bodies, payment secrets or unnecessary email addresses. See [threat model](docs/threat-model.md).

The code is delivered for the project owner; no public source-code license is granted by this repository. Asset-specific licenses remain as recorded. No paid service, remote repository, production user, or live charge was created during this build.
