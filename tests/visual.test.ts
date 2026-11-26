import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIAGRAM_MAX_SOURCE_BYTES,
  VISUAL_EXAMPLES,
  VISUAL_LIMITS,
  VISUAL_TEMPLATE,
  formatIssue,
  getMarkdownDiagnostics,
  parseVisualBlock,
  validateMarkdown,
} from "../src/index.js";

const doc = (root: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({ version: 1, root, ...extra });
const issuesOf = (source: string) => {
  const result = parseVisualBlock(source);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map(formatIssue);
};
const wrap = (body: string) => `# Title\n\nOverview paragraph.\n\n## Section\n\n\`\`\`visual\n${body}\n\`\`\`\n`;

test("every canonical visual example and the editor template parse", () => {
  for (const source of [...Object.values(VISUAL_EXAMPLES), VISUAL_TEMPLATE]) {
    const result = parseVisualBlock(source);
    assert.equal(result.ok, true, result.ok ? "" : result.issues.map(formatIssue).join("; "));
  }
});

test("every primitive is accepted", () => {
  const result = parseVisualBlock(
    doc({
      type: "container",
      title: "All",
      children: [
        { type: "row", children: [{ type: "text", text: "hi", strong: true }, { type: "badge", label: "new", tone: "success" }] },
        { type: "column", children: [{ type: "icon", icon: "database", label: "db" }, { type: "divider", label: "or" }] },
        { type: "grid", columns: 3, children: [{ type: "card", title: "a" }] },
        { type: "arrow", direction: "both", orientation: "vertical", label: "talks" },
        { type: "timeline", items: [{ title: "one", label: "1" }, { title: "two" }] },
      ],
    }),
  );
  assert.equal(result.ok, true);
});

test("nested layouts keep their structure", () => {
  const result = parseVisualBlock(doc({ type: "row", children: [{ type: "column", children: [{ type: "grid", columns: 2, children: [{ type: "card", title: "x" }] }] }] }));
  assert.ok(result.ok);
  if (result.ok && result.document.root.type === "row") assert.equal(result.document.root.children[0].type, "column");
});

test("invalid JSON, empty source and unknown versions are reported", () => {
  assert.match(issuesOf("{ nope")[0], /not valid JSON/);
  assert.match(issuesOf("   ")[0], /empty/);
  assert.match(issuesOf(doc({ type: "card", title: "x" }).replace('"version":1', '"version":2'))[0], /unsupported version 2/);
  assert.match(issuesOf(JSON.stringify({ root: { type: "card", title: "x" } }))[0], /"version" is required/);
});

test("unknown node types, enums, missing and unexpected properties name their path", () => {
  assert.ok(issuesOf(doc({ type: "carousel" })).some((m) => m.startsWith("root.type:")));
  assert.ok(issuesOf(doc({ type: "card" })).some((m) => m.startsWith("root.title: is required")));
  assert.ok(issuesOf(doc({ type: "card", title: "x", tone: "pink" })).some((m) => m.startsWith("root.tone:")));
  assert.ok(issuesOf(doc({ type: "card", title: "x", style: "color:red" })).some((m) => m.includes('unexpected property "style"')));
  assert.ok(issuesOf(doc({ type: "card", title: "x", icon: "../../etc" })).some((m) => m.startsWith("root.icon:")));
  assert.ok(issuesOf(doc({ type: "grid", columns: 9, children: [{ type: "card", title: "x" }] })).some((m) => m.startsWith("root.columns:")));
  assert.ok(issuesOf(doc({ type: "column", children: [] })).some((m) => m.startsWith("root.children:")));
});

test("duplicate ids are rejected", () => {
  const messages = issuesOf(doc({ type: "column", children: [{ type: "card", id: "a", title: "1" }, { type: "card", id: "a", title: "2" }] }));
  assert.ok(messages.some((m) => m.includes("already used")));
});

test("prototype-pollution keys and non-plain objects are rejected", () => {
  assert.ok(issuesOf('{"version":1,"root":{"type":"card","title":"x","__proto__":{"polluted":true}}}').some((m) => m.includes("not allowed")));
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.ok(issuesOf('{"version":1,"root":{"type":"card","title":"x","constructor":{}}}').some((m) => m.includes('"constructor"')));
});

test("depth, node count and source size limits hold", () => {
  let deep: unknown = { type: "card", title: "leaf" };
  for (let i = 0; i < VISUAL_LIMITS.maxDepth + 2; i += 1) deep = { type: "column", children: [deep] };
  assert.ok(issuesOf(doc(deep)).some((m) => m.includes("deeper than")));

  const many = { type: "column", children: Array.from({ length: 30 }, () => ({ type: "column", children: Array.from({ length: 10 }, () => ({ type: "card", title: "c" })) })) };
  assert.ok(issuesOf(doc(many)).some((m) => m.includes(`up to ${VISUAL_LIMITS.maxNodes} nodes`)));

  assert.ok(issuesOf(`{"version":1,"root":{"type":"card","title":"${"x".repeat(DIAGRAM_MAX_SOURCE_BYTES)}"}}`).some((m) => m.includes("KiB")));
  assert.ok(issuesOf(`${"[".repeat(500)}${"]".repeat(500)}`).some((m) => m.includes("nested too deeply")));
});

test("markdown validation and diagnostics report an invalid visual block with its path and fence line", () => {
  const md = wrap(doc({ type: "card" }));
  const result = validateMarkdown(md);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("Invalid `visual` block") && e.includes("root.title")));
  const diagnostic = getMarkdownDiagnostics(md).find((d) => d.message.includes("visual"));
  assert.equal(diagnostic?.line, 7);
  assert.equal(validateMarkdown(wrap(VISUAL_EXAMPLES.architecture)).ok, true);
});

test("the note-wide diagram budget is enforced", () => {
  const block = doc({ type: "column", children: Array.from({ length: 30 }, () => ({ type: "card", title: "c" })) });
  const md = `# Title\n\nOverview.\n\n## S\n\n${Array.from({ length: 40 }, () => `\`\`\`visual\n${block}\n\`\`\`\n`).join("\n")}`;
  const result = validateMarkdown(md);
  assert.ok(result.errors.some((e) => e.includes("in total")));
});
