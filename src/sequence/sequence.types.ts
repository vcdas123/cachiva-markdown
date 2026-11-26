import type {
  SequenceGroupKind,
  SequenceMessageKind,
  SequenceParticipantKind,
} from "./sequence.constants.js";

export interface SequenceParticipant {
  id: string;
  label: string;
  kind?: SequenceParticipantKind;
}

export interface SequenceMessageEvent {
  type: "message";
  from: string;
  to: string;
  label: string;
  /** Defaults to `request`. `response` is drawn dashed, `async` with an open arrowhead. */
  kind?: SequenceMessageKind;
}

export interface SequenceNoteEvent {
  type: "note";
  /** One participant, or two to span between them. */
  over: string[];
  text: string;
}

export interface SequenceActivationEvent {
  type: "activate" | "deactivate";
  participant: string;
}

export interface SequenceDividerEvent {
  type: "divider";
  label: string;
}

export interface SequenceBranch {
  label?: string;
  events: SequenceEvent[];
}

export interface SequenceGroupEvent {
  type: "group";
  kind: SequenceGroupKind;
  label?: string;
  branches: SequenceBranch[];
}

export type SequenceEvent =
  | SequenceMessageEvent
  | SequenceNoteEvent
  | SequenceActivationEvent
  | SequenceDividerEvent
  | SequenceGroupEvent;

export interface SequenceDocument {
  version: 1;
  title?: string;
  participants: SequenceParticipant[];
  events: SequenceEvent[];
}
