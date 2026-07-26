import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_FENCE_RULE,
  MARKDOWN_VALIDATION_NOTICE,
  SUPPORTED_BLOCKS,
  MARKDOWN_RULES,
  NOTE_FORMAT_GUIDE,
  createAnchorId,
} from "../src/index.js";

test("SUPPORTED_BLOCKS is the expected static list", () => {
  assert.deepEqual(SUPPORTED_BLOCKS, [
    "heading",
    "paragraph",
    "code",
    "table",
    "list",
    "blockquote",
    "image",
    "divider",
  ]);
});

test("MARKDOWN_RULES has the mandatory output contract and 8 format rules", () => {
  assert.equal(MARKDOWN_RULES.length, 9);
  assert.equal(MARKDOWN_RULES[0], MARKDOWN_VALIDATION_NOTICE);
});

test("NOTE_FORMAT_GUIDE composes its prompts with the example markdown embedded", () => {
  assert.ok(NOTE_FORMAT_GUIDE.ai_prompt.includes(NOTE_FORMAT_GUIDE.example_markdown));
  assert.ok(NOTE_FORMAT_GUIDE.restructure_prompt.includes(NOTE_FORMAT_GUIDE.example_markdown));
});

test("both AI prompts require typed code fences and define the text fallback", () => {
  assert.ok(MARKDOWN_RULES.includes(CODE_FENCE_RULE));
  for (const prompt of [NOTE_FORMAT_GUIDE.ai_prompt, NOTE_FORMAT_GUIDE.restructure_prompt]) {
    assert.ok(prompt.includes(MARKDOWN_VALIDATION_NOTICE));
    assert.ok(prompt.includes(CODE_FENCE_RULE));
    assert.match(prompt, /Output ONLY the complete .*\.md content/);
  }
});

test("createAnchorId lowercases, strips punctuation, and hyphenates", () => {
  assert.equal(createAnchorId("Docker Images!"), "docker-images");
  assert.equal(createAnchorId("  Multiple   Spaces  "), "multiple-spaces");
  assert.equal(createAnchorId("1.1 Image vs Container"), "11-image-vs-container");
});
