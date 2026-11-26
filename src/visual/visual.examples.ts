import type { VisualDocument } from "./visual.types.js";

// Canonical examples. They are plain documents serialised with JSON.stringify, so they are valid JSON by construction, and
// the package tests parse every one of them with the real parser. The editor's "Insert visual" template, the authoring
// guide and the docs all reuse these, so the three can never drift apart.

const architecture: VisualDocument = {
  version: 1,
  title: "Cachiva backend architecture",
  root: {
    type: "column",
    children: [
      { type: "card", title: "React frontend", icon: "monitor", description: "Reader, editors and dashboards" },
      { type: "arrow", direction: "both", orientation: "vertical", label: "HTTPS" },
      {
        type: "container",
        title: "Express backend",
        tone: "accent",
        children: [
          {
            type: "grid",
            columns: 2,
            children: [
              { type: "card", title: "REST controllers", icon: "globe" },
              { type: "card", title: "MCP handlers", icon: "bot" },
            ],
          },
          { type: "arrow", direction: "forward", orientation: "vertical" },
          { type: "card", title: "Shared services", description: "Business rules and authorization" },
          { type: "arrow", direction: "forward", orientation: "vertical" },
          { type: "card", title: "Repositories" },
        ],
      },
      { type: "arrow", direction: "both", orientation: "vertical" },
      { type: "card", title: "PostgreSQL", icon: "database" },
    ],
  },
};

const comparison: VisualDocument = {
  version: 1,
  title: "REST versus MCP",
  root: {
    type: "grid",
    columns: 2,
    children: [
      {
        type: "container",
        title: "REST",
        icon: "globe",
        tone: "info",
        children: [
          { type: "text", text: "Resource-oriented endpoints called by the app." },
          { type: "badge", label: "Deterministic", tone: "success" },
        ],
      },
      {
        type: "container",
        title: "MCP",
        icon: "bot",
        tone: "accent",
        children: [
          { type: "text", text: "Tools an AI assistant discovers and calls." },
          { type: "badge", label: "Model-driven", tone: "warning" },
        ],
      },
    ],
  },
};

const timeline: VisualDocument = {
  version: 1,
  title: "Deployment timeline",
  root: {
    type: "timeline",
    items: [
      { label: "1", title: "Merge", description: "Pull request lands on main", icon: "git-branch" },
      { label: "2", title: "Build", description: "Type-check, test and bundle", icon: "package" },
      { label: "3", title: "Deploy", description: "Vercel publishes the build", icon: "rocket", tone: "success" },
    ],
  },
};

export const VISUAL_EXAMPLES = {
  architecture: JSON.stringify(architecture, null, 2),
  comparison: JSON.stringify(comparison, null, 2),
  timeline: JSON.stringify(timeline, null, 2),
} as const;

/** What the editor inserts for "Insert visual": a small valid starter the author edits. */
export const VISUAL_TEMPLATE = JSON.stringify(
  {
    version: 1,
    title: "Diagram title",
    root: {
      type: "column",
      children: [
        { type: "card", title: "Client", icon: "monitor" },
        { type: "arrow", direction: "both", orientation: "vertical" },
        { type: "card", title: "Server", icon: "server" },
      ],
    },
  } satisfies VisualDocument,
  null,
  2,
);
