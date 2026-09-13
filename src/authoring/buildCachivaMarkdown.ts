import { CODE_FENCE_LANGUAGE_FALLBACK } from "../constants/authoringRules.js";

export interface BuildCachivaMarkdownInput {
  /** Becomes the note's single level-1 heading. */
  title: string;
  /** The required overview paragraph directly beneath the title. */
  preamble: string;
  /** Everything below the preamble. Must contain at least one `## ` heading. */
  bodyMarkdown: string;
}

/** Collapses blank-line runs and strips trailing spaces, without touching fences. */
function normalizeBlock(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A title is one line. A pasted multi-line value would otherwise produce a
 * heading followed by orphaned text that the parser reads as the preamble.
 */
function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Assembles the three parts of a Cachiva note into canonical Markdown.
 *
 * This is the one place that knows the document's required shape — title,
 * then preamble, then body — so an authoring interface never has to
 * reimplement it. It is deliberately framework-independent: the rich-text
 * editor, the Markdown editor and any future authoring surface all produce
 * these three strings and hand them here.
 *
 * It does not validate. Callers pass the result to `validateMarkdown`, which
 * remains the single authority on whether a note is acceptable.
 */
export function buildCachivaMarkdown({ title, preamble, bodyMarkdown }: BuildCachivaMarkdownInput): string {
  const parts = [
    `# ${normalizeTitle(title)}`,
    normalizeBlock(preamble),
    normalizeBlock(bodyMarkdown),
  ].filter((part) => part && part !== "#");

  return `${parts.join("\n\n")}\n`;
}

/**
 * The language every fence falls back to when the author picked none.
 *
 * Cachiva rejects bare fences, so an authoring interface that offers code
 * blocks must always emit something; `text` is the documented neutral choice.
 */
export function resolveCodeFenceLanguage(language?: string | null): string {
  const value = (language ?? "").trim().toLowerCase();
  return value || CODE_FENCE_LANGUAGE_FALLBACK;
}
