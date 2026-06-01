/**
 * Composition-root tests for `piPermissionSystemExtension(pi)`.
 *
 * These run the real factory via the `makeFakePi()` harness and assert the
 * wiring contracts that unit tests cannot see: handler-registration
 * completeness, shared-instance contracts across factory invocations, teardown,
 * service↔gate registry sharing, and `ready`-after-publish ordering.
 *
 * Every test runs the factory, which mutates two process-global `Symbol.for()`
 * slots and reads `PI_CODING_AGENT_DIR`. The shared `beforeEach`/`afterEach`
 * isolate the agent dir to a tmpdir and clear both global slots so factory runs
 * do not leak across tests.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import piPermissionSystemExtension from "#src/index";
import { makeFakePi } from "#test/helpers/make-fake-pi";

const SERVICE_KEY = Symbol.for("@gotgenes/pi-permission-system:service");
const SUBAGENT_REGISTRY_KEY = Symbol.for(
  "@gotgenes/pi-permission-system:subagent-registry",
);

/** The six events the factory must register a handler for. */
const EXPECTED_HANDLERS = [
  "before_agent_start",
  "input",
  "resources_discover",
  "session_shutdown",
  "session_start",
  "tool_call",
];

let agentDir: string;

beforeEach(() => {
  agentDir = mkdtempSync(join(tmpdir(), "pi-perm-comp-root-"));
  vi.stubEnv("PI_CODING_AGENT_DIR", agentDir);
});

afterEach(() => {
  // Drop both process-global slots so factory runs do not leak across tests.
  const store = globalThis as Record<symbol, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Symbol-keyed global property
  delete store[SERVICE_KEY];
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Symbol-keyed global property
  delete store[SUBAGENT_REGISTRY_KEY];
  vi.unstubAllEnvs();
  rmSync(agentDir, { recursive: true, force: true });
});

describe("event-handler registration completeness", () => {
  it("registers a handler for every required event exactly once", () => {
    const pi = makeFakePi();
    piPermissionSystemExtension(pi as unknown as ExtensionAPI);

    expect([...pi.handlers.keys()].sort()).toEqual(EXPECTED_HANDLERS);
  });
});
