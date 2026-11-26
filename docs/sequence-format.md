# Sequence block format (v1)

Use a `sequence` fenced block containing one JSON object. Version is required and must be the number `1`; missing or unknown versions are rejected. Unknown properties and event types are rejected, so producers must target the reader's supported vocabulary; newer formats require reader support.

## Document and participants

| Property | Required | Value |
| --- | --- | --- |
| `version` | Yes | `1` |
| `title` | No | String, at most 200 characters |
| `participants` | Yes | 2–20 participant objects |
| `events` | Yes | 1–250 events |

| Participant property | Required | Value |
| --- | --- | --- |
| `id` | Yes | Unique identifier; starts with an ASCII letter and contains only ASCII letters, digits, `_` or `-`, up to 40 characters |
| `label` | Yes | Nonblank string, at most 80 characters |
| `kind` | No | `participant`, `actor`, `service`, `database` |

## Events

Each event requires the listed `type`. Participant references must name declared IDs. Required strings are nonblank.

| Type | Required properties | Optional properties and values |
| --- | --- | --- |
| `message` | `from`, `to` (participant IDs), `label` (string, up to 500 characters) | `kind`: `request` (default), `response`, `async` |
| `note` | `over` (array of 1 or 2 participant IDs; two must differ), `text` (string, up to 2,000 characters) | — |
| `activate`, `deactivate` | `participant` (participant ID) | — |
| `divider` | `label` (string, up to 200 characters) | — |
| `group` | `kind` (`alt`, `opt`, `loop`, `par`), `branches` | `label` (string, up to 200 characters) |

A message may target its own sender. A branch is an object with required `events` (1–250 events) and optional `label` (string, up to 200 characters). Branch counts: `alt` and `par` require 2–10; `opt` and `loop` require exactly 1. Groups may nest at most 8 levels. The total limit is 250 events per block, including groups and all events nested in branches.

Activations are counted per participant and can nest. A deactivation requires an open activation. Every branch starts with the activation counts at its group's opening and must end with those same counts: activations opened or closed inside each branch must balance. All activations must be closed by the end of the document.

## Validation and security

The body is JSON, with a maximum UTF-8 source size of 64 KiB and raw JSON nesting of 48. Objects reject unknown properties and the keys `__proto__`, `constructor`, and `prototype`. The parser returns `{ ok: true, document }` on success or `{ ok: false, issues }` on failure; each issue has a machine-readable `code`, a `message`, and a `path` array of property names and array indices. At most 20 issues are collected. Formatted diagnostics use paths such as `events[0].type`; the root is `(root)`.

There are no schema properties for HTML, CSS, URLs, scripts, or arbitrary styling. Icons and tones where available are allow-listed. String fields are plain data: the parser does **not** sanitize or reject HTML, CSS, URLs, or script-like text within strings; consumers must render text safely. Required strings must contain non-whitespace; optional strings can be empty. Length checks use JavaScript string length, and strings are preserved rather than trimmed.

Across a note, at most 40 `visual` and `sequence` blocks combined, 1,000 visual nodes, and 1,000 sequence events are allowed. Block counts include invalid blocks; node and event totals include only successfully parsed blocks.

## Scope

V1 models only the participant and event types above. It has no custom icons, tones, colors, styles, arbitrary executable behavior, or extra event properties.

## Valid example

From `SEQUENCE_EXAMPLES.parallelAndLoop` in `sequence.examples.ts`:

```sequence
{
  "version": 1,
  "title": "Fan-out with polling",
  "participants": [
    {
      "id": "app",
      "label": "App"
    },
    {
      "id": "search",
      "label": "Search service",
      "kind": "service"
    },
    {
      "id": "cache",
      "label": "Cache",
      "kind": "database"
    }
  ],
  "events": [
    {
      "type": "group",
      "kind": "par",
      "branches": [
        {
          "label": "Search",
          "events": [
            {
              "type": "message",
              "from": "app",
              "to": "search",
              "label": "Query",
              "kind": "async"
            }
          ]
        },
        {
          "label": "Cache",
          "events": [
            {
              "type": "message",
              "from": "app",
              "to": "cache",
              "label": "Lookup",
              "kind": "async"
            }
          ]
        }
      ]
    },
    {
      "type": "divider",
      "label": "Results arrive"
    },
    {
      "type": "group",
      "kind": "loop",
      "label": "Every 5 seconds",
      "branches": [
        {
          "events": [
            {
              "type": "message",
              "from": "app",
              "to": "search",
              "label": "Poll status"
            },
            {
              "type": "message",
              "from": "search",
              "to": "app",
              "label": "Status",
              "kind": "response"
            }
          ]
        }
      ]
    }
  ]
}
```

## Invalid examples

Each block is valid JSON but fails format validation. Diagnostics below use the formatted issue path and message.

```sequence
{"version":2,"participants":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"events":[{"type":"divider","label":"End"}]}
```

`version: unsupported version 2; this reader supports version 1.`

```sequence
{"version":1,"participants":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"events":[{"type":"message","from":"a","to":"c","label":"Hi"}]}
```

`events[0].to: references an unknown participant "c".`

```sequence
{"version":1,"participants":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"events":[{"type":"deactivate","participant":"a"}]}
```

`events[0]: "a" has no open activation to deactivate.`

```sequence
{"version":1,"participants":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"events":[{"type":"group","kind":"alt","branches":[{"events":[{"type":"divider","label":"One"}]}]}]}
```

`events[0].branches: an `alt` group needs 2 to 10 branches; found 1.`
