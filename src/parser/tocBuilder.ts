import type { Section } from "../types/section.js";
import type { TocEntry } from "../types/toc.js";

// Copied verbatim from cachiva-backend/src/utils/markdownTransformer.ts
// (buildToc), typed against Section/TocEntry instead of any[].
export function buildToc(sections: Section[]): TocEntry[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    children: buildToc(section.subsections),
  }));
}
