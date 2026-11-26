import type { SequenceDocument } from "./sequence.types.js";

// Canonical examples, serialised from typed documents and parsed by the package tests (see visual.examples.ts).

const mcpToolCall: SequenceDocument = {
  version: 1,
  title: "Creating a note through MCP",
  participants: [
    { id: "user", label: "User", kind: "actor" },
    { id: "host", label: "AI host" },
    { id: "model", label: "LLM" },
    { id: "mcp", label: "MCP server", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
  ],
  events: [
    { type: "message", from: "user", to: "host", label: "Create a Java note" },
    { type: "message", from: "host", to: "model", label: "Context and tools" },
    { type: "message", from: "model", to: "host", label: "Request create_note", kind: "response" },
    { type: "message", from: "host", to: "mcp", label: "tools/call" },
    { type: "activate", participant: "mcp" },
    { type: "message", from: "mcp", to: "db", label: "Persist note" },
    { type: "message", from: "db", to: "mcp", label: "Created note", kind: "response" },
    { type: "deactivate", participant: "mcp" },
    { type: "note", over: ["host", "model"], text: "Prepare the final response" },
    { type: "message", from: "mcp", to: "host", label: "Note URL", kind: "response" },
    { type: "message", from: "host", to: "user", label: "Confirmation and link", kind: "response" },
  ],
};

const loginWithGroups: SequenceDocument = {
  version: 1,
  title: "User login with retry",
  participants: [
    { id: "client", label: "Client", kind: "actor" },
    { id: "api", label: "API", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
  ],
  events: [
    { type: "message", from: "client", to: "api", label: "POST /login" },
    { type: "activate", participant: "api" },
    { type: "message", from: "api", to: "api", label: "Hash and compare password" },
    {
      type: "group",
      kind: "alt",
      branches: [
        {
          label: "Credentials are valid",
          events: [
            { type: "message", from: "api", to: "db", label: "Store session" },
            { type: "message", from: "api", to: "client", label: "200 and tokens", kind: "response" },
          ],
        },
        {
          label: "Credentials are invalid",
          events: [
            {
              type: "group",
              kind: "opt",
              label: "Too many attempts",
              branches: [{ events: [{ type: "message", from: "api", to: "client", label: "429 Too Many Requests", kind: "response" }] }],
            },
            { type: "message", from: "api", to: "client", label: "401 Unauthorized", kind: "response" },
          ],
        },
      ],
    },
    { type: "deactivate", participant: "api" },
  ],
};

const parallelAndLoop: SequenceDocument = {
  version: 1,
  title: "Fan-out with polling",
  participants: [
    { id: "app", label: "App" },
    { id: "search", label: "Search service", kind: "service" },
    { id: "cache", label: "Cache", kind: "database" },
  ],
  events: [
    {
      type: "group",
      kind: "par",
      branches: [
        { label: "Search", events: [{ type: "message", from: "app", to: "search", label: "Query", kind: "async" }] },
        { label: "Cache", events: [{ type: "message", from: "app", to: "cache", label: "Lookup", kind: "async" }] },
      ],
    },
    { type: "divider", label: "Results arrive" },
    {
      type: "group",
      kind: "loop",
      label: "Every 5 seconds",
      branches: [{ events: [{ type: "message", from: "app", to: "search", label: "Poll status" }, { type: "message", from: "search", to: "app", label: "Status", kind: "response" }] }],
    },
  ],
};

export const SEQUENCE_EXAMPLES = {
  mcpToolCall: JSON.stringify(mcpToolCall, null, 2),
  loginWithGroups: JSON.stringify(loginWithGroups, null, 2),
  parallelAndLoop: JSON.stringify(parallelAndLoop, null, 2),
} as const;

/** What the editor inserts for "Insert sequence diagram": a small valid starter the author edits. */
export const SEQUENCE_TEMPLATE = JSON.stringify(
  {
    version: 1,
    title: "Diagram title",
    participants: [
      { id: "client", label: "Client", kind: "actor" },
      { id: "server", label: "Server", kind: "service" },
    ],
    events: [
      { type: "message", from: "client", to: "server", label: "Request" },
      { type: "message", from: "server", to: "client", label: "Response", kind: "response" },
    ],
  } satisfies SequenceDocument,
  null,
  2,
);
