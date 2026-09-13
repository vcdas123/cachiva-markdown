import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCachivaMarkdown,
  resolveCodeFenceLanguage,
  toNoteAuthoringMode,
  isNoteAuthoringMode,
  DEFAULT_NOTE_AUTHORING_MODE,
  validateMarkdown,
} from "../src/index.js";

test("title becomes the single level-1 heading on the first line", () => {
  const md = buildCachivaMarkdown({
    title: "React Hooks",
    preamble: "Hooks let function components use state.",
    bodyMarkdown: "## State Hooks\n\nuseState stores local state.",
  });
  assert.equal(md.split("\n")[0], "# React Hooks");
  assert.equal(md.match(/^# /gm)?.length, 1);
});

test("preamble is serialized directly beneath the title", () => {
  const md = buildCachivaMarkdown({
    title: "Title",
    preamble: "The overview.",
    bodyMarkdown: "## Section\n\nBody.",
  });
  assert.match(md, /^# Title\n\nThe overview\.\n\n## Section\n/);
});

test("a multi-line title collapses to one line so it cannot become a stray paragraph", () => {
  const md = buildCachivaMarkdown({
    title: "  Multi\nline   title  ",
    preamble: "Overview.",
    bodyMarkdown: "## Section\n\nBody.",
  });
  assert.equal(md.split("\n")[0], "# Multi line title");
});

test("assembled output passes Cachiva validation", () => {
  const md = buildCachivaMarkdown({
    title: "React Hooks",
    preamble: "Hooks let function components use state.",
    bodyMarkdown: "## State Hooks\n\n`useState` stores local state.\n\n- `useState`\n- `useReducer`",
  });
  const result = validateMarkdown(md);
  assert.equal(result.ok, true, result.errors.join(" | "));
});

test("a body with no level-2 heading is rejected by the validator, not by the builder", () => {
  const md = buildCachivaMarkdown({
    title: "Title",
    preamble: "Overview.",
    bodyMarkdown: "Just a paragraph.",
  });
  const result = validateMarkdown(md);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("section heading")));
});

test("a missing preamble is rejected by the validator", () => {
  const md = buildCachivaMarkdown({ title: "Title", preamble: "", bodyMarkdown: "## Section\n\nBody." });
  const result = validateMarkdown(md);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.toLowerCase().includes("preamble")));
});

test("blank-line runs collapse and trailing spaces are stripped", () => {
  const md = buildCachivaMarkdown({
    title: "Title",
    preamble: "Overview.   ",
    bodyMarkdown: "## Section\n\n\n\nBody.   \n\n\n",
  });
  assert.match(md, /^# Title\n\nOverview\.\n\n## Section\n\nBody\.\n$/);
});

test("code fence language falls back to text when none is chosen", () => {
  assert.equal(resolveCodeFenceLanguage(undefined), "text");
  assert.equal(resolveCodeFenceLanguage(""), "text");
  assert.equal(resolveCodeFenceLanguage("   "), "text");
  assert.equal(resolveCodeFenceLanguage("JavaScript"), "javascript");
});

test("authoring mode narrows unknown and legacy values to markdown", () => {
  assert.equal(toNoteAuthoringMode("rich-text"), "rich-text");
  assert.equal(toNoteAuthoringMode("markdown"), "markdown");
  assert.equal(toNoteAuthoringMode(null), DEFAULT_NOTE_AUTHORING_MODE);
  assert.equal(toNoteAuthoringMode("html"), DEFAULT_NOTE_AUTHORING_MODE);
  assert.equal(isNoteAuthoringMode("rich-text"), true);
  assert.equal(isNoteAuthoringMode("rich_text"), false);
});
