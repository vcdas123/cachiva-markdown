import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_FENCE_ERROR, PREAMBLE_ERROR, getMarkdownDiagnostics, EXAMPLE_MARKDOWN } from "../src/index.js";

test("the reference example note has no diagnostics", () => {
  assert.deepEqual(getMarkdownDiagnostics(EXAMPLE_MARKDOWN), []);
});

test("anchors a missing-language code fence error to its actual line, not line 1", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\ntext\n\n```\nno language here\n```\n";
  const diagnostics = getMarkdownDiagnostics(raw);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].severity, "error");
  assert.equal(diagnostics[0].line, 9); // the ``` opening fence line
  assert.equal(diagnostics[0].message, CODE_FENCE_ERROR);
});

test("anchors a manual Table of Contents warning to its actual line", () => {
  const raw = "# Title\n\nA short overview.\n\n## Table of Contents\n\n- link\n\n## Section\n\ntext\n";
  const diagnostics = getMarkdownDiagnostics(raw);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 5);
});

test("missing title and missing section are both anchored near line 1, not to unrelated content", () => {
  const raw = "Just a paragraph, no headings at all.\n\nMore text here.\n";
  const diagnostics = getMarkdownDiagnostics(raw);
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics.every((d) => d.severity === "error" && d.line === 1));
});

test("extra level-1 headings are anchored to the extra heading lines", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\ncontent\n\n# Another Title\n\n# Third Title\n";
  const diagnostics = getMarkdownDiagnostics(raw);
  assert.deepEqual(
    diagnostics.filter((d) => d.message.includes("Only one level-1")).map((d) => d.line),
    [9, 11],
  );
});

test("level-1-looking text inside fenced code has no diagnostic", () => {
  const raw = "# Title\n\nA short overview.\n\n## Section\n\n```md\n# Example inside code\n```\n";
  assert.deepEqual(getMarkdownDiagnostics(raw), []);
});

test("anchors a missing preamble error to the first section", () => {
  const diagnostics = getMarkdownDiagnostics("# Title\n\n## Section\n\nContent.\n");
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message === PREAMBLE_ERROR && diagnostic.line === 3));
});

test("an empty note is a single error on line 1", () => {
  assert.deepEqual(getMarkdownDiagnostics("   \n\n "), [
    { message: "The note is empty.", severity: "error", line: 1 },
  ]);
});
