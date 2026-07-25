import MarkdownIt from "markdown-it";

// Copied verbatim from cachiva-backend/src/utils/markdownParser.ts —
// Phase 2 of the shared Markdown package migration. This exact config/
// comments must not change behavior for either app; see the Phase 1/2 plans
// at the learning-hub workspace root.
export const markdownIt = new MarkdownIt("commonmark", {
  // Never render raw HTML tags from note content — notes can come from
  // batch file uploads, not just trusted authors, so this is a real
  // injection boundary, not just a style choice.
  html: false,
  // Single newlines inside a paragraph stay soft-wrapped (CommonMark/GFM
  // behavior) rather than becoming a hard <br>, which is what most
  // Markdown authors expect from a blank-line-separated paragraph style.
  breaks: false,
  // Auto-link bare URLs and www.-style domains (e.g. a "Reference: <url>"
  // line with no [text](url) syntax) instead of leaving them as plain text.
  linkify: true,
  // Smart quotes only (straight -> curly). NOT the full typographer
  // "replacements" rule — that also rewrites "--" to an en dash, which
  // would corrupt CLI flags like `--save-dev` mentioned in plain prose
  // (outside backticks) on a programming-notes app.
  typographer: true,
  // The "commonmark" preset disables the "smartquotes" core rule outright —
  // the `typographer` option above does nothing unless it's re-enabled here.
}).enable(["table", "strikethrough", "linkify", "smartquotes"]);

export type MarkdownToken = ReturnType<typeof markdownIt.parse>[number];

export interface ParsedMarkdownSource {
  raw: string;
  cleaned: string;
  tokens: MarkdownToken[];
}

// Historically stripped a "[Previous] [Home] [Next >]" nav-link line, a
// manual "## Table of Contents" block, and a "## Navigation" footer, on the
// theory that the platform auto-generates its own navigation, so a
// downloaded-then-reuploaded note might otherwise duplicate it. In practice
// nothing in either app ever generates those patterns (no export/download
// path writes them into note content), so the only real effect was a live
// data-loss bug: the "## Navigation" regex had no line-start anchor, so the
// literal text matching mid-line — e.g. inside inline code in prose that
// merely *discussed* the feature — combined with the `s` (dotAll) flag's
// greedy `.*`, silently deleted everything from that point to the end of
// the note.
//
// Per product decision: never silently strip user content. If a note
// contains something the platform doesn't want (like a manual Table of
// Contents/Navigation section), that's surfaced as a validator
// warning/error instead — see validateMarkdownSource/getMarkdownDiagnostics
// — never deleted out from under the author.
export function stripBoilerplate(input: string): string {
  return input.trim();
}

export function parseMarkdownSource(raw: string): ParsedMarkdownSource {
  const cleaned = stripBoilerplate(raw);
  return {
    raw,
    cleaned,
    tokens: markdownIt.parse(cleaned, {}),
  };
}
