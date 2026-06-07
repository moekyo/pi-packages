import { describe, expect, test } from "vitest";

import {
  type ToolAccessExtractor,
  ToolAccessExtractorRegistry,
} from "#src/tool-access-extractor-registry";

const noopExtractor: ToolAccessExtractor = () => undefined;

describe("ToolAccessExtractorRegistry", () => {
  describe("register", () => {
    test("stores an extractor so get() returns it", () => {
      const registry = new ToolAccessExtractorRegistry();
      registry.register("my-tool", noopExtractor);
      expect(registry.get("my-tool")).toBe(noopExtractor);
    });

    test("returns a disposer that removes the extractor", () => {
      const registry = new ToolAccessExtractorRegistry();
      const dispose = registry.register("my-tool", noopExtractor);
      dispose();
      expect(registry.get("my-tool")).toBeUndefined();
    });

    test("throws when an extractor is already registered for the same tool name", () => {
      const registry = new ToolAccessExtractorRegistry();
      registry.register("my-tool", noopExtractor);
      expect(() => registry.register("my-tool", () => undefined)).toThrow(
        "my-tool",
      );
    });

    test("allows registering different tool names independently", () => {
      const registry = new ToolAccessExtractorRegistry();
      const extractorA: ToolAccessExtractor = () => undefined;
      const extractorB: ToolAccessExtractor = () => undefined;
      registry.register("tool-a", extractorA);
      registry.register("tool-b", extractorB);
      expect(registry.get("tool-a")).toBe(extractorA);
      expect(registry.get("tool-b")).toBe(extractorB);
    });
  });

  describe("disposer identity guard", () => {
    test("stale disposer does not evict a later registration", () => {
      const registry = new ToolAccessExtractorRegistry();
      const first: ToolAccessExtractor = () => undefined;
      const second: ToolAccessExtractor = () => undefined;

      const disposeFirst = registry.register("my-tool", first);
      disposeFirst();

      registry.register("my-tool", second);
      disposeFirst();

      expect(registry.get("my-tool")).toBe(second);
    });
  });
});
