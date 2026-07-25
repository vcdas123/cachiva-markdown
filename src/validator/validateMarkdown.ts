import { type MarkdownToken, parseMarkdownSource } from "../parser/markdownIt.js";
import type { MarkdownValidationResult } from "../types/diagnostic.js";
import { CODE_FENCE_ERROR } from "../constants/authoringRules.js";

// Copied verbatim from cachiva-backend/src/utils/markdownValidator.ts —
// Phase 3 of the shared Markdown package migration. `tokens` is accepted for
// API-compatibility with the original signature but unused (same as the
// original, which took it as `_tokens`) — every check runs against the raw/
// cleaned text.
export function validateMarkdownSource(
  raw: string,
  cleaned: string,
  _tokens: MarkdownToken[],
): MarkdownValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cleaned.trim()) {
    return { ok: false, errors: ["The note is empty."], warnings };
  }

  const lines = cleaned.split(/\r?\n/);
  const firstNonEmpty = lines.find((line) => line.trim()) || "";
  const h1Lines: number[] = [];

  if (!/^#\s+\S/.test(firstNonEmpty)) {
    errors.push("Must start with a level-1 title heading, e.g. '# My Title'.");
  }

  if (!/^##\s+\S/m.test(cleaned)) {
    errors.push("Must contain at least one section heading, e.g. '## Section Title'.");
  }

  let inFence = false;
  for (const [idx, line] of lines.entries()) {
    const value = line.trim();
    if (value.startsWith("```")) {
      if (!inFence) {
        if (!value.slice(3).trim()) {
          errors.push(CODE_FENCE_ERROR);
        }
        inFence = true;
      } else {
        inFence = false;
      }
      continue;
    }

    if (!inFence && /^#\s+\S/.test(line)) {
      h1Lines.push(idx + 1);
    }
  }

  if (h1Lines.length > 1) {
    errors.push("Only one level-1 title heading is allowed. Use ##, ###, or #### for sections inside the note.");
  }

  if (/^##\s+Table of Contents/m.test(raw)) {
    warnings.push("A manual 'Table of Contents' was found — the platform generates navigation automatically, so this is usually unnecessary.");
  }

  if (/^##\s+Navigation/m.test(raw)) {
    warnings.push("A manual 'Navigation' section was found — the platform generates navigation automatically, so this is usually unnecessary.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Convenience entry point for realtime (frontend) validation — runs the
// boilerplate strip + markdown-it parse + validation in one call (matching
// the backend's own parseMarkdownSource -> validateMarkdownSource sequence
// in parseMarkdown.ts), so a caller only needs the raw editor text.
export function validateMarkdown(raw: string): MarkdownValidationResult {
  const source = parseMarkdownSource(raw);
  return validateMarkdownSource(source.raw, source.cleaned, source.tokens);
}
