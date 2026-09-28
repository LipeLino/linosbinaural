import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const canonical = "https://www.mateuslino.com/builds/linosbinaural/";
const checks = [
  ["canonical", canonical],
  ["canonical-slash", canonical.slice(0, -1)],
  ["deep-link", canonical + "how-it-works/"],
  ["fallback", "https://linosbinaural.vercel.app/builds/linosbinaural/"],
  ["apex", "https://mateuslino.com/builds/linosbinaural/"],
  ["portfolio", "https://www.mateuslino.com/"],
  ["veranila", "https://www.mateuslino.com/builds/veranila/"],
];
const requiredHeaders = {
  "content-security-policy": [
    "default-src 'none'",
    "frame-ancestors 'none'",
    "script-src-attr 'none'",
    "object-src 'none'",
  ],
  "x-content-type-options": ["nosniff"],
  "x-frame-options": ["DENY"],
  "referrer-policy": ["no-referrer"],
  "permissions-policy": ["camera=()", "microphone=()", "payment=()"],
  "cross-origin-opener-policy": ["same-origin"],
  "cross-origin-resource-policy": ["same-origin"],
};

await mkdir("artifacts/final", { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
try {
  for (const [name, url] of checks) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const requests = [];
    const consoleErrors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const response = await page.goto(url, { waitUntil: "networkidle" });
    const headers = response?.headers() || {};
    const result = {
      name,
      requestedUrl: url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      title: await page.title(),
      consoleErrors,
      requestHosts: [...new Set(requests.map((item) => new URL(item).host))],
    };
    if (name === "canonical") {
      result.securityHeaders = Object.fromEntries(
        Object.keys(requiredHeaders).map((key) => [key, headers[key] || null]),
      );
      result.thirdPartyRequests = requests.filter((item) => {
        const host = new URL(item).host;
        return host !== "www.mateuslino.com";
      });
      await page.screenshot({
        path: "artifacts/final/live-home-1440.png",
        fullPage: true,
      });
      for (const [key, expectedParts] of Object.entries(requiredHeaders)) {
        const value = headers[key] || "";
        for (const part of expectedParts) {
          if (!value.includes(part))
            failures.push(`${name}: missing ${key} value ${part}`);
        }
      }
      if (result.thirdPartyRequests.length)
        failures.push(`${name}: unexpected third-party requests`);
    }
    if (result.status !== 200)
      failures.push(`${name}: expected 200, received ${result.status}`);
    if (consoleErrors.length)
      failures.push(`${name}: browser console errors`);
    results.push(result);
    await page.close();
  }
} finally {
  await browser.close();
}

const byName = Object.fromEntries(results.map((item) => [item.name, item]));
if (byName["canonical-slash"].finalUrl !== canonical)
  failures.push("canonical-slash: trailing slash redirect did not settle on canonical URL");
if (byName.apex.finalUrl !== canonical)
  failures.push("apex: apex domain did not settle on the www canonical URL");
if (!byName.fallback.title.includes("Lino"))
  failures.push("fallback: unexpected document title");
if (!byName.portfolio.title)
  failures.push("portfolio: empty document title");
if (!byName.veranila.title)
  failures.push("veranila: empty document title");

const report = {
  checkedAt: new Date().toISOString(),
  canonical,
  deploymentId: "dpl_7edQPBX5pyJkm9TvWdcXtZpePuwu",
  results,
  failures,
};
await writeFile(
  "artifacts/final/live-release.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
