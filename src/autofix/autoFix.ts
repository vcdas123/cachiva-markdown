import { CODE_FENCE_LANGUAGE_FALLBACK } from "../constants/authoringRules.js";

/**
 * The kinds of problem that can be repaired without guessing at meaning.
 *
 * Deliberately narrow. A missing title, preamble or section heading is NOT
 * here: there is nothing in the document to derive them from, and inventing
 * text would be worse than the error it replaced. Those stay the author's
 * job, reported by the validator.
 */
export type AutoFixKind = "code-fence-language" | "heading-too-deep" | "extra-title" | "insert-title";

export interface AutoFix {
  kind: AutoFixKind;
  /** 1-based line the fix applies to, matching validator diagnostics. */
  line: number;
  /** Shown on the control that applies it. */
  label: string;
  /** What the line becomes, or the text inserted when `insert` is set. */
  replacement: string;
  /** Inserts before `line` instead of replacing it. */
  insert?: boolean;
}

export interface AutoFixContext {
  /**
   * A title the author has already supplied elsewhere — the editor's own
   * Title field. Only then can a missing H1 be repaired: the text comes from
   * the author, not from this module guessing at one.
   */
  title?: string | null;
}

const FIX_LABELS: Record<AutoFixKind, string> = {
  "code-fence-language": `Label as \`${CODE_FENCE_LANGUAGE_FALLBACK}\``,
  "heading-too-deep": "Change to a level-6 heading",
  "extra-title": "Demote to a section heading",
  "insert-title": "Use the title above",
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
export function getAutoFixes(markdown: string, context: AutoFixContext = {}): AutoFix[] {
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

  // A missing title is repairable only when the author has already written
  // one somewhere else. With nothing to draw on this stays an error for them
  // to resolve — inventing a title would be worse than the error it replaced.
  const suppliedTitle = (context.title ?? "").replace(/\s+/g, " ").trim();
  if (!seenTitle && suppliedTitle) {
    fixes.unshift({
      kind: "insert-title",
      line: 1,
      label: FIX_LABELS["insert-title"],
      replacement: `# ${suppliedTitle}\n`,
      insert: true,
    });
  }

  return fixes;
}

/** Applies one fix, leaving every other line untouched. */
export function applyAutoFix(markdown: string, fix: AutoFix): string {
  const normalized = (markdown ?? "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const index = fix.line - 1;
  if (index < 0 || index > lines.length) return normalized;
  if (fix.insert) lines.splice(index, 0, fix.replacement);
  else if (index < lines.length) lines[index] = fix.replacement;
  return lines.join("\n");
}

/**
 * Applies every fix in one pass.
 *
 * Each fix targets its own line, so they cannot interfere — but they are
 * applied together rather than re-scanned between applications, so the line
 * numbers stay valid throughout.
 */
export function applyAllAutoFixes(markdown: string, context: AutoFixContext = {}): string {
  const fixes = getAutoFixes(markdown, context);
  if (!fixes.length) return markdown;
  const lines = (markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  // Replacements first, so their line numbers still refer to the original
  // document; only then the insertions, applied from the bottom up so each
  // one cannot shift the next.
  for (const fix of fixes.filter((item) => !item.insert)) {
    const index = fix.line - 1;
    if (index >= 0 && index < lines.length) lines[index] = fix.replacement;
  }
  for (const fix of fixes.filter((item) => item.insert).sort((a, b) => b.line - a.line)) {
    lines.splice(Math.max(0, fix.line - 1), 0, fix.replacement);
  }
  return lines.join("\n");
}
