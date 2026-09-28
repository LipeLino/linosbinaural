# Architecture

The shipped app is a static Next.js 16 App Router export with `basePath=/builds/linosbinaural`. Vercel project `linosbinaural` hosts the build. The portfolio project exposes it through an exact external rewrite and a bare-path trailing-slash redirect.

The client owns the active product behavior:

- Web Audio creates the two carrier tones and generated noise.
- Five self-hosted recordings load only when their layers are enabled.
- Local storage holds the guest draft and interface preferences.
- React state preserves playback during internal navigation.
- No service worker, server function, analytics SDK, ad SDK, account SDK session, or payment SDK participates in the guest release.

The canonical and fallback routes both apply CSP, MIME sniffing protection, framing denial, no-referrer, restrictive permissions, and cross-origin isolation headers. The portfolio-level rewrite repeats those headers because an external Vercel rewrite does not forward the upstream header set.

Supabase, account, sharing, report, entitlement, Stripe, and Cloudflare Worker source remains in the repository as dormant code. None of it is deployed by the current Vercel project. Enabling it would materially change the trust boundary and requires a separate threat model, secrets review, hosted integration tests, policy update, and production authorization.
