// Shared building blocks for the JSON diagram formats (`visual`, `sequence`): the issue type, a bounded JSON reader
// and small field readers that reject anything not on an allow-list. Framework-free and total: a reader never throws.

export type DiagramPath = readonly (string | number)[];

export interface DiagramIssue {
  /** Stable machine-readable code, e.g. `unknown-participant`. */
  code: string;
  message: string;
  /** Location inside the document, e.g. `["events", 4, "to"]`. */
  path: DiagramPath;
}

export type DiagramParseResult<T> =
  | { ok: true; document: T }
  | { ok: false; issues: readonly DiagramIssue[] };

/** Per-block source cap, applied before `JSON.parse` so an oversized block never reaches the parser. */
export const DIAGRAM_MAX_SOURCE_BYTES = 64 * 1024;
/** Raw JSON nesting allowed before parsing (the schemas allow far less; this only guards the parser itself). */
const JSON_MAX_NESTING = 48;
/** Stop collecting after this many issues; the first few are the useful ones. */
const MAX_ISSUES = 20;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** `events[4].to` style path for messages. */
export function formatPath(path: DiagramPath): string {
  let out = "";
  for (const part of path) out += typeof part === "number" ? `[${part}]` : out ? `.${part}` : part;
  return out || "(root)";
}

/** One line for diagnostics: `events[4].to: references an unknown participant "db".` */
export function formatIssue(issue: DiagramIssue): string {
  return `${formatPath(issue.path)}: ${issue.message}`;
}

export class IssueCollector {
  readonly issues: DiagramIssue[] = [];

  get full(): boolean {
    return this.issues.length >= MAX_ISSUES;
  }

  add(code: string, message: string, path: DiagramPath): void {
    if (!this.full) this.issues.push({ code, message, path });
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function maxNesting(source: string): number {
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{" || char === "[") {
      depth += 1;
      if (depth > max) max = depth;
    } else if (char === "}" || char === "]") depth -= 1;
  }
  return max;
}

/** Size-checks, nesting-checks and parses a block body. Never throws. */
export function parseDiagramJson(
  source: string,
  blockName: string,
): { ok: true; value: unknown } | { ok: false; issues: DiagramIssue[] } {
  const text = String(source ?? "");
  if (!text.trim()) return { ok: false, issues: [{ code: "empty", message: `A \`${blockName}\` block is empty.`, path: [] }] };
  if (new TextEncoder().encode(text).length > DIAGRAM_MAX_SOURCE_BYTES) {
    return {
      ok: false,
      issues: [{ code: "too-large", message: `A \`${blockName}\` block can hold up to ${DIAGRAM_MAX_SOURCE_BYTES / 1024} KiB of JSON.`, path: [] }],
    };
  }
  if (maxNesting(text) > JSON_MAX_NESTING) {
    return { ok: false, issues: [{ code: "too-deep", message: "The JSON is nested too deeply to be a valid diagram.", path: [] }] };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid syntax";
    return { ok: false, issues: [{ code: "invalid-json", message: `The block is not valid JSON (${detail}).`, path: [] }] };
  }
}

/**
 * Accepts a plain object whose keys are all in `allowed`. Unexpected keys are reported (so a typo is not silently ignored)
 * and prototype-pollution keys are always rejected.
 */
export function readObject(
  value: unknown,
  path: DiagramPath,
  allowed: readonly string[],
  collector: IssueCollector,
): Record<string, unknown> | null {
  if (!isPlainObject(value)) {
    collector.add("not-an-object", "must be an object.", path);
    return null;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) collector.add("forbidden-key", `the key "${key}" is not allowed.`, [...path, key]);
    else if (!allowed.includes(key)) collector.add("unknown-property", `unexpected property "${key}". Allowed: ${allowed.join(", ")}.`, [...path, key]);
  }
  return value;
}

export interface StringRules {
  required?: boolean;
  max: number;
  pattern?: RegExp;
  patternHint?: string;
}

export function readString(
  object: Record<string, unknown>,
  key: string,
  path: DiagramPath,
  collector: IssueCollector,
  rules: StringRules,
): string | undefined {
  const value = object[key];
  const at = [...path, key];
  if (value === undefined) {
    if (rules.required) collector.add("missing-property", "is required.", at);
    return undefined;
  }
  if (typeof value !== "string") {
    collector.add("wrong-type", "must be a string.", at);
    return undefined;
  }
  const text = value.trim();
  if (rules.required && !text) {
    collector.add("empty-string", "must not be empty.", at);
    return undefined;
  }
  if (value.length > rules.max) {
    collector.add("too-long", `must be at most ${rules.max} characters.`, at);
    return undefined;
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    collector.add("invalid-format", rules.patternHint ?? "has an invalid format.", at);
    return undefined;
  }
  return value;
}

export function readEnum<T extends string>(
  object: Record<string, unknown>,
  key: string,
  path: DiagramPath,
  collector: IssueCollector,
  allowed: readonly T[],
  options: { required?: boolean } = {},
): T | undefined {
  const value = object[key];
  const at = [...path, key];
  if (value === undefined) {
    if (options.required) collector.add("missing-property", `is required (one of: ${allowed.join(", ")}).`, at);
    return undefined;
  }
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    collector.add("invalid-value", `must be one of: ${allowed.join(", ")}.`, at);
    return undefined;
  }
  return value as T;
}

export function readInteger(
  object: Record<string, unknown>,
  key: string,
  path: DiagramPath,
  collector: IssueCollector,
  rules: { min: number; max: number; required?: boolean },
): number | undefined {
  const value = object[key];
  const at = [...path, key];
  if (value === undefined) {
    if (rules.required) collector.add("missing-property", "is required.", at);
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < rules.min || value > rules.max) {
    collector.add("invalid-value", `must be a whole number from ${rules.min} to ${rules.max}.`, at);
    return undefined;
  }
  return value;
}

export function readArray(
  object: Record<string, unknown>,
  key: string,
  path: DiagramPath,
  collector: IssueCollector,
  rules: { min: number; max: number; required?: boolean },
): unknown[] | undefined {
  const value = object[key];
  const at = [...path, key];
  if (value === undefined) {
    if (rules.required) collector.add("missing-property", "is required.", at);
    return undefined;
  }
  if (!Array.isArray(value)) {
    collector.add("wrong-type", "must be an array.", at);
    return undefined;
  }
  if (value.length < rules.min) collector.add("too-few", `must contain at least ${rules.min} item${rules.min === 1 ? "" : "s"}.`, at);
  if (value.length > rules.max) {
    collector.add("too-many", `can contain at most ${rules.max} items.`, at);
    return undefined;
  }
  return value;
}

export const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
export const IDENTIFIER_HINT = "must start with a letter and use only letters, digits, '_' or '-' (up to 40 characters).";
