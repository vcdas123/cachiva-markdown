import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractCachivaReferences,
  formatPracticeLine,
  getMarkdownDiagnostics,
  parseCachivaReferenceHref,
  parseMarkdownSource,
  parsePracticeBlock,
  parseTabsBlock,
  transformMarkdownTokens,
  validateMarkdown,
} from "../src/index.js";

const wrap = (body: string) => `# Title\n\nOverview paragraph.\n\n## Section\n\n${body}\n`;
const parse = (md: string) => transformMarkdownTokens(parseMarkdownSource(md).tokens);

test("a [!NOTE] blockquote becomes a callout with the marker removed", () => {
  const note = parse(wrap("> [!TIP]\n> Use a stack.\n> Second line."));
  const quote = note.sections[0].blocks[0] as { type: string; callout?: string; children: Array<{ type: string }> };
  assert.equal(quote.type, "blockquote");
  assert.equal(quote.callout, "TIP");
  assert.equal(quote.children.length, 1);
  assert.equal(JSON.stringify(quote.children[0]).includes("[!TIP]"), false);
});

test("every callout kind is recognised, case-insensitively; other quotes stay plain", () => {
  for (const kind of ["NOTE", "TIP", "IMPORTANT", "WARNING"]) {
    const quote = parse(wrap(`> [!${kind.toLowerCase()}]\n> Body`)).sections[0].blocks[0] as { callout?: string };
    assert.equal(quote.callout, kind);
  }
  const plain = parse(wrap("> [!DANGER]\n> Body")).sections[0].blocks[0] as { callout?: string };
  assert.equal(plain.callout, undefined);
  const normal = parse(wrap("> Just a quote")).sections[0].blocks[0] as { callout?: string };
  assert.equal(normal.callout, undefined);
});

test("study fences stay ordinary code blocks and validate", () => {
  const md = wrap(
    [
      "```tree\nA(B C)\ncaption: x\n```",
      "```array\nvalues: A B C\n```",
      "```formula\nT(n) = n\n```",
      "```tabs\n=== Java\nint x;\n=== Python\nx = 1\n```",
      "```mermaid\nflowchart LR\n  A --> B\n```",
      "```practice\n[Two Sum](cachiva://question/12)\ncachiva://question/34\n```",
    ].join("\n\n"),
  );
  assert.deepEqual(validateMarkdown(md).errors, []);
  const languages = (parse(md).sections[0].blocks as Array<{ type: string; language?: string }>).map((b) => b.language);
  assert.deepEqual(languages, ["tree", "array", "formula", "tabs", "mermaid", "practice"]);
});

test("empty study blocks, tabs without a header and bad practice lines are errors with line numbers", () => {
  assert.match(validateMarkdown(wrap("```tree\n\n```")).errors.join(" "), /`tree` block is empty/);
  assert.match(validateMarkdown(wrap("```tabs\nint x;\n```")).errors.join(" "), /=== Java/);
  const bad = wrap("```practice\n[Two Sum](cachiva://question/12)\nhttps://example.com\n```");
  assert.match(validateMarkdown(bad).errors.join(" "), /Line 2 of the block/);
  const diagnostics = getMarkdownDiagnostics(bad).filter((d) => /practice/.test(d.message));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 7);
});

test("parsePracticeBlock reads titled and bare references, de-duplicates and reports bad lines", () => {
  const block = parsePracticeBlock(
    "[Two Sum](cachiva://question/12)\n\ncachiva://question/34\n[Again](cachiva://question/12)\nnope\ncachiva://question/0\ncachiva://question/x",
  );
  assert.deepEqual(block.questionIds, [12, 34]);
  assert.deepEqual(block.invalidLines, [5, 6, 7]);
  assert.equal(formatPracticeLine(7, "A [b]"), "[A b](cachiva://question/7)");
  assert.equal(formatPracticeLine(7), "cachiva://question/7");
});

test("parseTabsBlock splits tabs on === headers", () => {
  assert.deepEqual(parseTabsBlock("=== Java\nint x;\nint y;\n=== C++\nint z;\n"), [
    { label: "Java", code: "int x;\nint y;" },
    { label: "C++", code: "int z;" },
  ]);
  assert.equal(parseTabsBlock("int x;"), null);
});

test("question references: href parsing and extraction from links and practice blocks", () => {
  assert.deepEqual(parseCachivaReferenceHref("cachiva://question/42"), { type: "question", questionId: 42 });
  for (const bad of ["cachiva://question/abc", "cachiva://question/0", "cachiva://question/1/2", "cachiva://question/"]) {
    assert.equal(parseCachivaReferenceHref(bad), null);
  }
  const refs = extractCachivaReferences(
    wrap("See [Q](cachiva://question/5) and [M](cachiva://module/m1).\n\n```practice\ncachiva://question/6\n[x](cachiva://question/5)\n```\n\n```text\ncachiva://question/99\n```"),
  );
  assert.deepEqual(refs.questionIds, [5, 6]);
  assert.deepEqual(refs.moduleIds, ["m1"]);
  assert.deepEqual(refs.noteIds, []);
});
