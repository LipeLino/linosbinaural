import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const origin = "http://127.0.0.1:8787",
  home = origin + "/linosbinaural/";
await mkdir("artifacts/final", { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [];
async function createPage(options) {
  const context = await browser.newContext(options);
  return context.newPage();
}
async function inspect(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `artifacts/final/${name}.png`,
    fullPage: true,
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    lang: document.documentElement.lang,
  }));
  reports.push({
    name,
    layout,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
try {
  for (const [width, locale, theme] of [
    [390, "en", "night"],
    [768, "pt", "day"],
    [1280, "en", "day"],
    [1440, "en", "night"],
  ]) {
    const page = await createPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(
      ({ locale, theme }) => {
        localStorage.setItem("linosbinaural:v1:locale", locale);
        localStorage.setItem("linosbinaural:v1:theme", theme);
      },
      { locale, theme },
    );
    await page.goto(home);
    await page.waitForTimeout(250);
    await inspect(page, `home-${width}-${locale}-${theme}`);
    await page.close();
  }
  const page = await createPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto(home);
  await page.getByRole("button", { name: "Save mix", exact: true }).click();
  await inspect(page, "save-dialog");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Privacy preferences", exact: true })
    .click();
  await inspect(page, "privacy-dialog");
  await page.keyboard.press("Escape");
  for (const [path, name] of [
    ["library/", "library-guest"],
    ["account/", "account"],
    ["shared/?token=invalid", "share-unavailable"],
    ["evidence/", "evidence"],
    ["ad-free/", "ad-free"],
    ["missing-page/", "not-found"],
  ]) {
    await page.goto(home + path);
    await page.waitForTimeout(200);
    await inspect(page, name);
  }
  await page.goto(home);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("linosbinaural:v1:draft"));
    d.title =
      "A long quiet evening beside the window, with rain and distant woodland sounds";
    d.selected = null;
    localStorage.setItem("linosbinaural:v1:draft", JSON.stringify(d));
  });
  await page.reload();
  await inspect(page, "long-title");
  await page.evaluate(() => {
    const el = document.createElement("aside");
    el.className = "ad-slot";
    el.setAttribute("aria-label", "Advertisement placement preview");
    el.innerHTML =
      '<span class="eyebrow">ADVERTISEMENT · LOCAL LAYOUT PREVIEW</span><p>No advertiser configured. No ad request sent.</p>';
    document.querySelector(".record-section").after(el);
  });
  await inspect(page, "sponsor-layout-preview");
  await page.context().setOffline(true);
  await inspect(page, "offline");
  await page.context().setOffline(false);
  // 1280px at 200% browser zoom has 640 CSS pixels of layout width.
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto(home);
  await inspect(page, "zoom-200-layout");
  await page.close();
  const perf = await createPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const cdp = await perf.context().newCDPSession(perf);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 80,
    downloadThroughput: 500000,
    uploadThroughput: 100000,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let jsBytes = 0,
    jsGzip = 0;
  const bodies = [];
  const requests = [];
  perf.on("response", (r) => {
    if (r.url().endsWith(".js"))
      bodies.push(
        r
          .body()
          .then((b) => {
            jsBytes += b.length;
            jsGzip += gzipSync(b).length;
          })
          .catch(() => {}),
      );
  });
  perf.on("request", (r) => requests.push(r.url()));
  await perf.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await perf.goto(home);
  await perf
    .getByRole("button", { name: "Play session", exact: true })
    .waitFor();
  await perf.waitForTimeout(1500);
  await Promise.all(bodies);
  const metrics = await perf.evaluate(() => ({
    lcpMs: window.__lcp,
    domContentLoadedMs:
      performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
  }));
  const performance = {
    ...metrics,
    jsBytes,
    jsGzip,
    requests: requests.length,
    audioRequestsBeforeGesture: requests.filter((x) =>
      /\/audio\/.*\.(mp3|wav|ogg)/.test(x),
    ).length,
    conditions:
      "Chromium, cold cache, 390x844, 4x CPU slowdown, 80ms latency, 500000 bytes/s download; local Worker, not field CWV.",
  };
  await writeFile(
    "artifacts/final/performance.json",
    JSON.stringify(performance, null, 2),
  );
  console.log(JSON.stringify(performance));
  if (jsGzip > 400 * 1024 || performance.audioRequestsBeforeGesture !== 0) {
    process.exitCode = 1;
    console.error("Initial JavaScript or pre-gesture audio budget exceeded.");
  }
  await perf.close();
} finally {
  await browser.close();
  await writeFile(
    "artifacts/final/accessibility.json",
    JSON.stringify(reports, null, 2),
  );
}
const failed = reports.filter(
  (r) => r.layout.scrollWidth > r.layout.width || r.violations.length,
);
console.log(JSON.stringify({ screens: reports.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
