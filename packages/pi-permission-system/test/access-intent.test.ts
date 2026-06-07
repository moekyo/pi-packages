import { describe, expect, it } from "vitest";

import {
  getToolAccessIntents,
  getToolPathValues,
  type ToolAccessExtractor,
  type ToolAccessExtractorLookup,
} from "#src/access-intent";

function makeLookup(
  toolName: string,
  extractor: ToolAccessExtractor,
): ToolAccessExtractorLookup {
  return {
    get(name) {
      return name === toolName ? extractor : undefined;
    },
  };
}

describe("getToolAccessIntents", () => {
  it("extracts built-in file tool paths from input.path", () => {
    expect(getToolAccessIntents("read", { path: "/src/app.ts" })).toEqual([
      {
        resource: "path",
        operation: "read",
        value: "/src/app.ts",
        confidence: "explicit",
        source: "builtin",
        toolName: "read",
      },
    ]);
  });

  it("extracts MCP argument paths without treating top-level MCP path as a file", () => {
    expect(getToolPathValues("mcp", { path: "/ignored" })).toEqual([]);
    expect(
      getToolPathValues("mcp", {
        tool: "workspace:read",
        arguments: { path: "/workspace/README.md" },
      }),
    ).toEqual(["/workspace/README.md"]);
  });

  it("uses input.path as the default extension-tool convention", () => {
    expect(
      getToolAccessIntents("ffgrep", {
        pattern: "needle",
        path: "/workspace/src",
      }),
    ).toEqual([
      {
        resource: "path",
        operation: "unknown",
        value: "/workspace/src",
        confidence: "explicit",
        source: "extension",
        toolName: "ffgrep",
      },
    ]);
  });

  it("uses a registered extractor for extension tools with custom input shapes", () => {
    const lookup = makeLookup("ffgrep", (input) => ({
      resource: "path",
      operation: "search",
      value: String(input.root),
    }));

    expect(
      getToolAccessIntents(
        "ffgrep",
        { pattern: "needle", root: "/workspace/src" },
        lookup,
      ),
    ).toEqual([
      {
        resource: "path",
        operation: "search",
        value: "/workspace/src",
        confidence: "explicit",
        source: "extension",
        toolName: "ffgrep",
      },
    ]);
  });

  it("returns no path intent for bash or pathless extension tools", () => {
    expect(getToolPathValues("bash", { command: "cat .env" })).toEqual([]);
    expect(getToolPathValues("ffgrep", { pattern: "needle" })).toEqual([]);
  });
});
