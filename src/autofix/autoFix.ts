import { CODE_FENCE_LANGUAGE_FALLBACK } from "../constants/authoringRules.js";

/**
 * The kinds of problem that can be repaired without guessing at meaning.
 *
 * Deliberately narrow. A missing title, preamble or section heading is NOT
 * here: there is nothing in the document to derive them from, and inventing
 * text would be worse than the error it replaced. Those stay the author's
 * job, reported by the validator.
 */
export type AutoFixKind = "code-fence-language" | "heading-too-deep" | "extra-title";

export interface AutoFix {
  kind: AutoFixKind;
  /** 1-based line the fix applies to, matching validator diagnostics. */
  line: number;
  /** Shown on the control that applies it. */
  label: string;
  /** What the line becomes. */
  replacement: string;
}

const FIX_LABELS: Record<AutoFixKind, string> = {
  "code-fence-language": `Label as \`${CODE_FENCE_LANGUAGE_FALLBACK}\``,
  "heading-too-deep": "Change to a level-6 heading",
  "extra-title": "Demote to a section heading",
};

/**
 * Finds every repair that has exactly one correct outcome.
 *
 * Line-based on purpose: each fix rewrites a single line and touches nothing
 * else, so applying one cannot disturb the rest of the document, and applying
 * several is just applying each in turn.
 *
 * Code fence *contents* are never inspected or altered — a `###### ` inside a
 * code block is code, not a heading.
 */
export function getAutoFixes(markdown: string): AutoFix[] {
  const lines = (markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const fixes: AutoFix[] = [];

  let inFence = false;
  let seenTitle = false;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (!inFence) {
        // Cachiva rejects a fence with no language; `text` is the documented
        // neutral choice and changes nothing about the code itself.
        if (!trimmed.slice(3).trim()) {
          fixes.push({
            kind: "code-fence-language",
            line: index + 1,
            label: FIX_LABELS["code-fence-language"],
            replacement: line.replace(/```/, `\`\`\`${CODE_FENCE_LANGUAGE_FALLBACK}`),
          });
        }
        inFence = true;
      } else {
        inFence = false;
      }
      continue;
    }

    if (inFence) continue;

    // Seven or more hashes is not a heading in Markdown at all; clamping to
    // six preserves the author's intent of "deepest available".
    if (/^#{7,}\s+\S/.test(line)) {
      fixes.push({
        kind: "heading-too-deep",
        line: index + 1,
        label: FIX_LABELS["heading-too-deep"],
        replacement: line.replace(/^#{7,}/, "######"),
      });
      continue;
    }

    if (/^#\s+\S/.test(line)) {
      if (seenTitle) {
        // The first H1 is the note's title. A later one is a section that was
        // written at the wrong level — demoting keeps its text and position.
        fixes.push({
          kind: "extra-title",
          line: index + 1,
          label: FIX_LABELS["extra-title"],
          replacement: line.replace(/^#/, "##"),
        });
      }
      seenTitle = true;
    }
  }

  return fixes;
}

/** Applies one fix, leaving every other line untouched. */
export function applyAutoFix(markdown: string, fix: AutoFix): string {
  const normalized = (markdown ?? "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const index = fix.line - 1;
  if (index < 0 || index >= lines.length) return normalized;
  lines[index] = fix.replacement;
  return lines.join("\n");
}

/**
 * Applies every fix in one pass.
 *
 * Each fix targets its own line, so they cannot interfere — but they are
 * applied together rather than re-scanned between applications, so the line
 * numbers stay valid throughout.
 */
export function applyAllAutoFixes(markdown: string): string {
  const fixes = getAutoFixes(markdown);
  if (!fixes.length) return markdown;
  const lines = (markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  for (const fix of fixes) {
    const index = fix.line - 1;
    if (index >= 0 && index < lines.length) lines[index] = fix.replacement;
  }
  return lines.join("\n");
}
