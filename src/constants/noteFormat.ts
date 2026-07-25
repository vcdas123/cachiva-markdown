import { EXAMPLE_MARKDOWN } from "./exampleMarkdown.js";
import { MARKDOWN_RULES } from "./markdownRules.js";
import { SUPPORTED_BLOCKS } from "./supportedBlocks.js";
import { AI_PROMPT } from "../prompts/aiPrompt.js";
import { RESTRUCTURE_PROMPT } from "../prompts/restructurePrompt.js";

// Re-composed from cachiva-backend/src/constants/noteFormat.ts's
// `guide` object — same shape and content, just built from the smaller
// pieces above instead of one flat file. This is what GET /api/note-format
// returns today; the backend keeps returning its own copy for now (Phase 1
// is additive only — see the Phase 1 plan for what's intentionally not
// wired up yet).
export const NOTE_FORMAT_GUIDE = {
  version: "1.0",
  summary: "How to author a Markdown (.md) note this platform can parse correctly.",
  rules: MARKDOWN_RULES,
  structure: {
    title: "# Title           (level-1 heading, exactly one, on the first line)",
    preamble: "Optional text right after the title (before the first '## ')",
    section: "## Section Title (level-2 heading -> appears in navigation)",
    subsection: "### Subsection Title (level-3 heading)",
    code: "```<language>\n ...code... \n```",
    table: "| Col A | Col B |\n| --- | --- |\n| a | b |",
  },
  supported_blocks: SUPPORTED_BLOCKS,
  example_markdown: EXAMPLE_MARKDOWN,
  restructure_prompt: RESTRUCTURE_PROMPT,
  ai_prompt: AI_PROMPT,
} as const;
