export const SUPPORTED_DIAGRAM_LANGUAGES = ["mermaid"] as const;

export type SupportedDiagramLanguage = (typeof SUPPORTED_DIAGRAM_LANGUAGES)[number];
