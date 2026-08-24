// Canonical reference note embedded in the format guide and both AI prompts.
// Keep it representative of the reader features the authoring contract supports.
export const EXAMPLE_MARKDOWN = `# Docker Images

A short intro paragraph. This text appears before the first section and is
shown as the note's "preamble".

## 1. What Is an Image?

A Docker image is a **read-only template** used to create containers.

- Built in layers
- Immutable once created

### 1.1 Image vs Container

| Concept   | Description                |
| --------- | -------------------------- |
| Image     | The blueprint (read-only)  |
| Container | A running instance         |

## 2. Building an Image

\`\`\`dockerfile
FROM node:20
COPY . /app
RUN npm install
\`\`\`

\`\`\`mermaid
flowchart LR
  Source --> Image
  Image --> Container
\`\`\`

> Tip: keep layers small for faster builds.
`;
