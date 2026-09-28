# Lino's Binaural

Lino's Binaural is a free bilingual listening room with browser-generated binaural tones, eight ambience layers, five gentle starting points, a session timer, original pixel companions Miso and Maple, and an evidence-aware frequency guide. The current release is guest-only: mixes stay on the device, listening requires a deliberate gesture, and no account, analytics, ad network, payment, or tip provider is connected.

**Live:** [mateuslino.com/builds/linosbinaural](https://www.mateuslino.com/builds/linosbinaural/)
**Fallback:** [linosbinaural.vercel.app](https://linosbinaural.vercel.app/builds/linosbinaural/)
**Production deployment:** `dpl_7edQPBX5pyJkm9TvWdcXtZpePuwu`

The app is a static Next.js export hosted as an independent Vercel project and mounted under the portfolio with two project-level routing rules. English and Brazilian Portuguese, day/night themes, reduced motion, keyboard operation, and responsive layouts are part of the shipped experience.

## Run locally

Use Node 24+ and the pinned pnpm 11.5.2. On Windows, use `pnpm.cmd` if PowerShell blocks the script shim.

```powershell
pnpm.cmd install --frozen-lockfile
$env:NEXT_PUBLIC_APP_ENV='production'
$env:NEXT_PUBLIC_GUEST_ONLY='true'
$env:NEXT_PUBLIC_ADS_ENABLED='false'
$env:NEXT_PUBLIC_CHECKOUT_ENABLED='false'
pnpm.cmd build
pnpm.cmd preview
```

Open `http://127.0.0.1:8787/builds/linosbinaural/`.

## Verify

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd check:secrets
pnpm.cmd audit --prod --audit-level=low
pnpm.cmd exec playwright test tests/e2e/guest.spec.ts tests/e2e/room-guide.spec.ts
node scripts/visual-check.mjs
node scripts/live-release-check.mjs
```

The optional Supabase tests remain local-only and are skipped unless explicitly enabled. The dormant Cloudflare Worker, Supabase, sharing, and Stripe code is retained for possible future work but is not part of this deployment.

## Release notes

- [Deployment and rollback](docs/deployment.md)
- [Security review](docs/security-review-2026-09-28.md)
- [Monetization options](docs/monetization-options.md)
- [Evidence and limitations](docs/evidence.md)
- [Audio design and licensing](docs/audio.md)

Tips and advertising remain future work. The current Vercel team is on Hobby, which Vercel limits to personal, non-commercial use. Upgrade to a commercial plan or move to a commercially permitted host before enabling either.

The code is delivered for the project owner; no public source-code license is granted by this repository. Asset-specific licenses remain as recorded.
