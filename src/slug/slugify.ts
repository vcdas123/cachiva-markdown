// Copied verbatim from cachiva-backend/src/utils/slug.ts. This single
// function is dual-purpose in the backend today: URL slug generation (notes/
// modules) AND heading-anchor id generation for table-of-contents/section
// ids. `generateNoteSlug`/`generateModuleSlug` (DB-counter + crypto/time
// dependent) stay backend-only for now — only the pure string transform
// moves in Phase 1.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
