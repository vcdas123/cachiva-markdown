import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractCachivaReferences,
  parseCachivaReferenceHref,
} from "../src/index.js";

test("parses a module reference href", () => {
  assert.deepEqual(parseCachivaReferenceHref("cachiva://module/mod_123"), {
    type: "module",
    moduleId: "mod_123",
  });
});

test("parses a note reference href", () => {
  assert.deepEqual(parseCachivaReferenceHref("cachiva://note/note_456"), {
    type: "note",
    noteId: "note_456",
  });
});

test("rejects group references, which are not a supported reference type", () => {
  assert.equal(parseCachivaReferenceHref("cachiva://group/grp_1"), null);
});

test("rejects malformed and non-Cachiva hrefs", () => {
  for (const href of [
    "cachiva://module/", // empty id
    "cachiva://note/", // empty id
    "cachiva://module", // no id segment at all
    "cachiva://", // nothing
    "cachiva://note/a/b", // extra path segment
    "cachiva://note/abc?x=1", // query string
    "cachiva://note/abc#frag", // fragment
    "cachiva://user/u_1", // unknown kind
    "https://example.com", // external
    "#section-anchor", // anchor
    "/module/mod_1", // relative app path
    "", // empty
  ]) {
    assert.equal(parseCachivaReferenceHref(href), null, `expected null for ${JSON.stringify(href)}`);
  }
});

test("extracts a single module reference from Markdown", () => {
  const { moduleIds, noteIds } = extractCachivaReferences(
    "See [Node.js Fundamentals](cachiva://module/mod_1) for context.",
  );
  assert.deepEqual(moduleIds, ["mod_1"]);
  assert.deepEqual(noteIds, []);
});

test("extracts a single note reference from Markdown", () => {
  const { moduleIds, noteIds } = extractCachivaReferences(
    "See [Event Loop Phases](cachiva://note/note_1).",
  );
  assert.deepEqual(moduleIds, []);
  assert.deepEqual(noteIds, ["note_1"]);
});

test("extracts mixed module and note references across block types", () => {
  const markdown = [
    "# Title",
    "",
    "Intro with [Module A](cachiva://module/mod_a).",
    "",
    "- list item linking [Note A](cachiva://note/note_a)",
    "",
    "> quote linking [Module B](cachiva://module/mod_b)",
    "",
    "| col |",
    "| --- |",
    "| [Note B](cachiva://note/note_b) |",
  ].join("\n");

  const { moduleIds, noteIds } = extractCachivaReferences(markdown);
  assert.deepEqual(moduleIds.sort(), ["mod_a", "mod_b"]);
  assert.deepEqual(noteIds.sort(), ["note_a", "note_b"]);
});

test("returns unique ids when the same reference appears more than once", () => {
  const markdown = [
    "[one](cachiva://module/mod_1)",
    "[again](cachiva://module/mod_1)",
    "[note](cachiva://note/note_1)",
    "[note again](cachiva://note/note_1)",
  ].join("\n\n");

  const { moduleIds, noteIds } = extractCachivaReferences(markdown);
  assert.deepEqual(moduleIds, ["mod_1"]);
  assert.deepEqual(noteIds, ["note_1"]);
});

test("ignores group references, external links, anchors and images", () => {
  const markdown = [
    "[group](cachiva://group/grp_1)",
    "[external](https://example.com/module/mod_x)",
    "[anchor](#1-what-is-an-image)",
    "![image](cachiva://module/mod_from_image)",
    "[real](cachiva://module/mod_keep)",
  ].join("\n\n");

  const { moduleIds, noteIds } = extractCachivaReferences(markdown);
  assert.deepEqual(moduleIds, ["mod_keep"]);
  assert.deepEqual(noteIds, []);
});

test("ignores references inside code, which are not links", () => {
  const markdown = [
    "Inline `[x](cachiva://module/mod_inline)` stays text.",
    "",
    "```md",
    "[y](cachiva://note/note_fenced)",
    "```",
  ].join("\n");

  assert.deepEqual(extractCachivaReferences(markdown), { moduleIds: [], noteIds: [] });
});

test("handles empty and whitespace-only input", () => {
  assert.deepEqual(extractCachivaReferences(""), { moduleIds: [], noteIds: [] });
  assert.deepEqual(extractCachivaReferences("   \n  "), { moduleIds: [], noteIds: [] });
});
