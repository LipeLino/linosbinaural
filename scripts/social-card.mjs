import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const font = (
  await readFile(
    "node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-500-normal.woff2",
  )
).toString("base64");
const room = (await readFile("public/art/listening-room.svg")).toString(
  "base64",
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>@font-face{font-family:Pixel;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#20291f;color:#eadfc5;padding:44px 48px;font-family:Pixel,monospace}h1{font-size:64px;font-weight:500;margin:0}p{font:22px monospace;color:#b5b69b;margin:12px 0 28px}img{width:1104px;height:360px;object-fit:cover;object-position:bottom;image-rendering:pixelated;border:6px solid #79563e}</style><h1>Lino's Binaural</h1><p>Your woodland listening room. Free binaural beats & ambience.</p><img alt="" src="data:image/svg+xml;base64,${room}">`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/art/social.png" });
  const manifest = JSON.parse(
    await readFile("public/art/manifest.json", "utf8"),
  );
  if (!manifest.assets.includes("social.png"))
    manifest.assets.push("social.png");
  manifest.socialSource =
    "scripts/social-card.mjs; original room and OFL Pixelify Sans";
  await writeFile(
    "public/art/manifest.json",
    JSON.stringify(manifest, null, 2),
  );
} finally {
  await browser.close();
}
