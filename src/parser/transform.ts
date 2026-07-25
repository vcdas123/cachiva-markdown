import type { MarkdownToken } from "./markdownIt.js";
import type { Block } from "../types/block.js";
import type { ParsedNote } from "../types/note.js";
import { tokensToBlocks } from "./tokensToBlocks.js";
import { groupSections } from "./sectionBuilder.js";
import { buildToc } from "./tocBuilder.js";

// Copied verbatim from cachiva-backend/src/utils/markdownTransformer.ts
// (transformMarkdownTokens), returning this package's ParsedNote type
// instead of the backend's original loosely-typed LearningHubParsedMarkdown.
export function transformMarkdownTokens(tokens: MarkdownToken[]): ParsedNote {
  const blocks = tokensToBlocks(tokens);
  let title: string | null = null;
  const bodyBlocks: Block[] = [];

  const isHeading = (b: Block): b is Block & { type: "heading"; level: number; text: string } =>
    b.type === "heading";

  for (const block of blocks) {
    if (title === null && isHeading(block) && block.level === 1) {
      title = block.text;
      continue;
    }
    bodyBlocks.push(block);
  }

  const levels = bodyBlocks.filter(isHeading).map((block) => block.level);
  let preamble: Block[] = [];
  let sections: ParsedNote["sections"] = [];

  if (levels.length) {
    const topLevel = Math.min(...levels);
    const firstIdx = bodyBlocks.findIndex((block) => isHeading(block) && block.level === topLevel);
    preamble = bodyBlocks.slice(0, firstIdx);
    sections = groupSections(bodyBlocks.slice(firstIdx), topLevel);
  } else {
    preamble = bodyBlocks;
  }

  return { title, preamble, sections, toc: buildToc(sections) };
}
