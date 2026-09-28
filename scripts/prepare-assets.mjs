import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { readEnvironment } from "./environment.mjs";
const buildEnv = readEnvironment("production");
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/build-metadata.json",
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      appEnvironment: buildEnv.NEXT_PUBLIC_APP_ENV || "development",
      guestOnly: buildEnv.NEXT_PUBLIC_GUEST_ONLY === "true",
      supabaseOrigin:
        buildEnv.NEXT_PUBLIC_GUEST_ONLY === "true"
          ? null
          : buildEnv.NEXT_PUBLIC_SUPABASE_URL || null,
      adsEnabled: buildEnv.NEXT_PUBLIC_ADS_ENABLED === "true",
      checkoutEnabled: buildEnv.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
    },
    null,
    2,
  ),
);
const root = resolve("."),
  dest = resolve("dist");
if (dest !== join(root, "dist") || !dest.startsWith(root))
  throw new Error("Unsafe build destination");
await rm(dest, { recursive: true, force: true });
await mkdir("dist/builds/linosbinaural", { recursive: true });
await cp("out", "dist/builds/linosbinaural", { recursive: true, force: true });
const manifest = {};
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) await walk(full);
    else if (item.name.endsWith(".html")) {
      const html = await readFile(full, "utf8");
      const hashes = [];
      for (const match of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
      )) {
        if (!/\bsrc=/.test(match[1]) && match[2])
          hashes.push(
            "'sha256-" +
              createHash("sha256").update(match[2]).digest("base64") +
              "'",
          );
      }
      let path =
        "/builds/linosbinaural/" +
        relative("out", full).replaceAll("\\", "/");
      if (path.endsWith("index.html")) path = path.slice(0, -10);
      manifest[path] = [...new Set(hashes)];
    }
  }
}
await walk("out");
await writeFile("worker/csp.generated.json", JSON.stringify(manifest, null, 2));
console.log(
  "Prepared subpath assets and per-page CSP hashes for " +
    Object.keys(manifest).length +
    " pages.",
);
// Next 16.3 exports Windows segment paths with backslashes while the browser
// replaces forward slashes with dots. Materialize the documented client filename.
async function normalizeSegmentFiles(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) await normalizeSegmentFiles(full);
    else if (item.name.endsWith(".txt")) {
      const rel = relative("out", full).replaceAll("\\", "/");
      const start = rel.indexOf("__next.");
      if (start >= 0 && rel.slice(start).includes("/")) {
        const flat =
          rel.slice(0, start) + rel.slice(start).replaceAll("/", ".");
        await cp(full, join("dist/builds/linosbinaural", flat));
      }
    }
  }
}
await normalizeSegmentFiles("out");
