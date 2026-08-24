import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownSource, transformMarkdownTokens, EXAMPLE_MARKDOWN } from "../src/index.js";

test("parses the example markdown into title/preamble/sections/toc", () => {
  const source = parseMarkdownSource(EXAMPLE_MARKDOWN);
  const parsed = transformMarkdownTokens(source.tokens);

  assert.equal(parsed.title, "Docker Images");
  assert.ok(parsed.preamble.length > 0);
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].title, "1. What Is an Image?");
  assert.equal(parsed.sections[0].subsections[0].title, "1.1 Image vs Container");
  assert.deepEqual(
    parsed.toc.map((entry) => entry.title),
    ["1. What Is an Image?", "2. Building an Image"],
  );
});

test("a fenced code block keeps its declared language", () => {
  const source = parseMarkdownSource(EXAMPLE_MARKDOWN);
  const parsed = transformMarkdownTokens(source.tokens);
  const codeBlock = parsed.sections[1].blocks.find((b) => b.type === "code");
  assert.ok(codeBlock && codeBlock.type === "code");
  assert.equal(codeBlock.language, "dockerfile");
});

test("a Mermaid fence is preserved for visual rendering by the frontend", () => {
  const source = parseMarkdownSource(EXAMPLE_MARKDOWN);
  const parsed = transformMarkdownTokens(source.tokens);
  const diagram = parsed.sections[1].blocks.find(
    (block) =>
      block.type === "code" &&
      block.language === "mermaid" &&
      typeof block.value === "string",
  );

  assert.ok(diagram && diagram.type === "code" && typeof diagram.value === "string");
  assert.match(diagram.value, /^flowchart LR/);
});
