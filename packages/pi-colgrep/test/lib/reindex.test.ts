import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Exec } from "../../src/lib/exec.js";
import { createReindexer } from "../../src/lib/reindex.js";

// ---- shared factory ----

function makeExec(): Mock<Exec> {
  return vi.fn<Exec>();
}

function makeOnStatus(): Mock<(status: string | undefined) => void> {
  return vi.fn<(status: string | undefined) => void>();
}

// ---- Cycle 1: basic reindex execution ----

describe("createReindexer — runNow()", () => {
  let exec: Mock<Exec>;
  let onStatus: Mock<(status: string | undefined) => void>;

  beforeEach(() => {
    exec = makeExec();
    onStatus = makeOnStatus();
  });

  it("calls colgrep init -y . with configured cwd and default timeout", async () => {
    exec.mockResolvedValue({ stdout: "", stderr: "", code: 0 });
    const reindexer = createReindexer({ exec, cwd: "/project", onStatus });
    await reindexer.runNow();
    expect(exec).toHaveBeenCalledWith("colgrep", ["init", "-y", "."], {
      cwd: "/project",
      timeout: 300_000,
    });
  });

  it("respects a custom timeoutMs", async () => {
    exec.mockResolvedValue({ stdout: "", stderr: "", code: 0 });
    const reindexer = createReindexer({
      exec,
      cwd: "/project",
      onStatus,
      timeoutMs: 60_000,
    });
    await reindexer.runNow();
    expect(exec).toHaveBeenCalledWith("colgrep", ["init", "-y", "."], {
      cwd: "/project",
      timeout: 60_000,
    });
  });

  it("calls onStatus with indexing text before exec runs", async () => {
    let statusAtExecTime: string | undefined = "not set";
    exec.mockImplementation(async () => {
      // Capture the most recent onStatus call at the moment exec fires
      statusAtExecTime = onStatus.mock.calls.at(-1)?.[0] as string | undefined;
      return { stdout: "", stderr: "", code: 0 };
    });
    const reindexer = createReindexer({ exec, cwd: "/project", onStatus });
    await reindexer.runNow();
    expect(statusAtExecTime).toBe("colgrep: indexing\u2026");
  });

  it("clears status with undefined after successful run", async () => {
    exec.mockResolvedValue({ stdout: "", stderr: "", code: 0 });
    const reindexer = createReindexer({ exec, cwd: "/project", onStatus });
    await reindexer.runNow();
    expect(onStatus).toHaveBeenLastCalledWith(undefined);
  });

  it("resolves without throwing on success", async () => {
    exec.mockResolvedValue({ stdout: "", stderr: "", code: 0 });
    const reindexer = createReindexer({ exec, cwd: "/project", onStatus });
    await expect(reindexer.runNow()).resolves.toBeUndefined();
  });
});
