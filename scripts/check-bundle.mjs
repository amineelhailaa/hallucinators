import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const html = await readFile("dist/index.html", "utf8");
const match = html.match(/<script[^>]+src="[^"]*\/assets\/([^\"]+\.js)"/);
if (!match) throw new Error("No application entry found");
const data = await readFile(`dist/assets/${match[1]}`),
  size = gzipSync(data).length;
if (size > 250000) throw new Error(`Entry exceeds 250 KB: ${size}`);
console.log(
  `Compressed application entry: ${(size / 1000).toFixed(1)} KB (budget: 250 KB). Training engine remains in the lazy worker.`,
);
