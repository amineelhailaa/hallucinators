import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const data = JSON.parse(await readFile("src/content/metadata.json", "utf8"));
assert.equal(data.chapters.length, 12);
assert.equal(data.lessons.length, 36);
const ids = new Set(data.lessons.map((l) => l.id));
assert.equal(ids.size, 36);
const expected = [
  'Section kind="explanation"',
  'Section kind="math"',
  'Section kind="code"',
  "<Formula",
  "<Check",
  "<LabLink",
  "```python",
  "https://keras.io",
  "https://en.d2l.ai",
];
for (const locale of ["en", "fr", "ar"]) {
  const files = await readdir(`src/content/${locale}`);
  assert.equal(files.filter((f) => f.endsWith(".mdx")).length, 36);
  for (const lesson of data.lessons) {
    assert(lesson.title[locale]);
    assert(lesson.summary[locale]);
    const body = await readFile(
      `src/content/${locale}/${lesson.id}.mdx`,
      "utf8",
    );
    for (const token of expected)
      assert(body.includes(token), `${locale}/${lesson.id}: missing ${token}`);
    assert(!/TODO|TBD|lorem ipsum/i.test(body));
    for (const match of body.matchAll(/#\/(en|fr|ar)\/course\/([a-z-]+)/g))
      assert(ids.has(match[2]), `Broken link: ${match[2]}`);
    for (const id of lesson.prerequisites) assert(ids.has(id));
  }
}
console.log(
  "Content verified: 12 chapters, 36 lessons, 108 localized MDX documents; all sections and links present.",
);
