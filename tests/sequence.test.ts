import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEQUENCE_EXAMPLES,
  SEQUENCE_LIMITS,
  SEQUENCE_TEMPLATE,
  formatIssue,
  getMarkdownDiagnostics,
  parseSequenceBlock,
  validateMarkdown,
} from "../src/index.js";

const participants = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
const doc = (events: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ version: 1, participants, events, ...extra });
const msg = (from = "a", to = "b", label = "hi", kind?: string) => ({ type: "message", from, to, label, ...(kind ? { kind } : {}) });
const issuesOf = (source: string) => {
  const result = parseSequenceBlock(source);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map(formatIssue);
};
const group = (kind: string, branches: unknown[]) => ({ type: "group", kind, branches });
const branch = (...events: unknown[]) => ({ label: "branch", events });

test("every canonical sequence example and the editor template parse", () => {
  for (const source of [...Object.values(SEQUENCE_EXAMPLES), SEQUENCE_TEMPLATE]) {
    const result = parseSequenceBlock(source);
    assert.equal(result.ok, true, result.ok ? "" : result.issues.map(formatIssue).join("; "));
  }
});

test("messages of every kind, self-messages and notes are accepted", () => {
  const result = parseSequenceBlock(
    doc([msg(), msg("b", "a", "ok", "response"), msg("a", "b", "fire", "async"), msg("a", "a", "think"), { type: "note", over: ["a"], text: "n" }, { type: "note", over: ["a", "b"], text: "spans" }, { type: "divider", label: "later" }]),
  );
  assert.equal(result.ok, true);
});

test("participants: duplicates, bad ids, kinds and count are rejected", () => {
  const bad = (list: unknown[]) => issuesOf(JSON.stringify({ version: 1, participants: list, events: [msg()] }));
  assert.ok(bad([{ id: "a", label: "A" }, { id: "a", label: "A2" }]).some((m) => m.includes("already used")));
  assert.ok(bad([{ id: "1x", label: "A" }, { id: "b", label: "B" }]).some((m) => m.startsWith("participants[0].id")));
  assert.ok(bad([{ id: "a", label: "A", kind: "robot" }, { id: "b", label: "B" }]).some((m) => m.includes("kind")));
  assert.ok(bad([{ id: "a", label: "A" }]).some((m) => m.includes("at least 2")));
  assert.ok(bad(Array.from({ length: SEQUENCE_LIMITS.maxParticipants + 1 }, (_, i) => ({ id: `p${i}`, label: "P" }))).some((m) => m.includes("at most")));
});

test("references to unknown participants name the exact property", () => {
  assert.ok(issuesOf(doc([msg(), msg("a", "database")])).some((m) => m === 'events[1].to: references an unknown participant "database".'));
  assert.ok(issuesOf(doc([{ type: "note", over: ["zzz"], text: "x" }])).some((m) => m.includes("unknown participant")));
  assert.ok(issuesOf(doc([{ type: "activate", participant: "zzz" }])).some((m) => m.includes("unknown participant")));
});

test("unknown event types, message kinds and extra properties are rejected", () => {
  assert.ok(issuesOf(doc([{ type: "teleport" }])).some((m) => m.startsWith("events[0].type")));
  assert.ok(issuesOf(doc([msg("a", "b", "x", "shout")])).some((m) => m.startsWith("events[0].kind")));
  assert.ok(issuesOf(doc([{ ...msg(), x: 1 }])).some((m) => m.includes('unexpected property "x"')));
  assert.ok(issuesOf(doc([{ type: "note", over: ["a", "a"], text: "x" }])).some((m) => m.includes("two different")));
});

test("activation: balanced use is accepted, stray or unclosed use is an error", () => {
  assert.equal(parseSequenceBlock(doc([{ type: "activate", participant: "b" }, msg(), { type: "deactivate", participant: "b" }])).ok, true);
  assert.ok(issuesOf(doc([{ type: "deactivate", participant: "b" }])).some((m) => m.includes("no open activation")));
  assert.ok(issuesOf(doc([{ type: "activate", participant: "b" }, msg()])).some((m) => m.includes("never deactivated")));
});

test("activations inside group branches must balance within the branch", () => {
  const unbalanced = doc([group("alt", [branch({ type: "activate", participant: "b" }), branch(msg())])]);
  assert.ok(issuesOf(unbalanced).some((m) => m.includes("must balance")));
  const balanced = doc([group("alt", [branch({ type: "activate", participant: "b" }, msg(), { type: "deactivate", participant: "b" }), branch(msg())])]);
  assert.equal(parseSequenceBlock(balanced).ok, true);
  const closeOutside = doc([{ type: "activate", participant: "b" }, group("opt", [branch({ type: "deactivate", participant: "b" })]), { type: "deactivate", participant: "b" }]);
  assert.ok(issuesOf(closeOutside).some((m) => m.includes("must balance")));
});

test("group branch counts follow the group kind", () => {
  assert.ok(issuesOf(doc([group("alt", [branch(msg())])])).some((m) => m.includes("2 to 10")));
  assert.ok(issuesOf(doc([group("par", [branch(msg())])])).some((m) => m.includes("2 to 10")));
  assert.ok(issuesOf(doc([group("opt", [branch(msg()), branch(msg())])])).some((m) => m.includes("exactly one")));
  assert.ok(issuesOf(doc([group("loop", [])])).some((m) => m.includes("branches")));
  assert.ok(issuesOf(doc([group("maybe", [branch(msg())])])).some((m) => m.startsWith("events[0].kind")));
  assert.equal(parseSequenceBlock(doc([group("loop", [branch(msg())]), group("par", [branch(msg()), branch(msg())])])).ok, true);
});

test("nesting depth, total events and source limits hold", () => {
  let events: unknown[] = [msg()];
  for (let i = 0; i < SEQUENCE_LIMITS.maxGroupDepth + 1; i += 1) events = [group("opt", [branch(...events)])];
  assert.ok(issuesOf(doc(events)).some((m) => m.includes("nested up to")));
  assert.equal(parseSequenceBlock(doc((() => { let e: unknown[] = [msg()]; for (let i = 0; i < SEQUENCE_LIMITS.maxGroupDepth; i += 1) e = [group("opt", [branch(...e)])]; return e; })())).ok, true);

  assert.ok(issuesOf(doc(Array.from({ length: SEQUENCE_LIMITS.maxEvents + 1 }, () => msg()))).some((m) => m.includes("at most") || m.includes("up to")));
  assert.ok(issuesOf(doc([msg("a", "b", "x".repeat(SEQUENCE_LIMITS.maxLabelLength + 1))])).some((m) => m.includes("at most 500")));
});

test("versions, JSON errors and prototype-pollution keys", () => {
  assert.ok(issuesOf(doc([msg()]).replace('"version":1', '"version":3')).some((m) => m.includes("unsupported version 3")));
  assert.ok(issuesOf("{").some((m) => m.includes("not valid JSON")));
  assert.ok(issuesOf('{"version":1,"participants":[],"events":[],"__proto__":{"x":1}}').some((m) => m.includes("not allowed")));
});

test("markdown validation reports a bad sequence block on its fence line", () => {
  const md = `# Title\n\nOverview.\n\n## S\n\n\`\`\`sequence\n${doc([msg("a", "nobody")])}\n\`\`\`\n`;
  assert.equal(validateMarkdown(md).ok, false);
  const diagnostic = getMarkdownDiagnostics(md).find((d) => d.message.includes("sequence"));
  assert.equal(diagnostic?.line, 7);
  assert.ok(diagnostic?.message.includes("events[0].to"));
});
