# Repository guidance

- The current public product is a guest-only static Next.js app under `/builds/linosbinaural/`.
- Keep all listening free. Do not enable accounts, cloud saving, billing, tips, analytics, or ads without an explicit owner request and a new release review.
- Preserve the cautious evidence language. Frequency names describe audio settings and are not treatment or guaranteed-benefit claims.
- Preserve English and Brazilian Portuguese, keyboard access, reduced motion, responsive layouts, and the user-gesture audio boundary.
- Keep secrets out of client bundles and tracked files. Production builds use `NEXT_PUBLIC_GUEST_ONLY=true`, `NEXT_PUBLIC_ADS_ENABLED=false`, and `NEXT_PUBLIC_CHECKOUT_ENABLED=false`.
- The canonical app is routed by the portfolio Vercel project. Limit routing changes to this exact subpath and verify the portfolio root and Veranila after any route publication.
- The current Vercel Hobby deployment must remain non-commercial. Upgrade the team or move hosting before enabling tips or advertising.
- Treat Worker, Supabase, sharing, entitlement, and Stripe code as dormant legacy implementation. It needs a separate security and operational review before deployment.
