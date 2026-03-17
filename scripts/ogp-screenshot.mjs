/**
 * scripts/ogp.html を 1200x630 でレンダリングし、public/ogp.png に保存する。
 * 実行: node scripts/ogp-screenshot.mjs
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(process.cwd());
const HTML_PATH = path.join(ROOT, "scripts", "ogp.html");
const OUT_PATH = path.join(ROOT, "public", "ogp.png");
const FILE_URL = pathToFileURL(HTML_PATH).href;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(FILE_URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: OUT_PATH, type: "png" });
  await browser.close();
  console.log("Saved:", OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
