import { readFile, readdir, writeFile } from "node:fs/promises";
const packages = [
  "react",
  "react-dom",
  "react-router",
  "motion",
  "i18next",
  "react-i18next",
  "katex",
  "minisearch",
  "d3-scale",
  "d3-shape",
  "@tensorflow/tfjs-core",
  "@tensorflow/tfjs-layers",
  "@tensorflow/tfjs-backend-cpu",
  "@fontsource/ibm-plex-sans",
  "@fontsource/ibm-plex-mono",
  "@fontsource/noto-sans-arabic",
  "@fontsource/press-start-2p",
];
const sections = [
  "Hallucinators third-party license notices\nProject source is MIT. Fonts retain their original licenses.",
];
for (const name of packages) {
  const path = `node_modules/${name}`,
    files = await readdir(path),
    license = files.find((f) => /^licen[sc]e|^ofl/i.test(f));
  if (license)
    sections.push(
      `\n${name}\n${"-".repeat(name.length)}\n${await readFile(`${path}/${license}`, "utf8")}`,
    );
}
await writeFile("public/THIRD_PARTY_NOTICES.txt", sections.join("\n"));
