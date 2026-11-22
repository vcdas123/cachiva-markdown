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

import { parseFlowBlock } from "../src/index.js";

test("flow: a chain becomes nodes and edges, null is a marker, options are read", () => {
  const { model, problems } = parseFlowBlock("direction: down\ncaption: A list\nHead -> 10 -> 20 -> null");
  assert.deepEqual(problems, []);
  assert.equal(model.direction, "down");
  assert.equal(model.caption, "A list");
  assert.deepEqual(model.nodes.map((n) => `${n.kind}:${n.label}`), ["box:Head", "box:10", "box:20", "null:null"]);
  assert.equal(model.edges.length, 3);
});

test("flow: labelled branches, decisions, terminals and shared nodes", () => {
  const { model, problems } = parseFlowBlock(
    ["(Start) -> count == 0?", "count == 0? -yes-> candidate = x", "count == 0? -no-> count--", "count-- -> (Done)", "candidate = x -> (Done)"].join("\n"),
  );
  assert.deepEqual(problems, []);
  const decision = model.nodes.find((n) => n.kind === "decision");
  assert.equal(decision?.label, "count == 0?");
  assert.equal(model.edges.filter((e) => e.from === decision?.id).map((e) => e.label).sort().join(","), "no,yes");
  assert.equal(model.nodes.filter((n) => n.label === "Done").length, 1);
  assert.equal(model.nodes.some((n) => n.label === "count--"), true);
});

test("flow: problems are reported and the block validates", () => {
  assert.equal(parseFlowBlock("").problems.length, 1);
  assert.equal(parseFlowBlock("A ->").problems.length, 1);
  assert.equal(parseFlowBlock("direction: sideways\nA -> B").problems.length, 1);
  assert.deepEqual(validateMarkdown(wrap("```flow\nA -> B\n```")).errors, []);
  assert.equal(getMarkdownDiagnostics(wrap("```flow\n\n```")).some((d) => d.severity === "error"), true);
});

test("flow: text with trailing dashes is not mistaken for an arrow", () => {
  const { model, problems } = parseFlowBlock("count-- -> next\nx -no-> count--\na->b");
  assert.deepEqual(problems, []);
  assert.equal(model.nodes.some((n) => n.label === "count--"), true);
  assert.equal(model.nodes.some((n) => n.label === "count-"), false);
  assert.equal(model.edges.find((e) => e.label === "no")?.to.endsWith("count--"), true);
  assert.equal(model.edges.length, 3);
});
