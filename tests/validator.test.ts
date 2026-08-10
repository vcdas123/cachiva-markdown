import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_FENCE_ERROR, HEADING_DEPTH_ERROR, PREAMBLE_ERROR, validateMarkdown, validateMarkdownSource, EXAMPLE_MARKDOWN } from "../src/index.js";

test("the reference example note is valid with no errors/warnings", () => {
  const result = validateMarkdown(EXAMPLE_MARKDOWN);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("an empty note is an error", () => {
  const result = validateMarkdown("   \n\n  ");
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["The note is empty."]);
});

test("missing title heading and missing section heading are both flagged", () => {
  const result = validateMarkdown("Just a paragraph, no headings at all.");
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("Must start with a level-1 title heading, e.g. '# My Title'."));
  assert.ok(result.errors.includes("Must contain at least one section heading, e.g. '## Section Title'."));
});

test("multiple level-1 headings are rejected", () => {
  const result = validateMarkdown("# Title\n\nA short overview.\n\n## Section\n\ncontent\n\n# Another Title\n\nmore content\n");
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("Only one level-1 title heading is allowed. Use ## through ###### for sections inside the note."));
});

test("hash headings inside fenced code blocks do not count as extra level-1 headings", () => {
  const result = validateMarkdown("# Title\n\nA short overview.\n\n## Section\n\n```md\n# Example inside code\n```\n");
  assert.equal(result.ok, true);
});

test("headings deeper than level 6 are rejected outside fenced code blocks", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\n####### Too deep\n";
  const result = validateMarkdown(raw);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes(HEADING_DEPTH_ERROR));
});

test("level-7-looking text inside fenced code blocks is allowed", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\n```md\n####### Example text\n```\n";
  assert.equal(validateMarkdown(raw).ok, true);
});

test("a fenced code block with no language is an error", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\n```\nno language\n```\n";
  const result = validateMarkdown(raw);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes(CODE_FENCE_ERROR));
  assert.deepEqual(result.warnings, []);
});

test("a manual Table of Contents / Navigation section is a warning", () => {
  const raw = "# Title\n\nA short overview.\n\n## Table of Contents\n\n- link\n\n## Section\n\ntext\n\n## Navigation\n\n[Next]\n";
  const result = validateMarkdownSource(raw, raw, []);
  assert.ok(result.warnings.some((w) => w.includes("Table of Contents")));
  assert.ok(result.warnings.some((w) => w.includes("Navigation")));
});

test("a preamble paragraph between the title and first section is required", () => {
  const result = validateMarkdown("# Title\n\n## Section\n\nContent.\n");
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes(PREAMBLE_ERROR));
});
