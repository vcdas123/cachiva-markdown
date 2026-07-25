import type { Block } from "./block.js";

// Mirrors cachiva-frontend/src/interfaces/renderer.type.ts's Section
// shape (plain field names — see block.ts for the KEYS-indirection note).
export type Section = {
  id: string;
  title: string;
  level: number;
  blocks: Block[];
  subsections: Section[];
};
