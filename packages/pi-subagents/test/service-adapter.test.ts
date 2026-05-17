import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubagentsService } from "../src/service.js";
import { createSubagentsService, toSubagentRecord } from "../src/service-adapter.js";
import type { AgentRecord } from "../src/types.js";

describe("toSubagentRecord", () => {
  const baseRecord: AgentRecord = {
    id: "abc-123",
    type: "Explore",
    description: "Check stale TODOs",
    status: "completed",
    result: "Found 3 stale TODOs",
    toolUses: 5,
    startedAt: 1000,
    completedAt: 2000,
    lifetimeUsage: { input: 100, output: 200, cacheWrite: 50 },
    compactionCount: 1,
    worktreeResult: { hasChanges: true, branch: "agent/abc-123" },
  };

  it("includes all serializable fields", () => {
    const result = toSubagentRecord(baseRecord);
    expect(result).toEqual({
      id: "abc-123",
      type: "Explore",
      description: "Check stale TODOs",
      status: "completed",
      result: "Found 3 stale TODOs",
      toolUses: 5,
      startedAt: 1000,
      completedAt: 2000,
      lifetimeUsage: { input: 100, output: 200, cacheWrite: 50 },
      compactionCount: 1,
      worktreeResult: { hasChanges: true, branch: "agent/abc-123" },
    });
  });

  it("strips session from the record", () => {
    const record = { ...baseRecord, session: { dispose: () => {} } as any };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("session");
  });

  it("strips abortController from the record", () => {
    const record = { ...baseRecord, abortController: new AbortController() };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("abortController");
  });

  it("strips promise from the record", () => {
    const record = { ...baseRecord, promise: Promise.resolve("done") };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("promise");
  });

  it("strips pendingSteers from the record", () => {
    const record = { ...baseRecord, pendingSteers: ["hurry up"] };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("pendingSteers");
  });

  it("strips outputCleanup from the record", () => {
    const record = { ...baseRecord, outputCleanup: () => {} };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("outputCleanup");
  });

  it("strips resultConsumed, toolCallId, outputFile, worktree, invocation", () => {
    const record = {
      ...baseRecord,
      resultConsumed: true,
      toolCallId: "tool-1",
      outputFile: "/tmp/out.jsonl",
      worktree: { path: "/tmp/wt", branch: "wt-branch" },
      invocation: { modelName: "haiku" },
    };
    const result = toSubagentRecord(record);
    expect(result).not.toHaveProperty("resultConsumed");
    expect(result).not.toHaveProperty("toolCallId");
    expect(result).not.toHaveProperty("outputFile");
    expect(result).not.toHaveProperty("worktree");
    expect(result).not.toHaveProperty("invocation");
  });

  it("omits optional fields when undefined on the source", () => {
    const minimal: AgentRecord = {
      id: "min-1",
      type: "general-purpose",
      description: "test",
      status: "running",
      toolUses: 0,
      startedAt: 500,
      lifetimeUsage: { input: 0, output: 0, cacheWrite: 0 },
      compactionCount: 0,
    };
    const result = toSubagentRecord(minimal);
    expect(result).toEqual({
      id: "min-1",
      type: "general-purpose",
      description: "test",
      status: "running",
      toolUses: 0,
      startedAt: 500,
      lifetimeUsage: { input: 0, output: 0, cacheWrite: 0 },
      compactionCount: 0,
    });
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("completedAt");
    expect(result).not.toHaveProperty("worktreeResult");
  });
});

describe("createSubagentsService — getRecord and listAgents", () => {
  const recordA: AgentRecord = {
    id: "a-1",
    type: "Explore",
    description: "task A",
    status: "completed",
    toolUses: 3,
    startedAt: 1000,
    completedAt: 2000,
    lifetimeUsage: { input: 10, output: 20, cacheWrite: 5 },
    compactionCount: 0,
    session: { dispose: () => {} } as any,
    abortController: new AbortController(),
  };

  const recordB: AgentRecord = {
    id: "b-2",
    type: "Plan",
    description: "task B",
    status: "running",
    toolUses: 1,
    startedAt: 3000,
    lifetimeUsage: { input: 5, output: 10, cacheWrite: 0 },
    compactionCount: 0,
  };

  function createMockManager(records: AgentRecord[]) {
    return {
      spawn: vi.fn(() => "id"),
      getRecord: vi.fn((id: string) => records.find((r) => r.id === id)),
      listAgents: vi.fn(() => [...records].sort((a, b) => b.startedAt - a.startedAt)),
      abort: vi.fn(() => true),
      waitForAll: vi.fn(async () => {}),
      hasRunning: vi.fn(() => false),
    };
  }

  function createService(records: AgentRecord[]): SubagentsService {
    const manager = createMockManager(records);
    return createSubagentsService({
      manager,
      resolveModel: () => ({ id: "test" }),
      getCtx: () => ({ pi: {}, ctx: {} }),
      getModelRegistry: () => ({ find: () => null, getAll: () => [] }),
    });
  }

  it("getRecord returns serialized record for known id", () => {
    const svc = createService([recordA, recordB]);
    const result = svc.getRecord("a-1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("a-1");
    expect(result).not.toHaveProperty("session");
    expect(result).not.toHaveProperty("abortController");
  });

  it("getRecord returns undefined for unknown id", () => {
    const svc = createService([recordA]);
    expect(svc.getRecord("unknown")).toBeUndefined();
  });

  it("listAgents returns serialized records sorted by startedAt descending", () => {
    const svc = createService([recordA, recordB]);
    const list = svc.listAgents();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("b-2");
    expect(list[1].id).toBe("a-1");
    // Verify serialization
    expect(list[0]).not.toHaveProperty("session");
    expect(list[1]).not.toHaveProperty("abortController");
  });
});
