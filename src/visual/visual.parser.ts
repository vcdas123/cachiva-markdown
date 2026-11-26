import {
  type DiagramParseResult,
  IDENTIFIER_HINT,
  IDENTIFIER_PATTERN,
  IssueCollector,
  type DiagramPath,
  parseDiagramJson,
  readArray,
  readEnum,
  readInteger,
  readObject,
  readString,
} from "../diagram/validation.js";
import {
  DIAGRAM_ICONS,
  VISUAL_ALIGNS,
  VISUAL_ARROW_DIRECTIONS,
  VISUAL_GAPS,
  VISUAL_LIMITS,
  VISUAL_NODE_TYPES,
  VISUAL_ORIENTATIONS,
  VISUAL_SIZES,
  VISUAL_TONES,
  VISUAL_VERSION,
} from "./visual.constants.js";
import type { VisualDocument, VisualNode, VisualTimelineItem } from "./visual.types.js";

export type VisualParseResult = DiagramParseResult<VisualDocument> & { nodeCount?: number };

interface Context {
  collector: IssueCollector;
  ids: Set<string>;
  nodeCount: number;
}

const { maxTitleLength, maxLabelLength, maxDescriptionLength } = VISUAL_LIMITS;
const TITLE = { max: maxTitleLength } as const;
const LABEL = { max: maxLabelLength } as const;
const DESCRIPTION = { max: maxDescriptionLength } as const;
const ID_RULES = { max: 40, pattern: IDENTIFIER_PATTERN, patternHint: IDENTIFIER_HINT } as const;

const NODE_KEYS: Record<string, readonly string[]> = {
  container: ["type", "id", "title", "description", "icon", "tone", "direction", "gap", "align", "children"],
  card: ["type", "id", "title", "description", "icon", "tone"],
  row: ["type", "id", "gap", "align", "children"],
  column: ["type", "id", "gap", "align", "children"],
  grid: ["type", "id", "columns", "gap", "children"],
  text: ["type", "id", "text", "size", "tone", "align", "strong"],
  arrow: ["type", "id", "direction", "orientation", "label", "tone"],
  divider: ["type", "id", "label"],
  badge: ["type", "id", "label", "tone", "icon"],
  icon: ["type", "id", "icon", "label", "size", "tone"],
  timeline: ["type", "id", "orientation", "items"],
};

function readChildren(object: Record<string, unknown>, path: DiagramPath, depth: number, ctx: Context, min: number): VisualNode[] {
  const raw = readArray(object, "children", path, ctx.collector, { min, max: VISUAL_LIMITS.maxChildren, required: true });
  const children: VisualNode[] = [];
  raw?.forEach((child, index) => {
    const node = readNode(child, [...path, "children", index], depth + 1, ctx);
    if (node) children.push(node);
  });
  return children;
}

function readTimelineItem(raw: unknown, path: DiagramPath, ctx: Context): VisualTimelineItem | null {
  const object = readObject(raw, path, ["title", "description", "label", "icon", "tone"], ctx.collector);
  if (!object) return null;
  const title = readString(object, "title", path, ctx.collector, { ...TITLE, required: true });
  if (title === undefined) return null;
  return {
    title,
    description: readString(object, "description", path, ctx.collector, DESCRIPTION),
    label: readString(object, "label", path, ctx.collector, LABEL),
    icon: readEnum(object, "icon", path, ctx.collector, DIAGRAM_ICONS),
    tone: readEnum(object, "tone", path, ctx.collector, VISUAL_TONES),
  };
}

function readNode(raw: unknown, path: DiagramPath, depth: number, ctx: Context): VisualNode | null {
  const { collector } = ctx;
  if (collector.full) return null;
  if (depth > VISUAL_LIMITS.maxDepth) {
    collector.add("too-deep", `nesting is deeper than ${VISUAL_LIMITS.maxDepth} levels.`, path);
    return null;
  }
  ctx.nodeCount += 1;
  if (ctx.nodeCount === VISUAL_LIMITS.maxNodes + 1) {
    collector.add("too-many-nodes", `a visual can hold up to ${VISUAL_LIMITS.maxNodes} nodes.`, path);
  }
  if (ctx.nodeCount > VISUAL_LIMITS.maxNodes) return null;

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    collector.add("not-an-object", "must be an object with a \"type\".", path);
    return null;
  }
  const type = (raw as Record<string, unknown>).type;
  if (typeof type !== "string" || !(VISUAL_NODE_TYPES as readonly string[]).includes(type)) {
    collector.add("unknown-node-type", `"type" must be one of: ${VISUAL_NODE_TYPES.join(", ")}.`, [...path, "type"]);
    return null;
  }
  const object = readObject(raw, path, NODE_KEYS[type], collector);
  if (!object) return null;

  const id = readString(object, "id", path, collector, ID_RULES);
  if (id !== undefined) {
    if (ctx.ids.has(id)) collector.add("duplicate-id", `the id "${id}" is already used.`, [...path, "id"]);
    ctx.ids.add(id);
  }
  const base = id === undefined ? {} : { id };
  const tone = () => readEnum(object, "tone", path, collector, VISUAL_TONES);
  const icon = () => readEnum(object, "icon", path, collector, DIAGRAM_ICONS);
  const gap = () => readEnum(object, "gap", path, collector, VISUAL_GAPS);
  const align = () => readEnum(object, "align", path, collector, VISUAL_ALIGNS);

  switch (type) {
    case "container": {
      const title = readString(object, "title", path, collector, TITLE);
      const description = readString(object, "description", path, collector, DESCRIPTION);
      const direction = readEnum(object, "direction", path, collector, ["row", "column"] as const);
      return { ...base, type, title, description, icon: icon(), tone: tone(), direction, gap: gap(), align: align(), children: readChildren(object, path, depth, ctx, 1) };
    }
    case "card":
      return {
        ...base,
        type,
        title: readString(object, "title", path, collector, { ...TITLE, required: true }) ?? "",
        description: readString(object, "description", path, collector, DESCRIPTION),
        icon: icon(),
        tone: tone(),
      };
    case "row":
    case "column":
      return { ...base, type, gap: gap(), align: align(), children: readChildren(object, path, depth, ctx, 1) };
    case "grid":
      return {
        ...base,
        type,
        columns: readInteger(object, "columns", path, collector, { min: 1, max: VISUAL_LIMITS.maxGridColumns, required: true }) ?? 1,
        gap: gap(),
        children: readChildren(object, path, depth, ctx, 1),
      };
    case "text":
      return {
        ...base,
        type,
        text: readString(object, "text", path, collector, { ...DESCRIPTION, required: true }) ?? "",
        size: readEnum(object, "size", path, collector, VISUAL_SIZES),
        tone: tone(),
        align: readEnum(object, "align", path, collector, ["start", "center", "end"] as const),
        strong: typeof object.strong === "boolean" ? object.strong : readBooleanIssue(object, path, collector),
      };
    case "arrow":
      return {
        ...base,
        type,
        direction: readEnum(object, "direction", path, collector, VISUAL_ARROW_DIRECTIONS),
        orientation: readEnum(object, "orientation", path, collector, VISUAL_ORIENTATIONS),
        label: readString(object, "label", path, collector, LABEL),
        tone: tone(),
      };
    case "divider":
      return { ...base, type, label: readString(object, "label", path, collector, LABEL) };
    case "badge":
      return { ...base, type, label: readString(object, "label", path, collector, { ...LABEL, required: true }) ?? "", tone: tone(), icon: icon() };
    case "icon":
      return {
        ...base,
        type,
        icon: readEnum(object, "icon", path, collector, DIAGRAM_ICONS, { required: true }) ?? DIAGRAM_ICONS[0],
        label: readString(object, "label", path, collector, LABEL),
        size: readEnum(object, "size", path, collector, VISUAL_SIZES),
        tone: tone(),
      };
    case "timeline": {
      const rawItems = readArray(object, "items", path, collector, { min: 1, max: VISUAL_LIMITS.maxTimelineItems, required: true });
      const items: VisualTimelineItem[] = [];
      rawItems?.forEach((item, index) => {
        ctx.nodeCount += 1;
        const read = readTimelineItem(item, [...path, "items", index], ctx);
        if (read) items.push(read);
      });
      return { ...base, type, orientation: readEnum(object, "orientation", path, collector, VISUAL_ORIENTATIONS), items };
    }
    default:
      return null;
  }
}

function readBooleanIssue(object: Record<string, unknown>, path: DiagramPath, collector: IssueCollector): undefined {
  if (object.strong !== undefined) collector.add("wrong-type", "must be true or false.", [...path, "strong"]);
  return undefined;
}

/** Parses and validates a ```visual block body. Total: always returns, never throws. */
export function parseVisualBlock(source: string): VisualParseResult {
  const json = parseDiagramJson(source, "visual");
  if (!json.ok) return { ok: false, issues: json.issues };

  const collector = new IssueCollector();
  const root = readObject(json.value, [], ["version", "title", "caption", "root"], collector);
  if (!root) return { ok: false, issues: collector.issues };

  if (root.version !== VISUAL_VERSION) {
    collector.add(
      "unsupported-version",
      root.version === undefined
        ? `"version" is required; this reader supports version ${VISUAL_VERSION}.`
        : `unsupported version ${JSON.stringify(root.version)}; this reader supports version ${VISUAL_VERSION}.`,
      ["version"],
    );
  }
  const title = readString(root, "title", [], collector, TITLE);
  const caption = readString(root, "caption", [], collector, DESCRIPTION);
  const ctx: Context = { collector, ids: new Set(), nodeCount: 0 };
  const node = root.root === undefined ? (collector.add("missing-property", "is required.", ["root"]), null) : readNode(root.root, ["root"], 1, ctx);

  if (collector.issues.length || !node) return { ok: false, issues: collector.issues };
  return { ok: true, document: { version: 1, ...(title === undefined ? {} : { title }), ...(caption === undefined ? {} : { caption }), root: node }, nodeCount: ctx.nodeCount };
}
