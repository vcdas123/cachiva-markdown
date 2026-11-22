// Study-note blocks: the extra fenced block types and callouts carried by DSA study notes,
// now ordinary Cachiva notes. They are authored as normal Markdown and parsed into the
// existing block shapes (a fenced block stays `{ type: "code", language, value }`; a callout
// is a blockquote with an additive `callout` field), so older renderers keep working and
// simply show them as code / a plain blockquote.

/** Fence languages with a dedicated renderer in the reader. `mermaid` is listed in SUPPORTED_DIAGRAM_LANGUAGES. */
export const STUDY_BLOCK_LANGUAGES = ["tree", "array", "formula", "tabs", "practice", "flow"] as const;
export type StudyBlockLanguage = (typeof STUDY_BLOCK_LANGUAGES)[number];

/** `> [!NOTE]`-style callouts (GitHub alert syntax). */
export const CALLOUT_KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

export const PRACTICE_BLOCK_LANGUAGE = "practice";

// One question reference per line: `[Title](cachiva://question/42)` or bare `cachiva://question/42`.
// The title is only a display hint for people reading the raw Markdown; the ID is the reference.
const PRACTICE_LINE = /^(?:\[[^\]\n]*\]\(cachiva:\/\/question\/([1-9]\d{0,9})\)|cachiva:\/\/question\/([1-9]\d{0,9}))$/;

export type PracticeBlock = {
  /** Question IDs in order of appearance, de-duplicated. */
  questionIds: number[];
  /** 1-based line numbers (within the block) that are not a valid question reference. */
  invalidLines: number[];
};

/** Parses a ```practice block's body. Blank lines are ignored. Total and side-effect free. */
export function parsePracticeBlock(value: string): PracticeBlock {
  const questionIds: number[] = [];
  const invalidLines: number[] = [];
  const seen = new Set<number>();
  String(value ?? "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const text = line.trim();
      if (!text) return;
      const match = PRACTICE_LINE.exec(text);
      const id = match ? Number(match[1] ?? match[2]) : null;
      if (id === null) {
        invalidLines.push(index + 1);
      } else if (!seen.has(id)) {
        seen.add(id);
        questionIds.push(id);
      }
    });
  return { questionIds, invalidLines };
}

/** Formats a question reference line for a ```practice block (title is a display hint only). */
export function formatPracticeLine(questionId: number, title?: string): string {
  const hint = (title ?? "").replace(/[\[\]\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return hint ? `[${hint}](cachiva://question/${questionId})` : `cachiva://question/${questionId}`;
}

export type TabsBlockTab = { label: string; code: string };

/**
 * Splits a ```tabs block into tabs: each `=== Label` line starts a tab whose body runs to the
 * next header. Returns null when the block does not begin with a header.
 */
export function parseTabsBlock(value: string): TabsBlockTab[] | null {
  const lines = String(value ?? "").split(/\r?\n/);
  const firstIndex = lines.findIndex((line) => line.trim() !== "");
  if (firstIndex < 0 || !/^===\s*\S/.test(lines[firstIndex])) return null;
  const tabs: TabsBlockTab[] = [];
  for (const line of lines.slice(firstIndex)) {
    const header = /^===\s*(\S.*?)\s*$/.exec(line);
    if (header) tabs.push({ label: header[1], code: "" });
    else tabs[tabs.length - 1].code += (tabs[tabs.length - 1].code ? "\n" : "") + line;
  }
  return tabs.map((tab) => ({ label: tab.label, code: tab.code.replace(/\s+$/, "") }));
}

export type FlowNodeKind = "box" | "decision" | "terminal" | "null";
export type FlowNode = { id: string; label: string; kind: FlowNodeKind };
export type FlowEdge = { from: string; to: string; label: string | null };
export type FlowModel = {
  direction: "right" | "down";
  caption: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const FLOW_MAX_NODES = 40;

// `->` or a labelled arrow `-label->`. The label may hold spaces and common punctuation but never `-` or `>`,
// so node text such as `count--` or `a - b` is not mistaken for an arrow.
const FLOW_ARROW = /\s*(?:-([^->\n]+?)->|->)\s*/;

function flowNode(raw: string): { label: string; kind: FlowNodeKind } | null {
  const text = raw.trim();
  if (!text) return null;
  const terminal = /^\((.+)\)$/.exec(text);
  if (terminal) return { label: terminal[1].trim(), kind: "terminal" };
  const box = /^\[(.+)\]$/.exec(text);
  if (box) return { label: box[1].trim(), kind: "box" };
  if (/^null$/i.test(text)) return { label: "null", kind: "null" };
  if (text.endsWith("?")) return { label: text, kind: "decision" };
  return { label: text, kind: "box" };
}

/**
 * Parses a ```flow block into a small graph. Each non-option line is a chain of nodes joined by arrows:
 * `Head -> 10 -> 20 -> null`, or with labelled branches `count == 0? -yes-> candidate = x`. A node is
 * identified by its text, so the same text on two lines is the same node. Node text forms: `(Start)` a rounded
 * terminal, `text?` a decision, `null` a null marker, `[text]` or plain text a box. Option lines:
 * `direction: right|down` (default right; `lr` and `tb` also accepted) and `caption: text`.
 * Total and side-effect free; `problems` lists what is wrong (the model is still best effort).
 */
export function parseFlowBlock(value: string): { model: FlowModel; problems: string[] } {
  const problems: string[] = [];
  const model: FlowModel = { direction: "right", caption: null, nodes: [], edges: [] };
  const byId = new Map<string, FlowNode>();
  const ensure = (raw: string): string | null => {
    const parsed = flowNode(raw);
    if (!parsed) return null;
    const id = `${parsed.kind}:${parsed.label}`;
    // The same visible text is one node, whichever form it was written in.
    const existing = [...byId.values()].find((node) => node.label === parsed.label);
    if (existing) return existing.id;
    const node: FlowNode = { id, label: parsed.label, kind: parsed.kind };
    byId.set(id, node);
    model.nodes.push(node);
    return id;
  };

  String(value ?? "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const text = line.trim();
      if (!text) return;
      const option = /^(direction|caption)\s*:\s*(.*)$/i.exec(text);
      if (option) {
        const key = option[1].toLowerCase();
        const val = option[2].trim();
        if (key === "caption") model.caption = val || null;
        else if (/^(right|lr|horizontal)$/i.test(val)) model.direction = "right";
        else if (/^(down|tb|vertical)$/i.test(val)) model.direction = "down";
        else problems.push(`Line ${index + 1}: direction must be right or down.`);
        return;
      }
      // Split into [node, label, node, label, node, ...] (the capture group keeps arrow labels).
      const parts = text.split(FLOW_ARROW);
      const nodes: string[] = [];
      const labels: Array<string | null> = [];
      for (let i = 0; i < parts.length; i += 2) {
        nodes.push(parts[i] ?? "");
        if (i + 1 < parts.length) labels.push((parts[i + 1] ?? "").trim() || null);
      }
      const ids = nodes.map((raw) => ensure(raw));
      if (ids.some((id) => id === null)) {
        problems.push(`Line ${index + 1}: an arrow needs a node on both sides.`);
        return;
      }
      for (let i = 0; i < ids.length - 1; i += 1) {
        model.edges.push({ from: ids[i] as string, to: ids[i + 1] as string, label: labels[i] ?? null });
      }
    });

  if (!model.nodes.length) problems.push("A `flow` block needs at least one node.");
  if (model.nodes.length > FLOW_MAX_NODES) problems.push(`A \`flow\` block can hold up to ${FLOW_MAX_NODES} nodes; use \`mermaid\` for larger diagrams.`);
  return { model, problems };
}

/** Problems with one study block, or an empty list. Used by the validator and the editor diagnostics. */
export function studyBlockProblems(language: string, value: string): string[] {
  if (!(STUDY_BLOCK_LANGUAGES as readonly string[]).includes(language)) return [];
  if (!String(value ?? "").trim()) return [`A \`${language}\` block is empty.`];
  if (language === "tabs" && !parseTabsBlock(value)) {
    return ["A `tabs` block must start with a tab header line such as '=== Java'."];
  }
  if (language === "flow") return parseFlowBlock(value).problems;
  if (language === "practice") {
    const { invalidLines } = parsePracticeBlock(value);
    if (invalidLines.length) {
      return [
        `A \`practice\` block takes one question reference per line, like [Two Sum](cachiva://question/12). Line ${invalidLines[0]} of the block is not one.`,
      ];
    }
  }
  return [];
}
