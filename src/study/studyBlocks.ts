// Study-note blocks: the extra fenced block types and callouts carried by DSA study notes,
// now ordinary Cachiva notes. They are authored as normal Markdown and parsed into the
// existing block shapes (a fenced block stays `{ type: "code", language, value }`; a callout
// is a blockquote with an additive `callout` field), so older renderers keep working and
// simply show them as code / a plain blockquote.

/** Fence languages with a dedicated renderer in the reader. `mermaid` is listed in SUPPORTED_DIAGRAM_LANGUAGES. */
export const STUDY_BLOCK_LANGUAGES = ["tree", "array", "formula", "tabs", "practice"] as const;
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

/** Problems with one study block, or an empty list. Used by the validator and the editor diagnostics. */
export function studyBlockProblems(language: string, value: string): string[] {
  if (!(STUDY_BLOCK_LANGUAGES as readonly string[]).includes(language)) return [];
  if (!String(value ?? "").trim()) return [`A \`${language}\` block is empty.`];
  if (language === "tabs" && !parseTabsBlock(value)) {
    return ["A `tabs` block must start with a tab header line such as '=== Java'."];
  }
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
