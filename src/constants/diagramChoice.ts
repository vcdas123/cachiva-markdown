// The one place that says which diagram block to use when. The note guide, the authoring rules, the AI prompts and the
// MCP guide tool all read these constants, so every author (a person with an AI prompt, ChatGPT, Claude) gets the same advice.

/** Short form for rules and prompts. */
export const DIAGRAM_CHOICE_SUMMARY =
  "Choose each diagram by purpose, simplest first, unless the user asks for a specific format (then use exactly that): ```flow for a simple chain or one yes/no branch (up to about six steps); a ```mermaid flowchart for several decisions, loops, Yes/No branches or more than about six nodes (colour key nodes with `class A info|success|warning|danger|accent`); ```sequence for time-ordered messages between participants (request/response, login, API calls); ```visual only for architecture, layers, comparisons and timelines whose cards carry descriptions or icons, never for a plain chain of cards joined by arrows. Keep a diagram to about ten nodes with short labels, put a sentence above it saying what it shows, and never rewrite an existing diagram into another format unless asked.";

/** Full decision list, returned by the guide as `diagrams.choose_a_format`. */
export const DIAGRAM_CHOICE_RULES = [
  "Pick the simplest block that fits, in this order of preference. If the user asks for a particular diagram format, use exactly that and ignore the preference below.",
  "flow FIRST for anything simple: a chain `A -> B -> C` of up to about six steps, or a single yes/no branch (`cond? -yes-> X`, `cond? -no-> Y`), with `direction: right|down` and `caption: ...`.",
  "mermaid flowchart (```mermaid, `flowchart TD`) for several decisions, loops, labelled Yes/No branches or more than about six nodes: decisions are diamonds `D{Question?}`, branches `-->|Yes|`, loop-backs are ordinary edges, and `class A info`, `class B success`, `class C warning`, `class D danger`, `class E accent` colour key nodes with the app's own palette.",
  "mermaid `flowchart LR` for a longer left-to-right pipeline whose steps need a title and a subtitle: labels like `S1[\"Step 1<br/>User request\"]`.",
  "sequence for time-ordered messages between participants: requests, responses, activations, alt/opt/loop/par groups. A request/response lifecycle is a sequence, not a flowchart.",
  "visual only for architecture, nested containers, layers, comparisons, conceptual layouts and timelines, with cards that carry descriptions or icons, grids or containers. Never use visual for a plain chain of cards joined by arrows: that is a flow block.",
  "tree for tree data structures, array for indexed values. Use a table or plain prose when a diagram would not make it clearer.",
  "Every diagram: about ten nodes at most, a short label on each node, one sentence in the prose above saying what it shows, and never fake a flowchart with rows of cards joined by arrows.",
  "Never convert an existing diagram block to another format unless the user asks.",
] as const;

/** Ready-to-copy sources for the formats above. */
export const DIAGRAM_EXAMPLES = {
  simple_flow: "direction: right\ncaption: A request passes through the router to a handler.\nClient -> Router -> Handler -> Response",
  decision_flowchart: [
    "flowchart TD",
    "  A[Step 1: Receive user goal] --> B[Step 2: Call model with context]",
    "  B --> C{Step 3: Tool needed?}",
    "  C -->|Yes| D[Step 4: Execute tool]",
    "  D --> E[Step 5: Add result to context]",
    "  E --> B",
    "  C -->|No| F([Step 6: Final answer])",
    "  class A,B,D,E info",
    "  class C warning",
    "  class F success",
  ].join("\n"),
  step_pipeline: [
    "flowchart LR",
    '  S1["Step 1<br/>User request"] --> S2["Step 2<br/>Prepare context"]',
    '  S2 --> S3["Step 3<br/>List modules"]',
    '  S3 --> S4["Step 4<br/>Get module data"]',
    '  S4 --> S5(["Step 5<br/>Create note"])',
    "  class S1,S2,S3,S4 info",
    "  class S5 success",
  ].join("\n"),
} as const;
