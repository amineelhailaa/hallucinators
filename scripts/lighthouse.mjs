import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  await mkdir("docs/performance", { recursive: true });
  for (const [name, path] of [
    ["home", "en"],
    ["reading", "en/course/flatten"],
  ]) {
    const result = await lighthouse(
      `http://127.0.0.1:4173/hallucinators/#/${path}`,
      {
        port: chrome.port,
        output: "json",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        onlyCategories: ["performance", "accessibility"],
        logLevel: "error",
      },
    );
    await writeFile(`docs/performance/${name}-desktop.json`, result.report);
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([k, v]) => [
        k,
        Math.round(v.score * 100),
      ]),
    );
    process.stdout.write(`${name}: ${JSON.stringify(scores)}\n`);
  }
} finally {
  await chrome.kill();
}
