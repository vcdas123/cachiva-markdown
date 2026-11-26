// Vocabulary and limits of the `visual` block, version 1. Everything a document may say is listed here; the parser
// rejects the rest, and the frontend renders only these (icons from a static registry, tones from theme tokens).

export const VISUAL_VERSION = 1;
export const VISUAL_BLOCK_LANGUAGE = "visual";

export const VISUAL_TONES = ["neutral", "accent", "info", "success", "warning", "danger"] as const;
export type VisualTone = (typeof VISUAL_TONES)[number];

export const VISUAL_GAPS = ["sm", "md", "lg"] as const;
export type VisualGap = (typeof VISUAL_GAPS)[number];

export const VISUAL_ALIGNS = ["start", "center", "end", "stretch"] as const;
export type VisualAlign = (typeof VISUAL_ALIGNS)[number];

export const VISUAL_SIZES = ["sm", "md", "lg"] as const;
export type VisualSize = (typeof VISUAL_SIZES)[number];

export const VISUAL_ARROW_DIRECTIONS = ["forward", "backward", "both"] as const;
export type VisualArrowDirection = (typeof VISUAL_ARROW_DIRECTIONS)[number];

export const VISUAL_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type VisualOrientation = (typeof VISUAL_ORIENTATIONS)[number];

/** Icon names a document may use. The frontend maps each to a Lucide icon; anything else is a validation error. */
export const DIAGRAM_ICONS = [
  "monitor", "smartphone", "server", "database", "hard-drive", "cloud", "globe", "network", "router", "cpu",
  "container", "box", "package", "layers", "git-branch", "terminal", "code", "file-text", "folder", "mail",
  "bell", "search", "user", "users", "lock", "key", "shield", "bot", "brain", "workflow", "zap", "rocket",
  "settings", "clock", "link", "message-square", "send", "check", "x", "alert-triangle", "play", "refresh-cw",
] as const;
export type DiagramIcon = (typeof DIAGRAM_ICONS)[number];

export const VISUAL_NODE_TYPES = [
  "container", "card", "row", "column", "grid", "text", "arrow", "divider", "badge", "icon", "timeline",
] as const;
export type VisualNodeType = (typeof VISUAL_NODE_TYPES)[number];

export const VISUAL_LIMITS = {
  maxDepth: 12,
  maxNodes: 250,
  maxChildren: 30,
  maxGridColumns: 6,
  maxTimelineItems: 30,
  maxTitleLength: 200,
  maxLabelLength: 200,
  maxDescriptionLength: 2000,
} as const;
