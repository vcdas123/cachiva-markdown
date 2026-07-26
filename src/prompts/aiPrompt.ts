import { EXAMPLE_MARKDOWN } from "../constants/exampleMarkdown.js";
import { CODE_FENCE_RULE, MARKDOWN_VALIDATION_NOTICE } from "../constants/authoringRules.js";

export const AI_PROMPT = `You are a technical documentation author.

MANDATORY OUTPUT CONTRACT:
${MARKDOWN_VALIDATION_NOTICE}

FORMAT RULES:
1. The first line is the title as the ONLY level-1 heading: \`# Title\`. The note will not have more than 1 H1.
2. Do NOT use another \`# \` heading anywhere else in the note. Use \`##\`, \`###\`, or \`####\` for all note content sections.
3. Add a concise, meaningful preamble paragraph after the title and before the first \`##\`. This is required and becomes the note description.
4. Use \`## \` for each major section (these become the navigation menu).
5. Use \`### \` or deeper headings for subsections inside a section.
6. ${CODE_FENCE_RULE}
7. Use GitHub-style pipe tables with a \`| --- |\` separator row.
8. Use **bold**, *italic*, \`inline code\`, [links](url), and \`-\`/\`1.\` lists.
9. Do NOT add navigation links, a manual Table of Contents, or a Navigation footer — the platform creates those automatically.

Here is a reference example of the exact format:

----------------------------------------
${EXAMPLE_MARKDOWN}----------------------------------------

Now write the note about the following topic. If a transcript or source file is provided, base the note on its content. Output ONLY the complete .md content, with no explanations before or after. Do not use a wrapper code fence around the full note.

TOPIC: <describe your topic, or paste/provide the path to a transcript or source file>`;
