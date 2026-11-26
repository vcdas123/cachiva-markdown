import { parseSequenceBlock } from "../sequence/sequence.parser.js";
import { parseVisualBlock } from "../visual/visual.parser.js";

/** Whole-note budgets, so a note cannot hide an unbounded amount of rendering work in many small, individually valid blocks. */
export const DIAGRAM_NOTE_LIMITS = {
  maxDiagramBlocks: 40,
  maxVisualNodes: 1000,
  maxSequenceEvents: 1000,
} as const;

/** Problems with the diagram blocks of one note taken together. Invalid blocks are reported by their own validation. */
export function diagramNoteProblems(fences: ReadonlyArray<{ language: string; value: string }>): string[] {
  let blocks = 0;
  let nodes = 0;
  let events = 0;
  for (const { language, value } of fences) {
    if (language === "visual") {
      blocks += 1;
      const result = parseVisualBlock(value);
      if (result.ok) nodes += result.nodeCount ?? 0;
    } else if (language === "sequence") {
      blocks += 1;
      const result = parseSequenceBlock(value);
      if (result.ok) events += result.eventCount ?? 0;
    }
  }
  const problems: string[] = [];
  if (blocks > DIAGRAM_NOTE_LIMITS.maxDiagramBlocks) {
    problems.push(`A note can hold up to ${DIAGRAM_NOTE_LIMITS.maxDiagramBlocks} \`visual\` and \`sequence\` blocks; this one has ${blocks}.`);
  }
  if (nodes > DIAGRAM_NOTE_LIMITS.maxVisualNodes) {
    problems.push(`The \`visual\` blocks of one note can hold up to ${DIAGRAM_NOTE_LIMITS.maxVisualNodes} nodes in total; this note has ${nodes}.`);
  }
  if (events > DIAGRAM_NOTE_LIMITS.maxSequenceEvents) {
    problems.push(`The \`sequence\` blocks of one note can hold up to ${DIAGRAM_NOTE_LIMITS.maxSequenceEvents} events in total; this note has ${events}.`);
  }
  return problems;
}
