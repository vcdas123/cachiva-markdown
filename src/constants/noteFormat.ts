import { EXAMPLE_MARKDOWN } from "./exampleMarkdown.js";
import { DIAGRAM_GUIDE } from "./diagramGuide.js";
import { MARKDOWN_RULES } from "./markdownRules.js";
import { SEQUENCE_TEMPLATE } from "../sequence/sequence.examples.js";
import { VISUAL_TEMPLATE } from "../visual/visual.examples.js";
import { SUPPORTED_BLOCKS } from "./supportedBlocks.js";
import { SUPPORTED_DIAGRAM_LANGUAGES } from "./supportedDiagrams.js";
import { CALLOUT_KINDS, STUDY_BLOCK_LANGUAGES } from "../study/studyBlocks.js";
import { AI_PROMPT } from "../prompts/aiPrompt.js";
import { RESTRUCTURE_PROMPT } from "../prompts/restructurePrompt.js";

// Canonical format guide consumed directly by the frontend and backend.
// It is composed from focused constants so authoring prompts, displayed rules,
// validation guidance, and supported-feature metadata cannot drift.
export const NOTE_FORMAT_GUIDE = {
  version: "1.3",
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
    callout: "> [!NOTE]\n> Callout text. Kinds: NOTE, TIP, IMPORTANT, WARNING.",
    flow: "```flow\ndirection: right\ncaption: A singly linked list.\nHead -> 10 -> 20 -> null\n```",
    tree: "```tree\nnodes: A B C - D\ncaption: A binary tree in level order ('-' = no child).\n```",
    array: "```array\nvalues: 4 7 1 9\nstart: 0\n```",
    formula: "```formula\nT(n) = 2T(n/2) + n\n```",
    tabs: "```tabs\n=== Java\nint x = 1;\n=== Python\nx = 1\n```",
    reference: "[Event Loop](cachiva://note/<noteId>)  [Node.js](cachiva://module/<moduleId>)  [Two Sum](cachiva://question/12)",
    visual: `\`\`\`visual\n${VISUAL_TEMPLATE}\n\`\`\``,
    sequence: `\`\`\`sequence\n${SEQUENCE_TEMPLATE}\n\`\`\``,
    practice: "```practice\n[Two Sum](cachiva://question/12)\ncachiva://question/34\n```",
  },
  // Full specification of the JSON diagram blocks (`visual`, `sequence`) and when to pick each format.
  diagrams: DIAGRAM_GUIDE,
  // What a note must not contain (each is rejected or stripped by the parser).
  not_allowed: [
    "More than one '# ' heading, or a note that does not start with the '# Title' line",
    "A missing preamble paragraph between the title and the first '## ' section",
    "Fenced code blocks without a language (use ```text when nothing fits)",
    "Headings deeper than six levels",
    "A manual table of contents, navigation lines or a '## Navigation' footer",
    "cachiva:// references to modules, notes or questions that do not exist",
    "A pasted transcript or raw copy of the source: restructure it into explained sections",
  ],
  // Optional study-note blocks (additive; plain notes never need them).
  study_blocks: STUDY_BLOCK_LANGUAGES,
  callout_kinds: CALLOUT_KINDS,
  supported_blocks: SUPPORTED_BLOCKS,
  supported_diagram_languages: SUPPORTED_DIAGRAM_LANGUAGES,
  example_markdown: EXAMPLE_MARKDOWN,
  restructure_prompt: RESTRUCTURE_PROMPT,
  ai_prompt: AI_PROMPT,
} as const;
