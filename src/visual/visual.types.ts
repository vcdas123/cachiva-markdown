import type {
  DiagramIcon,
  VisualAlign,
  VisualArrowDirection,
  VisualGap,
  VisualOrientation,
  VisualSize,
  VisualTone,
} from "./visual.constants.js";

interface VisualNodeBase {
  /** Optional author id, unique inside the document; useful to reference a node in prose. */
  id?: string;
}

export interface VisualContainerNode extends VisualNodeBase {
  type: "container";
  title?: string;
  description?: string;
  icon?: DiagramIcon;
  tone?: VisualTone;
  /** How the children are laid out inside the boundary. Defaults to `column`. */
  direction?: "row" | "column";
  gap?: VisualGap;
  align?: VisualAlign;
  children: VisualNode[];
}

export interface VisualCardNode extends VisualNodeBase {
  type: "card";
  title: string;
  description?: string;
  icon?: DiagramIcon;
  tone?: VisualTone;
}

export interface VisualRowNode extends VisualNodeBase {
  type: "row";
  gap?: VisualGap;
  align?: VisualAlign;
  children: VisualNode[];
}

export interface VisualColumnNode extends VisualNodeBase {
  type: "column";
  gap?: VisualGap;
  align?: VisualAlign;
  children: VisualNode[];
}

export interface VisualGridNode extends VisualNodeBase {
  type: "grid";
  columns: number;
  gap?: VisualGap;
  children: VisualNode[];
}

export interface VisualTextNode extends VisualNodeBase {
  type: "text";
  text: string;
  size?: VisualSize;
  tone?: VisualTone;
  align?: "start" | "center" | "end";
  strong?: boolean;
}

export interface VisualArrowNode extends VisualNodeBase {
  type: "arrow";
  direction?: VisualArrowDirection;
  orientation?: VisualOrientation;
  label?: string;
  tone?: VisualTone;
}

export interface VisualDividerNode extends VisualNodeBase {
  type: "divider";
  label?: string;
}

export interface VisualBadgeNode extends VisualNodeBase {
  type: "badge";
  label: string;
  tone?: VisualTone;
  icon?: DiagramIcon;
}

export interface VisualIconNode extends VisualNodeBase {
  type: "icon";
  icon: DiagramIcon;
  label?: string;
  size?: VisualSize;
  tone?: VisualTone;
}

export interface VisualTimelineItem {
  title: string;
  description?: string;
  /** Short marker text such as a date or step number. */
  label?: string;
  icon?: DiagramIcon;
  tone?: VisualTone;
}

export interface VisualTimelineNode extends VisualNodeBase {
  type: "timeline";
  orientation?: VisualOrientation;
  items: VisualTimelineItem[];
}

export type VisualNode =
  | VisualContainerNode
  | VisualCardNode
  | VisualRowNode
  | VisualColumnNode
  | VisualGridNode
  | VisualTextNode
  | VisualArrowNode
  | VisualDividerNode
  | VisualBadgeNode
  | VisualIconNode
  | VisualTimelineNode;

export interface VisualDocument {
  version: 1;
  title?: string;
  caption?: string;
  root: VisualNode;
}
