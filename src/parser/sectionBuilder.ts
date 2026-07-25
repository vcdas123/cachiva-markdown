import type { Block } from "../types/block.js";
import type { Section } from "../types/section.js";

// Copied verbatim from cachiva-backend/src/utils/markdownTransformer.ts
// (groupSections), typed against Block/Section instead of any[].
export function groupSections(blocks: Block[], level: number): Section[] {
  const sections: Section[] = [];
  let i = 0;

  const isHeading = (b: Block): b is Block & { type: "heading"; level: number; id: string; text: string } =>
    b.type === "heading";

  while (i < blocks.length) {
    const block = blocks[i];

    if (isHeading(block) && block.level === level) {
      const section: Section = {
        id: block.id,
        title: block.text,
        level,
        blocks: [],
        subsections: [],
      };
      let j = i + 1;
      const content: Block[] = [];

      while (j < blocks.length) {
        const next = blocks[j];
        if (isHeading(next) && next.level <= level) break;
        content.push(next);
        j++;
      }

      const deeper = content
        .filter((item): item is Block & { type: "heading"; level: number } => item.type === "heading")
        .map((item) => item.level);
      if (deeper.length) {
        const nextLevel = Math.min(...deeper);
        const firstDeep = content.findIndex((item) => item.type === "heading" && item.level === nextLevel);
        section.blocks = content.slice(0, firstDeep);
        section.subsections = groupSections(content.slice(firstDeep), nextLevel);
      } else {
        section.blocks = content;
      }

      sections.push(section);
      i = j;
    } else {
      i++;
    }
  }

  return sections;
}
