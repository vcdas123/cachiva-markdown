import { DIAGRAM_NOTE_LIMITS } from "../diagram/aggregate.js";
import { DIAGRAM_MAX_SOURCE_BYTES } from "../diagram/validation.js";
import {
  SEQUENCE_EVENT_TYPES,
  SEQUENCE_GROUP_KINDS,
  SEQUENCE_LIMITS,
  SEQUENCE_MESSAGE_KINDS,
  SEQUENCE_PARTICIPANT_KINDS,
  SEQUENCE_VERSION,
} from "../sequence/sequence.constants.js";
import { SEQUENCE_EXAMPLES } from "../sequence/sequence.examples.js";
import {
  DIAGRAM_ICONS,
  VISUAL_ALIGNS,
  VISUAL_ARROW_DIRECTIONS,
  VISUAL_GAPS,
  VISUAL_LIMITS,
  VISUAL_ORIENTATIONS,
  VISUAL_SIZES,
  VISUAL_TONES,
  VISUAL_VERSION,
} from "../visual/visual.constants.js";
import { VISUAL_EXAMPLES } from "../visual/visual.examples.js";

// What an AI agent needs to write a valid `visual` or `sequence` block. Built from the same constants the parsers use, so
// the guide cannot promise anything the validator would reject. Kept compact: it is returned by the MCP guide tool.

export const DIAGRAM_GUIDE = {
  choose_a_format: [
    "visual: architecture, nested containers, layers, comparisons, conceptual layouts and timelines (cards, grids, arrows between neighbours).",
    "sequence: time-ordered messages between participants (requests, responses, activations, alt/opt/loop/par groups).",
    "flow: a small graph or decision flow, one chain per line. mermaid: complex graphs and diagram types not covered natively (state, ER, gantt...).",
    "tree: tree data structures. array: indexed values. Use a table or plain prose when a diagram would not make it clearer.",
    "Never convert an existing diagram block to another format unless the user asks.",
  ],
  visual: {
    fence: "visual",
    document: `{ "version": ${VISUAL_VERSION}, "title"?: string, "caption"?: string, "root": node }`,
    nodes: {
      container: "title?, description?, icon?, tone?, direction? (row|column, default column), gap?, align?, children[1..30]",
      card: "title (required), description?, icon?, tone?",
      row: "gap?, align?, children[1..30]",
      column: "gap?, align?, children[1..30]",
      grid: `columns (1..${VISUAL_LIMITS.maxGridColumns}, required), gap?, children[1..30]`,
      text: "text (required), size?, tone?, align? (start|center|end), strong? (boolean)",
      arrow: "direction? (forward|backward|both), orientation? (horizontal|vertical), label?, tone? - joins the two neighbouring items; it is not a graph edge",
      divider: "label?",
      badge: "label (required), tone?, icon?",
      icon: "icon (required), label?, size?, tone?",
      timeline: `items[1..${VISUAL_LIMITS.maxTimelineItems}] of { title (required), description?, label?, icon?, tone? }, orientation?`,
    },
    every_node_may_have: "id? (letters, digits, _ or -; unique)",
    values: {
      tone: VISUAL_TONES,
      gap: VISUAL_GAPS,
      align: VISUAL_ALIGNS,
      size: VISUAL_SIZES,
      arrow_direction: VISUAL_ARROW_DIRECTIONS,
      orientation: VISUAL_ORIENTATIONS,
      icon: DIAGRAM_ICONS,
    },
    limits: {
      nesting_depth: VISUAL_LIMITS.maxDepth,
      nodes_per_block: VISUAL_LIMITS.maxNodes,
      children_per_node: VISUAL_LIMITS.maxChildren,
      title_chars: VISUAL_LIMITS.maxTitleLength,
      description_chars: VISUAL_LIMITS.maxDescriptionLength,
    },
    example: VISUAL_EXAMPLES.architecture,
  },
  sequence: {
    fence: "sequence",
    document: `{ "version": ${SEQUENCE_VERSION}, "title"?: string, "participants": [{ "id", "label", "kind"? }] (2..${SEQUENCE_LIMITS.maxParticipants}), "events": [event...] }`,
    participant_kinds: SEQUENCE_PARTICIPANT_KINDS,
    event_types: SEQUENCE_EVENT_TYPES,
    events: {
      message: `from, to (participant ids; from === to draws a self-call), label, kind? (${SEQUENCE_MESSAGE_KINDS.join("|")}; default request, response is dashed, async has an open arrowhead)`,
      note: "over (one participant id, or two to span them), text",
      activate: "participant - starts an activation bar",
      deactivate: "participant - ends the latest open activation",
      divider: "label - a horizontal section marker",
      group: `kind (${SEQUENCE_GROUP_KINDS.join("|")}), label?, branches[{ label?, events[] }]. alt and par need 2..${SEQUENCE_LIMITS.maxBranches} branches; opt and loop exactly 1.`,
    },
    rules: [
      "participant ids start with a letter and use letters, digits, _ or -; events may only reference declared ids",
      "activations must be closed by the end, and every group branch must open and close its own activations",
      "use par only for genuinely concurrent branches; use alt for either/or",
    ],
    limits: {
      events_per_block_including_nested: SEQUENCE_LIMITS.maxEvents,
      group_nesting_depth: SEQUENCE_LIMITS.maxGroupDepth,
      message_label_chars: SEQUENCE_LIMITS.maxLabelLength,
      note_chars: SEQUENCE_LIMITS.maxNoteLength,
    },
    example: SEQUENCE_EXAMPLES.loginWithGroups,
  },
  both_formats: {
    syntax: "strict JSON (double quotes, no comments, no trailing commas) inside a ```visual or ```sequence fence; unknown properties and versions are rejected",
    not_allowed: "HTML, CSS, URLs, images, scripts or any property not listed above",
    limits: { block_kib: DIAGRAM_MAX_SOURCE_BYTES / 1024, ...DIAGRAM_NOTE_LIMITS },
  },
} as const;
