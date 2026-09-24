# Verification evidence

Recorded 2026-09-24. Implemented behavior and executed evidence are distinct. Full requirement mapping: [acceptance.md](acceptance.md).

## Executed

| Check                        | Actual result                                                                                          | Evidence                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Production build             | PASS: Next 16.3.6 static export, 13 routes, TypeScript, 14 HTML CSP entries                            | `pnpm build`, `artifacts/build-metadata.json`                                                     |
| Unit/API/embedded PostgreSQL | PASS: 27 tests across 5 files; 2 optional live tests skipped in default run                            | `pnpm test`; tests/audio, tests/unit, tests/backend                                               |
| Real isolated Supabase       | PASS: 2 opt-in tests using actual Auth/PostgREST, A/B/anon/service-role                                | `LIVE_SUPABASE_LOCAL=1 pnpm exec vitest run tests/backend/live-supabase.test.ts`; docs/backend.md |
| Production guest browser     | PASS: 13 Chromium tests                                                                                | `artifacts/playwright-results.json`                                                               |
| Accessibility/layout         | PASS: 16 states, zero reported axe violations and no horizontal page overflow                          | `artifacts/final/accessibility.json`, `scripts/visual-check.mjs`                                  |
| Audio signal/engine          | PASS at 44.1/48/96 kHz, bounded summing/worklet, fades, pause/resume, failure, cleanup                 | `scripts/audio-browser-check.mjs`, docs/audio.md                                                  |
| Audio soak                   | PASS: 60.18 seconds all eight ambience layers; cache three; stop cleared layers/cache/requests/context | docs/audio.md; this was not a hardware listening, CPU/battery or total-memory benchmark           |
| Asset integrity              | PASS: all five MP3 hashes/sizes match manifest; total 1,555,497 bytes                                  | public/audio/manifest.json, docs/audio.md                                                         |
| Production dependency audit  | PASS: zero info/low/moderate/high/critical advisories at audit time                                    | `artifacts/dependency-audit.json`                                                                 |
| Credential scan              | PASS: repository candidates and built subpath text scanned; no recognized privileged credentials       | `pnpm check:secrets`; no credential values logged                                                 |
| Environment guard            | PASS local; expected FAIL production with current localhost/missing configuration                      | `pnpm check:env`; `node scripts/check-env.mjs --production`                                       |
| Worker package               | PASS dry run: 804.94 KiB raw / 129.29 KiB gzip; 152 static files                                       | `artifacts/worker-dry-run.txt`; not a deployment                                                  |

Browser repair sequence: first pass 11/13, exposing native focus escape and Windows Next segment prefetch 404s. Explicit focus containment and flat static segment aliases repaired these. Next CSP pass exposed Zod's caught eval feature probe; `jitless` mode removed it without weakening CSP. Subsequent 13/13 passed. Axe identified one mobile link-name issue and day-theme contrast failures; the final 16-state run has no reported violations.

Final screenshots in `artifacts/final/`: four home widths, save/privacy dialogs, guest shelf/account, unavailable shared link, evidence and purchase pages, not-found, long local draft title, offline, 200%-equivalent layout, and a **local DOM-only sponsor placement preview**. The latter has no real advertiser/creative/request and proves layout only. Saved authenticated shelf screenshots are pending the blocked browser test. The root personally inspected the four responsive homepage compositions; additional state screenshots are retained for review.

## Measured performance and budgets

The cold mobile-style run uses Chromium at 390x844, disabled cache, 4x CPU slowdown, 80ms latency and 500,000 bytes/s network throughput against the local Worker. Latest recorded LCP 1,228 ms and DOMContentLoaded 3,135 ms; delivered JS 1,230,449 raw bytes / 339,861 bytes summed gzip estimate across loaded/prefetched JS; 37 requests; zero recording downloads before gesture. See `artifacts/final/performance.json`. These are synthetic local observations, not production Core Web Vitals. `performance.memory` returned a rounded 10,000,000-byte bucket; it is not a reliable process-memory measurement.

Budgets after the first measured production build: <=400 KiB summed gzip for initial/prefetched JS in this harness; <=160 KiB Worker gzip; <=1.7 MiB total curated compressed recordings; no eager recording load before a gesture. Decoded cache <=3 entries and 64 MiB, excluding active buffers/browser internals. Investigate regressions, do not raise budgets automatically. Edge CPU and free-tier throughput remain launch measurements; local request latency cannot certify them.

## Not executed / blocked

- Account browser registration/confirmation/recovery/save/share/export/delete suite: automatic approval review rejected the exact delegated test write and cleanup twice; explicit user approval pending. Existing direct API evidence does not close that journey.
- Hosted Supabase project/template/SMTP configuration, actual email delivery, real Stripe sandbox checkout/webhook/replay, cloud rate-limiter behavior, production deployment and canonical domain smoke checks.
- Human listening, cafe intelligibility, real headphone routing, screen-reader manual review, real mobile screen-lock/Bluetooth behavior, production metrics.
- Remote CI run or remote Git publication. Local workflow code is not CI success.

## Environment/resources

Empty repository at preflight. Windows, Node 26.3.0, pnpm 11.5.2, Git 2.54.0, Python 3.13.13, Supabase CLI 2.105.0. A dedicated **local** Docker Supabase project `linos-binaural` was created on ports 54331/54332/54334; three migrations applied. Ignored local keys were used without being committed. No hosted project, paid service, production account, or real charge/refund was created. Cloudflare unauthenticated; Vercel portfolio target verified read-only; Supabase organization/free-capacity ambiguity preserved existing projects.
