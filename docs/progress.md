# Progress

## Milestone: implemented; local acceptance and release handoff

- Branch: `main`; implementation milestone `8765ffa`. The following checkpoint records final artifacts and the verified visual dialog correction; use `git log -1 --oneline` for its final SHA. All files are project-owned; workspace was initially empty.
- Implemented: original responsive EN/PT day/night listening room, signal-tested Web Audio engine and licensed library, private/save/share/account APIs and UI, migrations/RLS, real Stripe integration, gated static sponsorship, safety/evidence/legal/support pages, production subpath Worker, CI/configuration/secret guards.
- Verified locally: production build; 27 unit/API/SQL tests; 2 opt-in real local Auth/PostgREST tests; 13 production guest browser tests; 16-state axe/layout sweep; three-rate signal checks and 60.18-second soak; dependency/secret checks and Worker dry bundle. See evidence.md for precision and limitations.
- Pending: exact account-browser test approval after automatic review rejection; then actual authenticated UI journey and saved-shelf screenshots. External hosted email/payments/routing/contact and human device listening are listed only in dev-to-do.md.
- Root owns architecture, art/UI, shared contracts, integration, packaging and commits. Workers `/root/audio_engine` and `/root/account_backend` used gpt-6-sol/high with non-overlapping scopes, no recursive delegation. Both bounded engineering tasks completed; account browser test never written/run due gate.
- Created resources: one isolated local Supabase Docker stack; no cloud or paid resources. Development/preview bound to localhost. No portfolio, DNS, existing DB, or remote Git changes.
- Consequential choices: single static Next frontend plus small Cloudflare Worker; no SSR framework runtime on edge. Direct self-hosted sponsorship, no advertising network scripts. Supabase browser PKCE/local-storage session, not HttpOnly. Fixed USD/BRL one-time prices; any refund revokes entitlement. Canonical URL unchanged.
- Repairs from evidence: direct report RPC cap, pgcrypto-independent publication token generation, library/export pagination, deleted-session cleanup, stale account response guards, save identity/description preservation, shelf refresh after save, focus trapping, Next Windows segment aliasing, CSP-safe Zod mode, mobile link label and day contrast.

## Next unlocked action

Implementation and local verification are checkpointed. Dialog-centering regression passed (1/1) and both affected axe states have zero violations. If the pending user approval arrives, run the exact local account-browser suite and repair any findings; otherwise retain it explicitly unverified. Authenticate/configure external services only after the precise access/capacity/identity/routing gates can be satisfied without paid commitments or unrelated-site disruption. Do not mark the full goal achieved while account-browser or live setup acceptance remains open.

Current local preview: http://127.0.0.1:8787/linosbinaural/ (localhost only). Supabase Docker stack remains available. No Git remote is configured.
