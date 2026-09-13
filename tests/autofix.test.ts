import { test } from "node:test";
import assert from "node:assert/strict";
import { getAutoFixes, applyAutoFix, applyAllAutoFixes, validateMarkdown } from "../src/index.js";

const NOTE = (body: string) => `# Title\n\nOverview.\n\n## Section\n\n${body}\n`;

test("a bare fence is labelled text", () => {
  const md = NOTE("```\nsome code\n```");
  const fixes = getAutoFixes(md);
  assert.equal(fixes.length, 1);
  assert.equal(fixes[0].kind, "code-fence-language");
  assert.equal(applyAutoFix(md, fixes[0]).includes("```text"), true);
  assert.equal(validateMarkdown(applyAutoFix(md, fixes[0])).ok, true);
});

test("a labelled fence is left alone", () => {
  assert.deepEqual(getAutoFixes(NOTE("```sql\nSELECT 1;\n```")), []);
});

test("a closing fence is never mistaken for an unlabelled opening one", () => {
  const md = NOTE("```sql\nSELECT 1;\n```");
  assert.deepEqual(getAutoFixes(md), []);
});

test("headings deeper than six clamp to six", () => {
  const md = NOTE("####### Too deep");
  const fixes = getAutoFixes(md);
  assert.equal(fixes[0].kind, "heading-too-deep");
  assert.match(applyAutoFix(md, fixes[0]), /^###### Too deep$/m);
  assert.equal(validateMarkdown(applyAutoFix(md, fixes[0])).ok, true);
});

test("a second level-1 heading is demoted, the first is kept as the title", () => {
  const md = "# Title\n\nOverview.\n\n## Section\n\nBody.\n\n# Another\n\nMore.\n";
  const fixes = getAutoFixes(md);
  assert.equal(fixes.length, 1);
  assert.equal(fixes[0].kind, "extra-title");
  const fixed = applyAutoFix(md, fixes[0]);
  assert.match(fixed, /^# Title$/m);
  assert.match(fixed, /^## Another$/m);
  assert.equal(validateMarkdown(fixed).ok, true);
});

test("content inside a code block is never treated as markup", () => {
  // A hash run and a lone '#' inside code are code, not headings.
  const md = NOTE("```text\n####### not a heading\n# also not a title\n```");
  assert.deepEqual(getAutoFixes(md), []);
});

test("structural gaps are deliberately not auto-fixable", () => {
  // No title, no preamble, no section — nothing in the document to derive
  // them from, so the validator reports and the author decides.
  const md = "Just a paragraph.\n";
  assert.deepEqual(getAutoFixes(md), []);
  assert.equal(validateMarkdown(md).ok, false);
});

test("applying every fix at once repairs a document with several problems", () => {
  const md = "# Title\n\nOverview.\n\n## Section\n\n```\ncode\n```\n\n####### Deep\n\n# Second title\n";
  assert.equal(getAutoFixes(md).length, 3);
  const fixed = applyAllAutoFixes(md);
  assert.equal(getAutoFixes(fixed).length, 0);
  assert.equal(validateMarkdown(fixed).ok, true, validateMarkdown(fixed).errors.join(" | "));
});

test("a fix rewrites only its own line", () => {
  const md = NOTE("```\ncode\n```");
  const fixes = getAutoFixes(md);
  const before = md.split("\n");
  const after = applyAutoFix(md, fixes[0]).split("\n");
  assert.equal(before.length, after.length);
  const changed = before.filter((line, i) => line !== after[i]);
  assert.equal(changed.length, 1);
});
