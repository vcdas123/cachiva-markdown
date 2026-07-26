export const MARKDOWN_VALIDATION_NOTICE =
  "Generate and return the complete note in Markdown (.md) format by following every rule below. Deviations are not accepted: Cachiva validates the note with its Markdown parser and will reject the note if any required rule is violated.";

export const CODE_FENCE_RULE =
  "Every fenced code block MUST declare its language/type after the opening backticks. Use the actual language when known, e.g. ```sql, ```python, ```dockerfile, or ```bash. If no specific language applies, use ```text. NEVER output a bare fenced code block without a type.";

export const CODE_FENCE_ERROR =
  "A fenced code block has no language/type. Add the actual language after the opening backticks, or use ```text when no specific language applies. Bare fenced code blocks are rejected by Cachiva's Markdown parser.";

export const PREAMBLE_ERROR =
  "A preamble paragraph is required between the level-1 title and the first level-2 section. Add a concise overview of what the note covers.";
