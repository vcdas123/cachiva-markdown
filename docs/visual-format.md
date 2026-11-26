# Visual block format (v1)

Use a `visual` fenced block containing one JSON object. Version is required and must be the number `1`; missing or unknown versions are rejected. Unknown properties and node types are rejected, so producers must target the reader's supported vocabulary; newer formats require reader support.

## Document

| Property | Required | Value |
| --- | --- | --- |
| `version` | Yes | `1` |
| `root` | Yes | One node |
| `title` | No | String, at most 200 characters |
| `caption` | No | String, at most 2,000 characters |

Every node has a required `type` and an optional `id`, unique across nodes. IDs start with an ASCII letter and contain only ASCII letters, digits, `_` or `-`, up to 40 characters. Timeline items have no ID.

## Nodes

In this table, fields besides `type` and `id` are listed. Titles and labels are strings of at most 200 characters; descriptions and `text` are strings of at most 2,000 characters. Required strings cannot be blank. `children` has 1–30 nodes.

| Type | Required properties | Optional properties and values |
| --- | --- | --- |
| `container` | `children` | `title`, `description`, `icon`, `tone`, `direction` (`row` or `column`, default `column`), `gap`, `align` |
| `card` | `title` | `description`, `icon`, `tone` |
| `row`, `column` | `children` | `gap`, `align` |
| `grid` | `columns` (integer 1–6), `children` | `gap` |
| `text` | `text` | `size`, `tone`, `align` (`start`, `center`, `end`), `strong` (boolean) |
| `arrow` | — | `direction` (`forward`, `backward`, `both`), `orientation`, `label`, `tone` |
| `divider` | — | `label` |
| `badge` | `label` | `tone`, `icon` |
| `icon` | `icon` | `label`, `size`, `tone` |
| `timeline` | `items` (1–30 timeline items) | `orientation` |

A timeline item is an object with required `title` and optional `description`, `label`, `icon`, and `tone`, using the same rules as above.

| Shared property | Allowed values |
| --- | --- |
| `tone` | `neutral`, `accent`, `info`, `success`, `warning`, `danger` |
| `gap`, `size` | `sm`, `md`, `lg` |
| `align` for containers, rows and columns | `start`, `center`, `end`, `stretch` |
| `orientation` | `horizontal`, `vertical` |
| `icon` | `monitor`, `smartphone`, `server`, `database`, `hard-drive`, `cloud`, `globe`, `network`, `router`, `cpu`, `container`, `box`, `package`, `layers`, `git-branch`, `terminal`, `code`, `file-text`, `folder`, `mail`, `bell`, `search`, `user`, `users`, `lock`, `key`, `shield`, `bot`, `brain`, `workflow`, `zap`, `rocket`, `settings`, `clock`, `link`, `message-square`, `send`, `check`, `x`, `alert-triangle`, `play`, `refresh-cw` |

## Limits

Node nesting is at most 12 levels, counting the root as level 1. The nominal node limit is 250; timeline items contribute to `nodeCount` and to note totals. The parser checks the 250 threshold when entering a node, but increments timeline items without checking the threshold there: a final timeline can therefore cause a successful block's count to exceed 250.

## Validation and security

The body is JSON, with a maximum UTF-8 source size of 64 KiB and raw JSON nesting of 48. Objects reject unknown properties and the keys `__proto__`, `constructor`, and `prototype`. The parser returns `{ ok: true, document }` on success or `{ ok: false, issues }` on failure; each issue has a machine-readable `code`, a `message`, and a `path` array of property names and array indices. At most 20 issues are collected. Formatted diagnostics use paths such as `events[0].type`; the root is `(root)`.

There are no schema properties for HTML, CSS, URLs, scripts, or arbitrary styling. Icons and tones where available are allow-listed. String fields are plain data: the parser does **not** sanitize or reject HTML, CSS, URLs, or script-like text within strings; consumers must render text safely. Required strings must contain non-whitespace; optional strings can be empty. Length checks use JavaScript string length, and strings are preserved rather than trimmed.

Across a note, at most 40 `visual` and `sequence` blocks combined, 1,000 visual nodes, and 1,000 sequence events are allowed. Block counts include invalid blocks; node and event totals include only successfully parsed blocks.

## Scope

V1 has no arbitrary positioned graph edges, node references in arrows, custom icons, colors, styles, or executable behavior. Arrows are layout nodes, not connections between IDs.

## Valid example

From `VISUAL_EXAMPLES.timeline` in `visual.examples.ts`:

```visual
{
  "version": 1,
  "title": "Deployment timeline",
  "root": {
    "type": "timeline",
    "items": [
      {
        "label": "1",
        "title": "Merge",
        "description": "Pull request lands on main",
        "icon": "git-branch"
      },
      {
        "label": "2",
        "title": "Build",
        "description": "Type-check, test and bundle",
        "icon": "package"
      },
      {
        "label": "3",
        "title": "Deploy",
        "description": "Vercel publishes the build",
        "icon": "rocket",
        "tone": "success"
      }
    ]
  }
}
```

## Invalid examples

Each block is valid JSON but fails format validation. Diagnostics below use the formatted issue path and message.

```visual
{"version":2,"root":{"type":"divider"}}
```

`version: unsupported version 2; this reader supports version 1.`

```visual
{"version":1,"root":{"type":"grid","columns":7,"children":[{"type":"divider"}]}}
```

`root.columns: must be a whole number from 1 to 6.`

```visual
{"version":1,"root":{"type":"card","title":"A","color":"red"}}
```

`root.color: unexpected property "color". Allowed: type, id, title, description, icon, tone.`

```visual
{"version":1,"root":{"type":"badge","label":"","tone":"success"}}
```

`root.label: must not be empty.`
