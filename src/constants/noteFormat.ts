import { EXAMPLE_MARKDOWN } from "./exampleMarkdown.js";
import { MARKDOWN_RULES } from "./markdownRules.js";
import { SUPPORTED_BLOCKS } from "./supportedBlocks.js";
import { SUPPORTED_DIAGRAM_LANGUAGES } from "./supportedDiagrams.js";
import { AI_PROMPT } from "../prompts/aiPrompt.js";
import { RESTRUCTURE_PROMPT } from "../prompts/restructurePrompt.js";

// Canonical format guide consumed directly by the frontend and backend.
// It is composed from focused constants so authoring prompts, displayed rules,
// validation guidance, and supported-feature metadata cannot drift.
export const NOTE_FORMAT_GUIDE = {
  version: "1.0",
  summary: "How to author a Markdown (.md) note this platform can parse correctly.",
  rules: MARKDOWN_RULES,
  structure: {
    title: "# Title           (level-1 heading, exactly one, on the first line)",
    preamble: "Required overview paragraph after the title (before the first '## ')",
    section: "## Section Title (level-2 heading -> appears in navigation)",
    subsection: "### Subsection Title (level-3 heading)",
    code: "```<language>\n ...code... \n```",
    diagram: "```mermaid\nflowchart LR\n  A --> B\n```",
    table: "| Col A | Col B |\n| --- | --- |\n| a | b |",
  },
  supported_blocks: SUPPORTED_BLOCKS,
  supported_diagram_languages: SUPPORTED_DIAGRAM_LANGUAGES,
  example_markdown: EXAMPLE_MARKDOWN,
  restructure_prompt: RESTRUCTURE_PROMPT,
  ai_prompt: AI_PROMPT,
} as const;
