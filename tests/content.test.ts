// @vitest-environment node
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import katex from "katex";
import i18n from "../src/i18n";
it("all mathematical expressions parse and every UI key is translated", () => {
  const records = JSON.parse(readFileSync("src/content/records.json", "utf8"));
  for (const r of records)
    expect(() =>
      katex.renderToString(r.formula, { throwOnError: true }),
    ).not.toThrow();
  const keys = Object.keys(i18n.getResourceBundle("en", "translation"));
  for (const lang of ["en", "fr", "ar"]) {
    const bundle = i18n.getResourceBundle(lang, "translation");
    expect(Object.keys(bundle).sort()).toEqual([...keys].sort());
    for (const key of keys)
      expect(bundle[key].trim().length).toBeGreaterThan(0);
  }
});
it("locale indexes contain valid links and English aliases", () => {
  const meta = JSON.parse(readFileSync("src/content/metadata.json", "utf8")),
    ids = new Set(meta.lessons.map((l: { id: string }) => l.id));
  for (const lang of ["en", "fr", "ar"]) {
    const docs = JSON.parse(
      readFileSync(`src/content/search-${lang}.json`, "utf8"),
    );
    expect(docs).toHaveLength(72);
    expect(new Set(docs.map((r: { id: string }) => r.id)).size).toBe(72);
    for (const doc of docs) {
      expect(ids.has(doc.lesson)).toBe(true);
      expect(doc.english.length).toBeGreaterThan(0);
    }
  }
});

it("every localized MDX equation parses, including optimizer details", () => {
  const meta = JSON.parse(readFileSync("src/content/metadata.json", "utf8"));
  for (const lang of ["en", "fr", "ar"])
    for (const lesson of meta.lessons) {
      const body = readFileSync(`src/content/${lang}/${lesson.id}.mdx`, "utf8");
      for (const match of body.matchAll(
        /<Formula value=\{("(?:[^"\\]|\\.)*")\}/g,
      )) {
        const formula = JSON.parse(match[1]);
        expect(() =>
          katex.renderToString(formula, { throwOnError: true }),
        ).not.toThrow();
      }
    }
});
