// Vocabulary and limits of the `sequence` block, version 1.

export const SEQUENCE_VERSION = 1;
export const SEQUENCE_BLOCK_LANGUAGE = "sequence";

export const SEQUENCE_PARTICIPANT_KINDS = ["participant", "actor", "service", "database"] as const;
export type SequenceParticipantKind = (typeof SEQUENCE_PARTICIPANT_KINDS)[number];

export const SEQUENCE_MESSAGE_KINDS = ["request", "response", "async"] as const;
export type SequenceMessageKind = (typeof SEQUENCE_MESSAGE_KINDS)[number];

export const SEQUENCE_GROUP_KINDS = ["alt", "opt", "loop", "par"] as const;
export type SequenceGroupKind = (typeof SEQUENCE_GROUP_KINDS)[number];

export const SEQUENCE_EVENT_TYPES = ["message", "note", "activate", "deactivate", "group", "divider"] as const;
export type SequenceEventType = (typeof SEQUENCE_EVENT_TYPES)[number];

export const SEQUENCE_LIMITS = {
  maxParticipants: 20,
  /** Counts every event, including those inside groups, and each group itself. */
  maxEvents: 250,
  maxGroupDepth: 8,
  maxBranches: 10,
  maxLabelLength: 500,
  maxNoteLength: 2000,
  maxTitleLength: 200,
  maxParticipantLabelLength: 80,
} as const;
