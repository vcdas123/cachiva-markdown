# @learning-hub/markdown

Shared Markdown engine for [Cachiva](https://github.com/vcdas123) — the single source of truth for Markdown constants, prompts, heading anchors, parsing, validation, formatting, and types used by `cachiva-frontend` and `cachiva-backend`.

The repository is named `cachiva-markdown`. The published/imported package name remains `@learning-hub/markdown` for compatibility with the existing application contract.

## Purpose

Without a shared package, the format guide, prompt templates, heading-anchor generation, parsing/validation logic, and shared type shapes can silently drift between the frontend and backend. This package exists so both apps consume the same implementation instead of maintaining parallel copies.

## Architecture

```txt
cachiva-frontend
        │
        ▼
@learning-hub/markdown
        ▲
        │
cachiva-backend
```

Both apps depend on this package (as a GitHub dependency, see Install below) and import from it.

## What it exports

Everything below is re-exported from the package root (`src/index.ts`) and imported as `@learning-hub/markdown`.

- **`constants/`** — `NOTE_FORMAT_GUIDE` (the composed note-format guide object: version, summary, rules, structure, supported blocks and diagram languages, example note, and both prompts), `MARKDOWN_RULES`, `SUPPORTED_BLOCKS` (+ `SupportedBlockType`), `SUPPORTED_DIAGRAM_LANGUAGES` (+ `SupportedDiagramLanguage`), `EXAMPLE_MARKDOWN` (the reference example note), and the authoring-rule strings `MARKDOWN_VALIDATION_NOTICE` / `CODE_FENCE_RULE` / `CODE_FENCE_ERROR`.
- **`prompts/`** — `AI_PROMPT` (the "generate a note" prompt template) and `RESTRUCTURE_PROMPT` (the "restructure an existing note" prompt template).
- **`anchor/`** — `createAnchorId(text)`, the deterministic transform used only for in-document heading anchors.
- **`types/`** — `Block`, `Section`, `TocEntry`, `ParsedNote`, and `MarkdownValidationResult`.
- **`parser/`** — `markdownIt` (the configured `markdown-it` instance), `parseMarkdownSource`, `stripBoilerplate`, `tokensToBlocks`, `groupSections`, `buildToc`, and the top-level orchestrator `transformMarkdownTokens(tokens): ParsedNote`.
- **`validator/`** — `validateMarkdownSource(raw, cleaned, tokens)`, the convenience wrapper `validateMarkdown(raw): MarkdownValidationResult` for callers with only raw text (used by the frontend's realtime validation), and `getMarkdownDiagnostics(raw): MarkdownDiagnosticItem[]` — a line-aware companion returning `{ message, severity, line }` items, used to anchor inline editor diagnostics at the correct line instead of defaulting to line 1.
- **`formatter/`** — `formatMarkdown(raw)`, a whitespace/blank-line normalizer (blank line before/after headings and fenced code blocks, collapsed blank-line runs, trimmed trailing whitespace, exactly one trailing newline; fence-aware and idempotent). It never touches note content, only formatting conventions — used by the frontend's "Auto Fix" editor button.

Notes must be complete Markdown (`.md`) documents that follow every rule in `MARKDOWN_RULES` — Cachiva rejects invalid notes. Heading levels are limited to Markdown's standard H1–H6 range: the first-line H1 is the single note title, and note content uses H2–H6 only. A concise preamble paragraph between the H1 title and first H2 section is mandatory because it becomes the note description shown on cards. Every fenced code block must declare its language (` ```sql`, ` ```python`, etc., or ` ```text` if none applies); a bare fenced code block is a blocking validation error.

Mermaid diagrams are officially supported through a typed ` ```mermaid` fence. The shared parser deliberately preserves them as normal `{ type: "code", language: "mermaid", value }` blocks so storage and API contracts stay unchanged; the Cachiva frontend recognizes that language and renders the source as a responsive diagram in the reader.

Tests live in `tests/` (`smoke`, `parser`, `validator`, `formatter`, `getMarkdownDiagnostics`, `stripBoilerplate`) and assert against the reference `EXAMPLE_MARKDOWN` note to catch drift.

## Build / typecheck

```bash
npm run build      # tsc -p tsconfig.json -> dist/
npm run prepare    # runs build (fires automatically on install, since this is a git dependency)
npm run typecheck  # tsc --noEmit
npm run test       # build, then run tests with node --test against dist/tests/*.test.js
```

Runtime dependency: `markdown-it`. Dev dependencies: `typescript`, `@types/node`, `@types/markdown-it`.

## Install / consumption

Both `cachiva-frontend` and `cachiva-backend` depend on this package straight from GitHub — not a local workspace or `file:` path:

```json
"@learning-hub/markdown": "github:vcdas123/cachiva-markdown"
```

`npm install` in either app clones this repo, then runs its `prepare` script (`npm run build`) so `dist/` is generated on install. The package is ESM-only (`"type": "module"`); consumers resolve it through the `exports` field to `dist/src/index.js` / `dist/src/index.d.ts`.

## Usage

```ts
import {
  NOTE_FORMAT_GUIDE,
  SUPPORTED_BLOCKS,
  SUPPORTED_DIAGRAM_LANGUAGES,
  createAnchorId,
  validateMarkdown,
  formatMarkdown,
  parseMarkdownSource,
  transformMarkdownTokens,
} from "@learning-hub/markdown";

const { tokens } = parseMarkdownSource(rawMarkdown);
const parsedNote = transformMarkdownTokens(tokens);
const { ok, errors, warnings } = validateMarkdown(rawMarkdown);
const formatted = formatMarkdown(rawMarkdown);
const anchorId = createAnchorId("My Note Title"); // "my-note-title"
```
