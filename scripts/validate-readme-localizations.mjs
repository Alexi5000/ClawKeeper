import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const files = ["README.md", "docs/i18n/README.es-ES.md", "docs/i18n/README.zh-CN.md", "docs/i18n/README.pt-BR.md", "docs/i18n/README.ar.md", "docs/i18n/README.fr.md", "docs/i18n/README.ru.md"];
const anchors = ["agent-architecture", "what-clawkeeper-does", "what-clawkeeper-deliberately-does-not-do", "install", "usage-examples", "security-posture", "documentation"];
const tokens = ["v2.0.2", "npm run quality", "npm run fde:benchmark", "npm run proof:v2:validate", "src/openclaw/policy.ts", "CONTRIBUTORS.md", "assets/icon.png", "assets/cover.png"];
const matches = (text, pattern) => [...text.matchAll(pattern)];
const blocks = (text) => matches(text, /```[^\n]*\n[\s\S]*?```/g).map((match) => match[0]);
const englishBlocks = blocks(fs.readFileSync("README.md", "utf8"));

for (const filename of files) {
  const markdown = fs.readFileSync(filename, "utf8");
  const selector = markdown.split("\n").slice(0, 6).join("\n");
  const languageLinks = new Set(matches(selector, /\[[^\]]+\]\(([^)]*README(?:\.[^)]+)?\.md)\)/g).map((match) => path.resolve(path.dirname(filename), match[1])));
  const expectedLinks = new Set(files.filter((link) => link !== filename).map((link) => path.resolve(link)));
  assert.equal(matches(markdown, /^## /gm).length, 15, `${filename}: expected 15 H2 sections`);
  assert.equal(matches(markdown, /^### /gm).length, 7, `${filename}: expected 7 H3 sections`);
  assert.equal(blocks(markdown).length, englishBlocks.length, `${filename}: code-block count differs from English`);
  assert.deepEqual([...languageLinks].sort(), [...expectedLinks].sort(), `${filename}: language selector is incomplete`);
  for (const token of tokens) assert.ok(markdown.includes(token), `${filename}: missing ${token}`);
  if (filename !== "README.md") {
    assert.deepEqual(blocks(markdown), englishBlocks, `${filename}: executable examples differ from English`);
    for (const anchor of anchors) {
      assert.ok(markdown.includes(`<a id="${anchor}"></a>`), `${filename}: missing #${anchor}`);
      assert.ok(markdown.includes(`](#${anchor})`), `${filename}: TOC does not link to #${anchor}`);
    }
  }
  console.log(`PASS ${filename}`);
}
console.log("PASS all 6 localized README generation reviews");
