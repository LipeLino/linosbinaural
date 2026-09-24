# Lino’s Binaural

Build the attached product specification in this repository. English development/documentation; English and Brazilian Portuguese UI.

- Single Next.js App Router static frontend under `/linosbinaural`; one small Cloudflare Worker serves APIs and static assets. No paid resources without authorization. Never alter the portfolio or unrelated routes.
- Audio correctness first: centered carrier, strictly separate ears, conservative gain, explicit gestures, smooth changes, timeline-based timers, real output protection. Never make medical or guaranteed cognition claims.
- All listening free. Account-owned one-time ad-free purchase USD 5 / BRL 20. Entitlements come only from verified transactional server processing. Ads disabled without approved configuration and compliant consent.
- Private mixes by default; strict validation, RLS, safe public projection, revocable sharing, no shared caching of user responses. Never expose secrets.
- Root owns visual design, shared contracts, integration, package files and commits. At most two active workers. No recursive delegation. Workers edit only assigned paths.
- Keep `docs/progress.md`, `docs/evidence.md`, `docs/dev-to-do.md`, and `docs/launch-checklist.md` accurate. Distinguish implemented, locally verified, sandbox verified, live verified, and externally blocked.
- Run relevant tests, production build, browser checks and secret checks before coherent commits. Never invent test or deployment success.

Detailed decisions: `docs/product.md`, `docs/design.md`, `docs/architecture.md`, `docs/threat-model.md`. Original full brief: `docs/product-specification.txt`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
