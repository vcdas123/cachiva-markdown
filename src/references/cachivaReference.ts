import { parseMarkdownSource, type MarkdownToken } from "../parser/markdownIt.js";
import { PRACTICE_BLOCK_LANGUAGE, parsePracticeBlock } from "../study/studyBlocks.js";

/**
 * An internal Cachiva link, written as an ordinary Markdown link whose href
 * uses the `cachiva://` scheme:
 *
 * ```md
 * [Node.js Fundamentals](cachiva://module/<moduleId>)
 * [Event Loop Phases](cachiva://note/<noteId>)
 * [Two Sum](cachiva://question/<questionId>)
 * ```
 *
 * Only immutable IDs are stored, never titles or names, so renaming a module
 * or a note cannot break a reference pointing at it.
 *
 * A note reference deliberately carries no `moduleId`: a note can be moved to
 * another module later, and a stored `moduleId` would silently rot. The
 * owning module is resolved at click time instead.
 *
 * A question reference points at a Practice question (`dsa_dashboard.questions.id`, a positive
 * integer). Questions are referenced, never copied. A fenced ```practice block lists question
 * references one per line (see `parsePracticeBlock`) and renders as a section's Practice list.
 */
export type CachivaReference =
  | {
      type: "module";
      moduleId: string;
    }
  | {
      type: "note";
      noteId: string;
    }
  | {
      type: "question";
      questionId: number;
    };

/**
 * Exactly two forms are recognised, and nothing else.
 *
 * The ID segment excludes `/`, `?`, `#` and whitespace, so this rejects extra
 * path segments (`cachiva://note/a/b`), query strings and fragments rather
 * than silently treating them as part of the ID. Group references
 * (`cachiva://group/<id>`) are not a supported reference type and fall
 * through as a non-match, as does an empty ID.
 */
const CACHIVA_REFERENCE_HREF = /^cachiva:\/\/(module|note|question)\/([^/?#\s]+)$/;
const QUESTION_ID = /^[1-9]\d{0,9}$/;

/**
 * Parses a link href into a Cachiva reference, or returns `null` when the
 * href is anything else — an external URL, a section anchor, a relative path,
 * an unsupported `cachiva://` form, or a malformed one.
 *
 * Total and side-effect free, so it is safe to call on every link the
 * renderer walks past.
 */
export function parseCachivaReferenceHref(href: string): CachivaReference | null {
  if (typeof href !== "string") return null;

  const match = CACHIVA_REFERENCE_HREF.exec(href.trim());
  if (!match) return null;

  const [, kind, id] = match;
  if (!id) return null;

  if (kind === "question") return QUESTION_ID.test(id) ? { type: "question", questionId: Number(id) } : null;
  return kind === "module" ? { type: "module", moduleId: id } : { type: "note", noteId: id };
}

/**
 * Collects every Cachiva reference in a Markdown document, as unique lists of
 * module and note IDs.
 *
 * Walks the tokens produced by the package's existing `markdown-it` instance
 * rather than scanning the raw text, so it inherits that parser's view of what
 * is and is not a link: text inside a fenced code block or inline code is not
 * a link and is therefore not collected, and `image` tokens carry `src` rather
 * than being `link_open`, so image URLs are ignored for free.
 *
 * No new block type is introduced. A Cachiva reference stays an ordinary
 * Markdown link all the way through the parser; only its href is special.
 */
export function extractCachivaReferences(markdown: string): {
  moduleIds: string[];
  noteIds: string[];
  questionIds: number[];
} {
  const moduleIds = new Set<string>();
  const noteIds = new Set<string>();
  const questionIds = new Set<number>();

  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return { moduleIds: [], noteIds: [], questionIds: [] };
  }

  const visit = (tokens: MarkdownToken[]): void => {
    for (const token of tokens) {
      // A ```practice block is the one fenced block whose lines are references.
      if (token.type === "fence" && token.info.trim() === PRACTICE_BLOCK_LANGUAGE) {
        for (const id of parsePracticeBlock(token.content).questionIds) questionIds.add(id);
      }
      // Inline tokens hold the actual links in their children.
      if (token.children && token.children.length > 0) {
        visit(token.children);
      }
      if (token.type !== "link_open") continue;

      const reference = parseCachivaReferenceHref(token.attrGet("href") ?? "");
      if (!reference) continue;

      if (reference.type === "module") {
        moduleIds.add(reference.moduleId);
      } else if (reference.type === "question") {
        questionIds.add(reference.questionId);
      } else {
        noteIds.add(reference.noteId);
      }
    }
  };

  visit(parseMarkdownSource(markdown).tokens);

  return { moduleIds: [...moduleIds], noteIds: [...noteIds], questionIds: [...questionIds] };
}
