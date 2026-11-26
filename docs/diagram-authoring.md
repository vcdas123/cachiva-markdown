# Choosing a diagram block

Choose the simplest format that expresses the content. Follow the format's limits and validate generated notes.

| Need | Choose |
| --- | --- |
| Structured cards, layouts, comparisons, or timelines | [visual](visual-format.md) |
| Ordered interactions among participants, activations, or alternatives | [sequence](sequence-format.md) |
| Small node-and-arrow chains or decisions | `flow` (up to 40 nodes) |
| A diagram needing Mermaid syntax or a larger flow | `mermaid` |
| A tree | `tree` |
| An array | `array` |
| Alternate views organized by labels | `tabs` |
| Text, a list, or a table communicates the idea clearly | Plain Markdown |

For `visual` and `sequence`, emit JSON with `version: 1`, use only documented fields and values, and check parser diagnostics. A visual arrow is a layout element; use a flow or Mermaid diagram for connected graphs.
