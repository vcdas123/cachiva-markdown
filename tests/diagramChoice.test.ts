import assert from "node:assert/strict";
import test from "node:test";
import { AI_PROMPT, DIAGRAM_CHOICE_RULES, DIAGRAM_CHOICE_SUMMARY, DIAGRAM_EXAMPLES, DIAGRAM_SPEC_TEXT, MARKDOWN_RULES, NOTE_FORMAT_GUIDE, RESTRUCTURE_PROMPT } from "../src/index.js";

test("the guide, the copied rules and both prompts give the same diagram advice", () => {
  assert.equal(NOTE_FORMAT_GUIDE.diagrams.choose_a_format, DIAGRAM_CHOICE_RULES);
  assert.ok(DIAGRAM_CHOICE_RULES[1].startsWith("flow FIRST"));
  for (const text of [MARKDOWN_RULES.join("\n"), AI_PROMPT, RESTRUCTURE_PROMPT]) {
    assert.ok(text.includes(DIAGRAM_CHOICE_SUMMARY), "summary present");
    assert.ok(text.includes(DIAGRAM_EXAMPLES.simple_flow), "ready-made flow example present");
    assert.ok(text.includes('"version":1'), "visual / sequence JSON spec present");
  }
});

test("the copyable spec carries the user-request escape hatch and the plain-chain rule", () => {
  assert.ok(DIAGRAM_SPEC_TEXT.includes("asks for a particular diagram format"));
  assert.ok(DIAGRAM_SPEC_TEXT.includes("Never use visual for a plain chain"));
});
