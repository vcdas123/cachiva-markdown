// Copied verbatim from cachiva-backend/src/constants/noteFormat.ts
// (guide.supported_blocks). Kept as its own module — per Phase 1 scope this
// is the one value the backend imports to verify package resolution.
export const SUPPORTED_BLOCKS = [
  "heading",
  "paragraph",
  "code",
  "table",
  "list",
  "blockquote",
  "image",
  "divider",
] as const;

export type SupportedBlockType = (typeof SUPPORTED_BLOCKS)[number];
