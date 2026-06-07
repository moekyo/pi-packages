import { getNonEmptyString, toRecord } from "./common";

export type ToolAccessResource = "path";
export type ToolAccessOperation =
  | "read"
  | "write"
  | "edit"
  | "search"
  | "list"
  | "unknown";
export type ToolAccessSource = "builtin" | "extension" | "mcp";
export type ToolAccessConfidence = "explicit";

export interface ToolAccessIntent {
  resource: ToolAccessResource;
  operation: ToolAccessOperation;
  value: string;
  confidence: ToolAccessConfidence;
  source: ToolAccessSource;
  toolName: string;
}

export type ToolAccessIntentDeclaration = {
  resource: ToolAccessResource;
  value: string;
  operation?: ToolAccessOperation;
  confidence?: ToolAccessConfidence;
};

export type ToolAccessExtractor = (
  input: Record<string, unknown>,
) => ToolAccessIntentDeclaration | undefined;

export interface ToolAccessExtractorLookup {
  get(toolName: string): ToolAccessExtractor | undefined;
}

export const PATH_BEARING_TOOLS: ReadonlySet<string> = new Set([
  "read",
  "write",
  "edit",
  "find",
  "grep",
  "ls",
]);

const BUILTIN_PATH_OPERATIONS: Record<string, ToolAccessOperation> = {
  read: "read",
  write: "write",
  edit: "edit",
  find: "search",
  grep: "search",
  ls: "list",
};

export function getToolAccessIntents(
  toolName: string,
  input: unknown,
  extractors?: ToolAccessExtractorLookup,
): ToolAccessIntent[] {
  if (toolName === "bash") {
    return [];
  }

  const record = toRecord(input);

  if (PATH_BEARING_TOOLS.has(toolName)) {
    return createPathIntent({
      toolName,
      source: "builtin",
      value: record.path,
      operation: BUILTIN_PATH_OPERATIONS[toolName] ?? "unknown",
    });
  }

  if (toolName === "mcp") {
    return isPlainRecord(record.arguments)
      ? createDefaultPathIntents({
          toolName,
          input: record.arguments,
          source: "mcp",
          operation: "unknown",
        })
      : [];
  }

  const custom = extractors?.get(toolName);
  if (custom) {
    return normalizeCustomIntents(toolName, custom(record));
  }

  return createDefaultPathIntents({
    toolName,
    input: record,
    source: "extension",
    operation: "unknown",
  });
}

export function getToolPathValues(
  toolName: string,
  input: unknown,
  extractors?: ToolAccessExtractorLookup,
): string[] {
  return getToolAccessIntents(toolName, input, extractors).map(
    (intent) => intent.value,
  );
}

function createDefaultPathIntents(options: {
  toolName: string;
  input: Record<string, unknown>;
  source: ToolAccessSource;
  operation: ToolAccessOperation;
}): ToolAccessIntent[] {
  return createPathIntent({
    toolName: options.toolName,
    source: options.source,
    value: options.input.path,
    operation: options.operation,
  });
}

function createPathIntent(options: {
  toolName: string;
  source: ToolAccessSource;
  value: unknown;
  operation: ToolAccessOperation;
}): ToolAccessIntent[] {
  const value = getNonEmptyString(options.value);
  if (!value) {
    return [];
  }
  return [
    {
      resource: "path",
      operation: options.operation,
      value,
      confidence: "explicit",
      source: options.source,
      toolName: options.toolName,
    },
  ];
}

function normalizeCustomIntents(
  toolName: string,
  declaration: ToolAccessIntentDeclaration | undefined,
): ToolAccessIntent[] {
  if (!declaration) {
    return [];
  }

  const value = getNonEmptyString(declaration.value);
  if (!value) {
    return [];
  }

  return [
    {
      resource: "path",
      operation: declaration.operation ?? "unknown",
      value,
      confidence: declaration.confidence ?? "explicit",
      source: "extension",
      toolName,
    },
  ];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
