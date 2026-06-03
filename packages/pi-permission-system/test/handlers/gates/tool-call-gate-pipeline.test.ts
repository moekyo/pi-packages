import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToolCallGatePipeline } from "#src/handlers/gates/tool-call-gate-pipeline";

import {
  makeGateInputs,
  makeGateRunner,
  makeResolver,
  makeTcc,
} from "#test/helpers/gate-fixtures";
import { makeCheckResult } from "#test/helpers/handler-fixtures";

// ── BashProgram.parse mock ─────────────────────────────────────────────────

const { mockBashProgramParse } = vi.hoisted(() => ({
  mockBashProgramParse: vi.fn(),
}));

vi.mock("#src/handlers/gates/bash-program", () => ({
  BashProgram: { parse: mockBashProgramParse },
}));

function makeMockBashProgram() {
  return {
    commands: vi.fn<() => []>(() => []),
    pathTokens: vi.fn<() => []>(() => []),
    externalPaths: vi.fn<() => []>(() => []),
  };
}

// ── ToolCallGatePipeline ───────────────────────────────────────────────────

describe("ToolCallGatePipeline", () => {
  beforeEach(() => {
    mockBashProgramParse.mockReset();
    mockBashProgramParse.mockResolvedValue(makeMockBashProgram());
  });

  // ── non-bash tools ───────────────────────────────────────────────────────

  describe("evaluate — non-bash tool", () => {
    it("returns allow when all gates pass", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      const result = await pipeline.evaluate(
        makeTcc({ toolName: "read", input: {} }),
        runner,
      );

      expect(result).toEqual({ action: "allow" });
    });

    it("returns block when the tool gate denies", async () => {
      const { resolve } = makeResolver(
        makeCheckResult({ state: "deny", matchedPattern: "*" }),
      );
      const inputs = makeGateInputs({ resolve });
      const { runner } = makeGateRunner({ resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      const result = await pipeline.evaluate(
        makeTcc({ toolName: "read", input: {} }),
        runner,
      );

      expect(result).toMatchObject({ action: "block" });
    });

    it("short-circuits after the first blocking gate without evaluating later ones", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner();
      const runSpy = vi
        .spyOn(runner, "run")
        .mockResolvedValue({ action: "block", reason: "first gate blocked" });

      const pipeline = new ToolCallGatePipeline(inputs);
      const result = await pipeline.evaluate(
        makeTcc({ toolName: "read", input: {} }),
        runner,
      );

      expect(result).toEqual({ action: "block", reason: "first gate blocked" });
      // Pipeline looped to the first gate, got block, and stopped — not all 6 gates.
      expect(runSpy).toHaveBeenCalledTimes(1);
    });

    it("calls getToolPreviewLimits() during evaluate", async () => {
      const getToolPreviewLimits = vi.fn(() => ({
        toolInputPreviewMaxLength: 500,
        toolTextSummaryMaxLength: 100,
        toolInputLogPreviewMaxLength: 200,
      }));
      const inputs = makeGateInputs({ getToolPreviewLimits });
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(makeTcc({ toolName: "read", input: {} }), runner);

      expect(getToolPreviewLimits).toHaveBeenCalled();
    });

    it("calls getInfrastructureReadDirs() during evaluate", async () => {
      const getInfrastructureReadDirs = vi.fn<() => string[]>(() => []);
      const inputs = makeGateInputs({ getInfrastructureReadDirs });
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(makeTcc({ toolName: "read", input: {} }), runner);

      expect(getInfrastructureReadDirs).toHaveBeenCalled();
    });

    it("calls getActiveSkillEntries() during evaluate", async () => {
      const getActiveSkillEntries = vi.fn<() => []>(() => []);
      const inputs = makeGateInputs({ getActiveSkillEntries });
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(makeTcc({ toolName: "read", input: {} }), runner);

      expect(getActiveSkillEntries).toHaveBeenCalled();
    });

    it("does not call BashProgram.parse for non-bash tools", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(makeTcc({ toolName: "read", input: {} }), runner);

      expect(mockBashProgramParse).not.toHaveBeenCalled();
    });
  });

  // ── bash tool ────────────────────────────────────────────────────────────

  describe("evaluate — bash tool", () => {
    it("returns allow when the bash command is permitted", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      const result = await pipeline.evaluate(
        makeTcc({ toolName: "bash", input: { command: "echo hello" } }),
        runner,
      );

      expect(result).toEqual({ action: "allow" });
    });

    it("parses BashProgram exactly once per evaluate for bash tools with a command", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(
        makeTcc({ toolName: "bash", input: { command: "echo hello" } }),
        runner,
      );

      expect(mockBashProgramParse).toHaveBeenCalledTimes(1);
      expect(mockBashProgramParse).toHaveBeenCalledWith("echo hello");
    });

    it("does not parse BashProgram when the bash command is empty", async () => {
      const inputs = makeGateInputs();
      const { runner } = makeGateRunner({ resolve: inputs.resolve });
      const pipeline = new ToolCallGatePipeline(inputs);

      await pipeline.evaluate(
        makeTcc({ toolName: "bash", input: { command: "" } }),
        runner,
      );

      expect(mockBashProgramParse).not.toHaveBeenCalled();
    });
  });
});
