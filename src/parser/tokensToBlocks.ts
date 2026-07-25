import type { MarkdownToken } from "./markdownIt.js";
import type { Block, Inline } from "../types/block.js";
import { slugify } from "../slug/slugify.js";

// Copied verbatim (logic unchanged) from
// cachiva-backend/src/utils/markdownTransformer.ts, typed against this
// package's Block/Inline shapes (types/block.ts) instead of the backend's
// original loose `unknown[]`/`any[]`.

function findInlineClose(tokens: MarkdownToken[], openIdx: number, name: string) {
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    if (tokens[i].type === `${name}_open`) depth++;
    else if (tokens[i].type === `${name}_close`) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

function findBlockClose(tokens: MarkdownToken[], openIdx: number) {
  const openType = tokens[openIdx].type;
  const closeType = openType.replace("_open", "_close");
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    if (tokens[i].type === openType) depth++;
    else if (tokens[i].type === closeType) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

function attrGet(token: MarkdownToken, name: string) {
  return token.attrs?.find(([key]) => key === name)?.[1] || "";
}

export function convertInline(tokens: MarkdownToken[] = []): Inline[] {
  const result: Inline[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case "text":
        if (token.content) result.push({ t: "text", v: token.content });
        i++;
        break;
      case "code_inline":
        result.push({ t: "code", v: token.content });
        i++;
        break;
      case "softbreak":
      case "hardbreak":
        result.push({ t: "break" });
        i++;
        break;
      case "strong_open": {
        const close = findInlineClose(tokens, i, "strong");
        result.push({ t: "strong", children: convertInline(tokens.slice(i + 1, close)) });
        i = close + 1;
        break;
      }
      case "em_open": {
        const close = findInlineClose(tokens, i, "em");
        result.push({ t: "em", children: convertInline(tokens.slice(i + 1, close)) });
        i = close + 1;
        break;
      }
      case "s_open": {
        const close = findInlineClose(tokens, i, "s");
        result.push({ t: "del", children: convertInline(tokens.slice(i + 1, close)) });
        i = close + 1;
        break;
      }
      case "link_open": {
        const close = findInlineClose(tokens, i, "link");
        result.push({
          t: "link",
          href: attrGet(token, "href"),
          children: convertInline(tokens.slice(i + 1, close)),
        });
        i = close + 1;
        break;
      }
      case "image":
        result.push({ t: "image", src: attrGet(token, "src"), alt: token.content || "" });
        i++;
        break;
      default:
        if (token.content) result.push({ t: "text", v: token.content });
        i++;
        break;
    }
  }

  return result;
}

function plainText(inlineToken: MarkdownToken) {
  return (inlineToken.children || [])
    .filter((child) => child.type === "text" || child.type === "code_inline")
    .map((child) => child.content)
    .join("")
    .trim();
}

function parseListItems(tokens: MarkdownToken[]): Block[][] {
  const items: Block[][] = [];
  let i = 0;

  while (i < tokens.length) {
    if (tokens[i].type === "list_item_open") {
      const close = findBlockClose(tokens, i);
      items.push(tokensToBlocks(tokens.slice(i + 1, close)));
      i = close + 1;
    } else {
      i++;
    }
  }

  return items;
}

function parseTable(tokens: MarkdownToken[]): Block {
  let headers: Inline[][] = [];
  const rows: Inline[][][] = [];
  let currentRow: Inline[][] | null = null;
  let inHead = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "thead_open") inHead = true;
    else if (token.type === "thead_close") inHead = false;
    else if (token.type === "tr_open") currentRow = [];
    else if (token.type === "tr_close") {
      if (inHead) headers = currentRow || [];
      else rows.push(currentRow || []);
      currentRow = null;
    } else if ((token.type === "th_open" || token.type === "td_open") && currentRow) {
      currentRow.push(convertInline(tokens[i + 1]?.children || []));
    }
  }

  return { type: "table", headers, rows };
}

export function tokensToBlocks(tokens: MarkdownToken[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "heading_open") {
      const level = Number(token.tag.slice(1));
      const inlineToken = tokens[i + 1];
      const text = plainText(inlineToken);
      blocks.push({
        type: "heading",
        level,
        id: slugify(text),
        text,
        inline: convertInline(inlineToken.children || []),
      });
      i = findBlockClose(tokens, i) + 1;
    } else if (token.type === "paragraph_open") {
      const inlineToken = tokens[i + 1];
      blocks.push({ type: "paragraph", inline: convertInline(inlineToken.children || []) });
      i = findBlockClose(tokens, i) + 1;
    } else if (token.type === "fence" || token.type === "code_block") {
      blocks.push({
        type: "code",
        language: token.info?.trim() || "text",
        value: token.content.replace(/\n$/, ""),
      });
      i++;
    } else if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const close = findBlockClose(tokens, i);
      blocks.push({
        type: "list",
        ordered: token.type.startsWith("ordered"),
        items: parseListItems(tokens.slice(i + 1, close)),
      });
      i = close + 1;
    } else if (token.type === "blockquote_open") {
      const close = findBlockClose(tokens, i);
      blocks.push({ type: "blockquote", children: tokensToBlocks(tokens.slice(i + 1, close)) });
      i = close + 1;
    } else if (token.type === "table_open") {
      const close = findBlockClose(tokens, i);
      blocks.push(parseTable(tokens.slice(i, close + 1)));
      i = close + 1;
    } else if (token.type === "hr") {
      blocks.push({ type: "divider" });
      i++;
    } else {
      i++;
    }
  }

  return blocks;
}
