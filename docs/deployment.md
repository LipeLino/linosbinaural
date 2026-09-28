# Deployment and rollback

## Current production

- Canonical: https://www.mateuslino.com/builds/linosbinaural/
- Fallback: https://linosbinaural.vercel.app/builds/linosbinaural/
- Vercel project: `linosbinaural` (`prj_liuMNThmasPtVpMmKNCYQXfTCfBY`)
- Production deployment: `dpl_7edQPBX5pyJkm9TvWdcXtZpePuwu`
- Portfolio route: `/builds/linosbinaural/(.*)$` rewrites to `https://linosbinaural.vercel.app/builds/linosbinaural/$1`
- Canonical redirect: `/builds/linosbinaural` redirects to `/builds/linosbinaural/` with 307

The source checkout is `C:\dev\projects\linosbinaural`. The portfolio source checkout is not modified for this integration; project-level Vercel routing owns the mount.

## Build and deploy

```powershell
$env:NEXT_PUBLIC_APP_ENV='production'
$env:NEXT_PUBLIC_GUEST_ONLY='true'
$env:NEXT_PUBLIC_ADS_ENABLED='false'
$env:NEXT_PUBLIC_CHECKOUT_ENABLED='false'
pnpm.cmd install --frozen-lockfile
pnpm.cmd test
pnpm.cmd build
pnpm.cmd check:secrets
pnpm.cmd audit --prod --audit-level=low
vercel.cmd deploy --prod --yes --scope lipelinos-projects `
  --build-env NEXT_PUBLIC_APP_ENV=production `
  --build-env NEXT_PUBLIC_GUEST_ONLY=true `
  --build-env NEXT_PUBLIC_ADS_ENABLED=false `
  --build-env NEXT_PUBLIC_CHECKOUT_ENABLED=false
```

`pnpm-workspace.yaml` grants install-script permission only to the exact locked `esbuild` and `workerd` versions. Review and repin those entries whenever either dependency changes.

After deployment, run:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://www.mateuslino.com'
pnpm.cmd exec playwright test tests/e2e/guest.spec.ts tests/e2e/room-guide.spec.ts
$env:CHECK_ORIGIN='https://www.mateuslino.com'
node scripts/visual-check.mjs
node scripts/live-release-check.mjs
```

The live checker verifies the canonical and fallback pages, deep links, slash and apex redirects, response headers, absence of third-party requests, and continued health of the portfolio root and Veranila route.

## Rollback

For an app regression, promote the last known-good deployment in the `linosbinaural` project. For a routing regression, restore the previous portfolio route version with `vercel routes restore <version-id>`, then rerun `scripts/live-release-check.mjs`.

Do not remove or reorder the Veranila rules during a Lino rollback. If the independent project is unavailable, disable or remove only the two Lino routes to return the subpath to the portfolio's normal 404 behavior.

## Commercial hosting constraint

The deployment currently reports plan `hobby`. Vercel limits Hobby to personal, non-commercial use. Upgrade the team or move both the canonical routing layer and app origin to commercially permitted hosting before enabling tips, sponsorships, or ad networks.
