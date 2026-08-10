import { CODE_FENCE_RULE, MARKDOWN_VALIDATION_NOTICE } from "./authoringRules.js";

export const MARKDOWN_RULES = [
  MARKDOWN_VALIDATION_NOTICE,
  "The first line MUST be the note title as the only level-1 heading: '# My Title'. A note must not contain more than one H1. This H1 becomes the note title.",
  "A concise preamble paragraph is REQUIRED immediately after the title and before the first level-2 ('## ...') section. It becomes the note description shown on cards.",
  "Use level-2 headings ('## ...') for SECTIONS. These build the in-note navigation menu, so give every major part its own '## ' heading.",
  "Use level-3 through level-6 headings ('### ...' through '###### ...') for nested content inside a section. Do not add another '# ...' heading or use more than six '#' characters.",
  CODE_FENCE_RULE,
  "Tables use standard GitHub pipe syntax with a header separator row ('| --- | --- |').",
  "Use '**bold**', '*italic*', '`inline code`', and '[text](url)' for inline formatting. Lists use '-' (bullets) or '1.' (numbered).",
  "Do NOT include manual navigation lines, a manual 'Table of Contents', or a '## Navigation' footer. The platform generates navigation automatically.",
] as const;
