import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:5173/hallucinators/#/en");
await page.locator("h1").waitFor();
await page.screenshot({ path: "docs/screenshots/home.png", fullPage: true });
await page.goto("http://127.0.0.1:5173/hallucinators/#/en/labs/convolution");
await page.locator(".labBench").waitFor();
await page.screenshot({
  path: "docs/screenshots/convolution.png",
  fullPage: true,
});
await page.setViewportSize({ width: 360, height: 780 });
await page.goto("http://127.0.0.1:5173/hallucinators/#/ar");
await page.locator("h1").waitFor();
await page.screenshot({
  path: "docs/screenshots/arabic-mobile.png",
  fullPage: true,
});
await browser.close();
