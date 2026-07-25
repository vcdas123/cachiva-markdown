// Mirrors cachiva-frontend/src/interfaces/renderer.type.ts's TocEntry
// shape (plain field names — see block.ts for the KEYS-indirection note).
export type TocEntry = {
  id: string;
  title: string;
  children: TocEntry[];
};
