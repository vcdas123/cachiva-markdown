// Mirrors cachiva-frontend/src/interfaces/renderer.type.ts's Inline/
// Block shapes, minus that file's KEYS-indirection layer (app.constants.ts)
// — the underlying field names are already plain lowercase strings (verified
// against INLINE_KEYS/BLOCK_KEYS), so this package exposes them directly.
// The backend does not have named types for these today (it produces the
// same-shaped plain objects ad hoc in markdownTransformer.ts) — this is the
// first strict, shared definition either app can adopt.

export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "strong"; children: Inline[] }
  | { t: "em"; children: Inline[] }
  | { t: "del"; children: Inline[] }
  | { t: "link"; href: string; children: Inline[] }
  | { t: "image"; src: string; alt: string }
  | { t: "break" };

export type Block =
  | { type: "heading"; level: number; id: string; text: string; inline: Inline[] }
  | { type: "paragraph"; inline: Inline[] }
  | { type: "code"; language: string; value: string }
  | { type: "table"; headers: Inline[][]; rows: Inline[][][] }
  | { type: "list"; ordered: boolean; items: Block[][] }
  | { type: "blockquote"; children: Block[] }
  | { type: "divider" }
  | { type: string; [key: string]: unknown };
