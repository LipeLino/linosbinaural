# Launch checklist

Status: **not deployed; external and account-browser gates remain open.** This checklist never grants permission to spend, modify unrelated DNS/routes, or make a real payment.

- [x] Complete bilingual client, original artwork, real audio, account/sharing APIs, Stripe implementation and static sponsorship adapter.
- [x] Strict schema/RLS, owner isolation, public projection/revocation, payment event ordering, and direct report cap tests.
- [x] Local production build and integrated guest browser journey; no required asset, hydration or CSP error in the guest suite.
- [x] Signal-level audio tests and 60.18-second engine soak; human listening is separately unrun.
- [x] Local real Supabase Auth/PostgREST two-user/anon/service-role tests.
- [x] Production dependency audit, credential scanner, environment examples and launch guard.
- [x] Cloudflare dry bundle; subpath asset/CSP generation, rate binding and no-store boundaries.
- [ ] Account browser E2E: pending the exact automatic-review approval recorded in dev-to-do.md.
- [x] Final accessibility/layout report: 16 states, zero axe violations and no overflow; responsive home screenshots personally inspected. Saved authenticated shelf remains pending the account-browser gate.
- [ ] Human headphones and mobile hardware interruption/background audition.
- [ ] Dedicated hosted Supabase and confirmed EN/PT SMTP delivery/recovery.
- [ ] Real support URL, operator/report handling and retention decision.
- [ ] Stripe sandbox provider end-to-end, if enabling purchase; keep feature off otherwise.
- [ ] Optional sponsorship approved and consent/entitlement network gate tested with the actual creative; keep feature off otherwise.
- [ ] Verified Cloudflare account/zone/commercial terms and no paid commitment.
- [ ] Approved canonical-path DNS/routing integration and portfolio baseline/rollback.
- [ ] Production public configuration rebuild and matching securely installed Worker secrets; local build guard passes only in local mode.
- [ ] Deployment, actual edge CPU/resource measurements, live smoke check, unchanged portfolio routes, production callback/webhook paths.
- [ ] Root robots/sitemap integration and any root ads.txt only with parent-site authorization.

Current unresolved actions are detailed in [dev-to-do.md](dev-to-do.md). Run `pnpm deploy` only after the applicable gates are supported by current evidence. Free listening is never dependent on a payment, ad approval, or an LLM service.
