import {
  type DiagramParseResult,
  type DiagramPath,
  IDENTIFIER_HINT,
  IDENTIFIER_PATTERN,
  IssueCollector,
  parseDiagramJson,
  readArray,
  readEnum,
  readObject,
  readString,
} from "../diagram/validation.js";
import {
  SEQUENCE_EVENT_TYPES,
  SEQUENCE_GROUP_KINDS,
  SEQUENCE_LIMITS,
  SEQUENCE_MESSAGE_KINDS,
  SEQUENCE_PARTICIPANT_KINDS,
  SEQUENCE_VERSION,
} from "./sequence.constants.js";
import type { SequenceBranch, SequenceDocument, SequenceEvent, SequenceParticipant } from "./sequence.types.js";

export type SequenceParseResult = DiagramParseResult<SequenceDocument> & { eventCount?: number };

type ActiveCounts = Map<string, number>;

interface Context {
  collector: IssueCollector;
  participants: Set<string>;
  eventCount: number;
}

const TEXT = { max: SEQUENCE_LIMITS.maxLabelLength } as const;
const NOTE = { max: SEQUENCE_LIMITS.maxNoteLength } as const;
const SHORT = { max: SEQUENCE_LIMITS.maxTitleLength } as const;
const ID_RULES = { max: 40, pattern: IDENTIFIER_PATTERN, patternHint: IDENTIFIER_HINT } as const;

const EVENT_KEYS: Record<string, readonly string[]> = {
  message: ["type", "from", "to", "label", "kind"],
  note: ["type", "over", "text"],
  activate: ["type", "participant"],
  deactivate: ["type", "participant"],
  group: ["type", "kind", "label", "branches"],
  divider: ["type", "label"],
};

/** `alt`/`par` need alternatives to choose or run side by side; `opt`/`loop` wrap exactly one body. */
const BRANCH_RULES = {
  alt: { min: 2, max: SEQUENCE_LIMITS.maxBranches, hint: "an `alt` group needs 2 to 10 branches" },
  par: { min: 2, max: SEQUENCE_LIMITS.maxBranches, hint: "a `par` group needs 2 to 10 branches" },
  opt: { min: 1, max: 1, hint: "an `opt` group has exactly one branch" },
  loop: { min: 1, max: 1, hint: "a `loop` group has exactly one branch" },
} as const;

function readParticipantRef(object: Record<string, unknown>, key: string, path: DiagramPath, ctx: Context): string | undefined {
  const id = readString(object, key, path, ctx.collector, { ...ID_RULES, required: true });
  if (id !== undefined && !ctx.participants.has(id)) {
    ctx.collector.add("unknown-participant", `references an unknown participant "${id}".`, [...path, key]);
    return undefined;
  }
  return id;
}

function readEvents(raw: unknown[], path: DiagramPath, groupDepth: number, ctx: Context, active: ActiveCounts): SequenceEvent[] {
  const events: SequenceEvent[] = [];
  raw.forEach((item, index) => {
    const event = readEvent(item, [...path, index], groupDepth, ctx, active);
    if (event) events.push(event);
  });
  return events;
}

function readEvent(raw: unknown, path: DiagramPath, groupDepth: number, ctx: Context, active: ActiveCounts): SequenceEvent | null {
  const { collector } = ctx;
  if (collector.full) return null;
  ctx.eventCount += 1;
  if (ctx.eventCount === SEQUENCE_LIMITS.maxEvents + 1) {
    collector.add("too-many-events", `a sequence can hold up to ${SEQUENCE_LIMITS.maxEvents} events, nested ones included.`, path);
  }
  if (ctx.eventCount > SEQUENCE_LIMITS.maxEvents) return null;

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    collector.add("not-an-object", 'must be an object with a "type".', path);
    return null;
  }
  const type = (raw as Record<string, unknown>).type;
  if (typeof type !== "string" || !(SEQUENCE_EVENT_TYPES as readonly string[]).includes(type)) {
    collector.add("unknown-event-type", `"type" must be one of: ${SEQUENCE_EVENT_TYPES.join(", ")}.`, [...path, "type"]);
    return null;
  }
  const object = readObject(raw, path, EVENT_KEYS[type], collector);
  if (!object) return null;

  switch (type) {
    case "message": {
      const from = readParticipantRef(object, "from", path, ctx);
      const to = readParticipantRef(object, "to", path, ctx);
      const label = readString(object, "label", path, collector, { ...TEXT, required: true });
      const kind = readEnum(object, "kind", path, collector, SEQUENCE_MESSAGE_KINDS);
      return from && to && label !== undefined ? { type, from, to, label, ...(kind ? { kind } : {}) } : null;
    }
    case "note": {
      const over = readArray(object, "over", path, collector, { min: 1, max: 2, required: true });
      const refs: string[] = [];
      over?.forEach((id, index) => {
        if (typeof id !== "string" || !ctx.participants.has(id)) {
          collector.add("unknown-participant", `references an unknown participant ${JSON.stringify(id)}.`, [...path, "over", index]);
        } else refs.push(id);
      });
      if (refs.length === 2 && refs[0] === refs[1]) collector.add("duplicate-participant", "a note spanning two participants needs two different ones.", [...path, "over"]);
      const text = readString(object, "text", path, collector, { ...NOTE, required: true });
      return refs.length === over?.length && text !== undefined ? { type, over: refs, text } : null;
    }
    case "activate":
    case "deactivate": {
      const participant = readParticipantRef(object, "participant", path, ctx);
      if (!participant) return null;
      const count = active.get(participant) ?? 0;
      if (type === "activate") active.set(participant, count + 1);
      else if (count === 0) {
        collector.add("invalid-activation", `"${participant}" has no open activation to deactivate.`, path);
        return null;
      } else active.set(participant, count - 1);
      return { type, participant };
    }
    case "divider": {
      const label = readString(object, "label", path, collector, { ...SHORT, required: true });
      return label === undefined ? null : { type, label };
    }
    case "group": {
      const kind = readEnum(object, "kind", path, collector, SEQUENCE_GROUP_KINDS, { required: true });
      const label = readString(object, "label", path, collector, SHORT);
      if (groupDepth + 1 > SEQUENCE_LIMITS.maxGroupDepth) {
        collector.add("too-deep", `groups can be nested up to ${SEQUENCE_LIMITS.maxGroupDepth} levels.`, path);
        return null;
      }
      const rules = kind ? BRANCH_RULES[kind] : { min: 1, max: SEQUENCE_LIMITS.maxBranches, hint: "" };
      const rawBranches = readArray(object, "branches", path, collector, { min: 1, max: SEQUENCE_LIMITS.maxBranches, required: true });
      if (rawBranches && kind && (rawBranches.length < rules.min || rawBranches.length > rules.max)) {
        collector.add("invalid-branch-count", `${rules.hint}; found ${rawBranches.length}.`, [...path, "branches"]);
      }
      const branches: SequenceBranch[] = [];
      rawBranches?.forEach((rawBranch, index) => {
        const branchPath = [...path, "branches", index];
        const branchObject = readObject(rawBranch, branchPath, ["label", "events"], collector);
        if (!branchObject) return;
        const branchLabel = readString(branchObject, "label", branchPath, collector, SHORT);
        const rawEvents = readArray(branchObject, "events", branchPath, collector, { min: 1, max: SEQUENCE_LIMITS.maxEvents, required: true });
        if (!rawEvents) return;
        // Every branch starts from the state at the group's opening and must end there, so a group never leaves an
        // activation half-open (which of two `alt` branches ran is not known) and `par` branches stay independent.
        const branchActive = new Map(active);
        const branchEvents = readEvents(rawEvents, [...branchPath, "events"], groupDepth + 1, ctx, branchActive);
        for (const [participant, count] of branchActive) {
          if (count !== (active.get(participant) ?? 0)) {
            collector.add("unbalanced-branch", `activations opened or closed inside a group branch must balance; "${participant}" does not.`, [...branchPath, "events"]);
          }
        }
        branches.push({ ...(branchLabel === undefined ? {} : { label: branchLabel }), events: branchEvents });
      });
      return kind ? { type, kind, ...(label === undefined ? {} : { label }), branches } : null;
    }
    default:
      return null;
  }
}

function readParticipants(raw: unknown[], collector: IssueCollector): { participants: SequenceParticipant[]; ids: Set<string> } {
  const participants: SequenceParticipant[] = [];
  const ids = new Set<string>();
  raw.forEach((item, index) => {
    const path = ["participants", index];
    const object = readObject(item, path, ["id", "label", "kind"], collector);
    if (!object) return;
    const id = readString(object, "id", path, collector, { ...ID_RULES, required: true });
    const label = readString(object, "label", path, collector, { max: SEQUENCE_LIMITS.maxParticipantLabelLength, required: true });
    const kind = readEnum(object, "kind", path, collector, SEQUENCE_PARTICIPANT_KINDS);
    if (id === undefined || label === undefined) return;
    if (ids.has(id)) {
      collector.add("duplicate-participant", `the participant id "${id}" is already used.`, [...path, "id"]);
      return;
    }
    ids.add(id);
    participants.push({ id, label, ...(kind ? { kind } : {}) });
  });
  return { participants, ids };
}

/** Parses and validates a ```sequence block body. Total: always returns, never throws. */
export function parseSequenceBlock(source: string): SequenceParseResult {
  const json = parseDiagramJson(source, "sequence");
  if (!json.ok) return { ok: false, issues: json.issues };

  const collector = new IssueCollector();
  const root = readObject(json.value, [], ["version", "title", "participants", "events"], collector);
  if (!root) return { ok: false, issues: collector.issues };

  if (root.version !== SEQUENCE_VERSION) {
    collector.add(
      "unsupported-version",
      root.version === undefined
        ? `"version" is required; this reader supports version ${SEQUENCE_VERSION}.`
        : `unsupported version ${JSON.stringify(root.version)}; this reader supports version ${SEQUENCE_VERSION}.`,
      ["version"],
    );
  }
  const title = readString(root, "title", [], collector, SHORT);
  const rawParticipants = readArray(root, "participants", [], collector, { min: 2, max: SEQUENCE_LIMITS.maxParticipants, required: true });
  const { participants, ids } = readParticipants(rawParticipants ?? [], collector);
  const rawEvents = readArray(root, "events", [], collector, { min: 1, max: SEQUENCE_LIMITS.maxEvents, required: true });

  const ctx: Context = { collector, participants: ids, eventCount: 0 };
  const active: ActiveCounts = new Map();
  const events = rawEvents ? readEvents(rawEvents, ["events"], 0, ctx, active) : [];
  for (const [participant, count] of active) {
    if (count > 0) collector.add("unclosed-activation", `"${participant}" is activated but never deactivated.`, ["events"]);
  }

  if (collector.issues.length) return { ok: false, issues: collector.issues };
  return { ok: true, document: { version: 1, ...(title === undefined ? {} : { title }), participants, events }, eventCount: ctx.eventCount };
}
