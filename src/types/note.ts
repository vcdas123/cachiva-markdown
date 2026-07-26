import type { Block } from "./block.js";
import type { Section } from "./section.js";
import type { TocEntry } from "./toc.js";

// The generic parsed-note shape shared conceptually by the backend's
// markdownTransformer.ts output and the frontend's NoteDetail
// (cachiva-frontend/src/interfaces/note.type.ts) — the app-specific
// fields on NoteDetail (entity IDs, owner, bookmark counts, etc.) are NOT part of
// this package; this is only the Markdown-derived content shape.
export type ParsedNote = {
  title: string | null;
  preamble: Block[];
  sections: Section[];
  toc: TocEntry[];
};

// Mirrors cachiva-frontend/src/interfaces/guide.type.ts's
// NoteFormatGuide — the shape of NOTE_FORMAT_GUIDE (../constants/noteFormat)
// and of the GET /api/note-format response.
export type NoteFormatGuide = {
  version: string;
  summary: string;
  rules: readonly string[];
  structure: Record<string, string>;
  supported_blocks: readonly string[];
  example_markdown: string;
  ai_prompt: string;
  restructure_prompt: string;
};
