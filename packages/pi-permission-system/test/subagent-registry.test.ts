import { afterEach, describe, expect, test } from "vitest";
import {
  getSubagentSessionRegistry,
  type SubagentSessionInfo,
  SubagentSessionRegistry,
} from "#src/subagent-registry";

const REGISTRY_KEY = Symbol.for(
  "@gotgenes/pi-permission-system:subagent-registry",
);

function makeInfo(
  overrides: Partial<SubagentSessionInfo> = {},
): SubagentSessionInfo {
  return {
    agentName: "Explore",
    ...overrides,
  };
}

describe("SubagentSessionRegistry", () => {
  test("has() returns false for an unregistered key", () => {
    const registry = new SubagentSessionRegistry();
    expect(registry.has("/sessions/task-abc")).toBe(false);
  });

  test("get() returns undefined for an unregistered key", () => {
    const registry = new SubagentSessionRegistry();
    expect(registry.get("/sessions/task-abc")).toBeUndefined();
  });

  test("has() returns true after register()", () => {
    const registry = new SubagentSessionRegistry();
    registry.register("/sessions/task-abc", makeInfo());
    expect(registry.has("/sessions/task-abc")).toBe(true);
  });

  test("get() returns the registered info after register()", () => {
    const registry = new SubagentSessionRegistry();
    const info = makeInfo({ parentSessionId: "parent-123" });
    registry.register("/sessions/task-abc", info);
    expect(registry.get("/sessions/task-abc")).toEqual(info);
  });

  test("register() stores agentName without parentSessionId", () => {
    const registry = new SubagentSessionRegistry();
    registry.register("/sessions/task-abc", makeInfo());
    expect(registry.get("/sessions/task-abc")).toEqual({
      agentName: "Explore",
    });
  });

  test("has() returns false after unregister()", () => {
    const registry = new SubagentSessionRegistry();
    registry.register("/sessions/task-abc", makeInfo());
    registry.unregister("/sessions/task-abc");
    expect(registry.has("/sessions/task-abc")).toBe(false);
  });

  test("get() returns undefined after unregister()", () => {
    const registry = new SubagentSessionRegistry();
    registry.register("/sessions/task-abc", makeInfo());
    registry.unregister("/sessions/task-abc");
    expect(registry.get("/sessions/task-abc")).toBeUndefined();
  });

  test("unregister() is a no-op for an unknown key", () => {
    const registry = new SubagentSessionRegistry();
    expect(() => registry.unregister("/sessions/nonexistent")).not.toThrow();
  });

  test("register() overwrites a previous entry for the same key", () => {
    const registry = new SubagentSessionRegistry();
    registry.register(
      "/sessions/task-abc",
      makeInfo({ parentSessionId: "parent-1" }),
    );
    registry.register(
      "/sessions/task-abc",
      makeInfo({ parentSessionId: "parent-2" }),
    );
    expect(registry.get("/sessions/task-abc")?.parentSessionId).toBe(
      "parent-2",
    );
  });

  test("multiple keys are independent", () => {
    const registry = new SubagentSessionRegistry();
    registry.register("/sessions/task-1", makeInfo({ agentName: "Explore" }));
    registry.register("/sessions/task-2", makeInfo({ agentName: "Plan" }));

    expect(registry.get("/sessions/task-1")?.agentName).toBe("Explore");
    expect(registry.get("/sessions/task-2")?.agentName).toBe("Plan");

    registry.unregister("/sessions/task-1");
    expect(registry.has("/sessions/task-1")).toBe(false);
    expect(registry.has("/sessions/task-2")).toBe(true);
  });
});

// ── process-global accessor ────────────────────────────────────────────────

describe("getSubagentSessionRegistry (process-global accessor)", () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Symbol-keyed global property; Map.delete() is not applicable
    delete (globalThis as Record<symbol, unknown>)[REGISTRY_KEY];
  });

  test("returns a SubagentSessionRegistry instance", () => {
    const registry = getSubagentSessionRegistry();
    expect(registry).toBeInstanceOf(SubagentSessionRegistry);
  });

  test("returns the same instance on repeated calls", () => {
    const first = getSubagentSessionRegistry();
    const second = getSubagentSessionRegistry();
    expect(first).toBe(second);
  });

  test("state registered through one call is visible through another call", () => {
    const writer = getSubagentSessionRegistry();
    writer.register("/sessions/child-tasks", {
      agentName: "Explore",
      parentSessionId: "parent-abc",
    });

    const reader = getSubagentSessionRegistry();
    expect(reader.has("/sessions/child-tasks")).toBe(true);
    expect(reader.get("/sessions/child-tasks")?.parentSessionId).toBe(
      "parent-abc",
    );
  });

  test("starts empty on first call", () => {
    const registry = getSubagentSessionRegistry();
    expect(registry.has("/sessions/any-key")).toBe(false);
  });
});
