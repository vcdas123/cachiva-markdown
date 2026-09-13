/**
 * How a note was authored.
 *
 * This is authoring-interface metadata only. It does NOT describe a content
 * format: `Note.content` is canonical Cachiva Markdown for every mode, parsed
 * and validated by exactly the same pipeline. The value exists so that
 * reopening a note for editing can restore the interface it was written in.
 *
 * Values are the wire format, shared so the Prisma enum, the API contract and
 * the frontend cannot drift apart.
 */
export const NOTE_AUTHORING_MODES = ["markdown", "rich-text"] as const;

export type NoteAuthoringMode = (typeof NOTE_AUTHORING_MODES)[number];

/** Anything authored before this feature, and anything that omits the field. */
export const DEFAULT_NOTE_AUTHORING_MODE: NoteAuthoringMode = "markdown";

export function isNoteAuthoringMode(value: unknown): value is NoteAuthoringMode {
  return typeof value === "string" && (NOTE_AUTHORING_MODES as readonly string[]).includes(value);
}

/**
 * Narrows an unknown value to an authoring mode, falling back to Markdown.
 *
 * Used at every boundary that can receive a legacy or absent value — an old
 * database row, an API client written before the field existed — so a missing
 * mode degrades to the format every note is already stored in rather than
 * throwing.
 */
export function toNoteAuthoringMode(value: unknown): NoteAuthoringMode {
  return isNoteAuthoringMode(value) ? value : DEFAULT_NOTE_AUTHORING_MODE;
}
