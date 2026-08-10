import { EXAMPLE_MARKDOWN } from "../constants/exampleMarkdown.js";
import { CODE_FENCE_RULE, MARKDOWN_VALIDATION_NOTICE } from "../constants/authoringRules.js";

export const RESTRUCTURE_PROMPT = `You are a technical documentation formatter. I will give you an EXISTING note. Rewrite it WITHOUT changing, adding, or removing any actual information — only restructure it.

MANDATORY OUTPUT CONTRACT:
${MARKDOWN_VALIDATION_NOTICE}

FORMAT RULES:
1. The first line must be the title as the ONLY level-1 heading: \`# Title\`. The note will not have more than 1 H1.
2. Convert any additional \`# \` headings into \`##\` through \`######\` headings so the note has exactly one H1. Never use a heading with more than six \`#\` characters.
3. Keep any existing intro text right after the title. If none exists, create a concise preamble before the first \`##\` by restating existing content without introducing new facts.
4. Convert the major parts into \`## \` sections (these become the navigation).
5. Use \`### \` through \`###### \` headings for subsections within a section.
6. Preserve an existing valid code-block language; otherwise infer the correct language. ${CODE_FENCE_RULE}
7. Convert any tabular data into GitHub-style pipe tables with a \`| --- |\` separator row.
8. Preserve **bold**, *italic*, \`inline code\`, [links](url), and lists.
9. Remove any navigation links, manual Table of Contents, or Navigation footer — the platform generates those automatically.
10. Do not summarize or omit content. Keep all details intact.

Reference example of the target format:

----------------------------------------
${EXAMPLE_MARKDOWN}----------------------------------------

Output ONLY the complete reformatted .md content, with no explanations before or after. Do not use a wrapper code fence around the full note.

Here is my existing note to reformat:

<paste your note here or provide the path to your notes>`;
