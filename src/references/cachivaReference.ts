import { parseMarkdownSource, type MarkdownToken } from "../parser/markdownIt.js";

/**
 * An internal Cachiva link, written as an ordinary Markdown link whose href
 * uses the `cachiva://` scheme:
 *
 * ```md
 * [Node.js Fundamentals](cachiva://module/<moduleId>)
 * [Event Loop Phases](cachiva://note/<noteId>)
 * ```
 *
 * Only immutable IDs are stored, never titles or names, so renaming a module
 * or a note cannot break a reference pointing at it.
 *
 * A note reference deliberately carries no `moduleId`: a note can be moved to
 * another module later, and a stored `moduleId` would silently rot. The
 * owning module is resolved at click time instead.
 */
export type CachivaReference =
  | {
      type: "module";
      moduleId: string;
    }
  | {
      type: "note";
      noteId: string;
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
const CACHIVA_REFERENCE_HREF = /^cachiva:\/\/(module|note)\/([^/?#\s]+)$/;

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
} {
  const moduleIds = new Set<string>();
  const noteIds = new Set<string>();

  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return { moduleIds: [], noteIds: [] };
  }

  const visit = (tokens: MarkdownToken[]): void => {
    for (const token of tokens) {
      // Inline tokens hold the actual links in their children.
      if (token.children && token.children.length > 0) {
        visit(token.children);
      }
      if (token.type !== "link_open") continue;

      const reference = parseCachivaReferenceHref(token.attrGet("href") ?? "");
      if (!reference) continue;

      if (reference.type === "module") {
        moduleIds.add(reference.moduleId);
      } else {
        noteIds.add(reference.noteId);
      }
    }
  };

  visit(parseMarkdownSource(markdown).tokens);

  return { moduleIds: [...moduleIds], noteIds: [...noteIds] };
}
