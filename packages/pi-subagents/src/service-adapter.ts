/**
 * service-adapter.ts — Adapter that wraps AgentManager to satisfy SubagentsService.
 *
 * Handles model resolution at the API boundary, record serialization
 * (stripping non-serializable fields), and session gating.
 */

import type { ModelRegistry } from "./model-resolver.js";
import type { SubagentRecord, SubagentsService } from "./service.js";
import type { AgentRecord } from "./types.js";

/** Narrow interface for the AgentManager — avoids coupling to the concrete class. */
export interface AgentManagerLike {
  spawn(pi: unknown, ctx: unknown, type: string, prompt: string, options: unknown): string;
  getRecord(id: string): AgentRecord | undefined;
  listAgents(): AgentRecord[];
  abort(id: string): boolean;
  waitForAll(): Promise<void>;
  hasRunning(): boolean;
}

/** Dependencies injected into the adapter factory. */
export interface AdapterDeps {
  manager: AgentManagerLike;
  resolveModel: (input: string, registry: ModelRegistry) => unknown | string;
  getCtx: () => { pi: unknown; ctx: unknown } | undefined;
  getModelRegistry: () => ModelRegistry | undefined;
}

/** Create a SubagentsService backed by the given dependencies. */
export function createSubagentsService(deps: AdapterDeps): SubagentsService {
  const { manager } = deps;

  return {
    spawn(_type: string, _prompt: string, _options?) {
      // TODO: implement in step 4
      throw new Error("Not implemented");
    },

    getRecord(id: string): SubagentRecord | undefined {
      const record = manager.getRecord(id);
      return record ? toSubagentRecord(record) : undefined;
    },

    listAgents(): SubagentRecord[] {
      return manager.listAgents().map(toSubagentRecord);
    },

    abort(_id: string): boolean {
      // TODO: implement in step 5
      throw new Error("Not implemented");
    },

    async steer(_id: string, _message: string): Promise<boolean> {
      // TODO: implement in step 5
      throw new Error("Not implemented");
    },

    async waitForAll(): Promise<void> {
      // TODO: implement in step 5
      throw new Error("Not implemented");
    },

    hasRunning(): boolean {
      // TODO: implement in step 5
      throw new Error("Not implemented");
    },
  };
}

/**
 * Convert an internal AgentRecord to a serializable SubagentRecord.
 * Uses an explicit allowlist — new fields must be opted in.
 */
export function toSubagentRecord(record: AgentRecord): SubagentRecord {
  const out: SubagentRecord = {
    id: record.id,
    type: record.type,
    description: record.description,
    status: record.status,
    toolUses: record.toolUses,
    startedAt: record.startedAt,
    lifetimeUsage: record.lifetimeUsage,
    compactionCount: record.compactionCount,
  };

  if (record.result !== undefined) out.result = record.result;
  if (record.error !== undefined) out.error = record.error;
  if (record.completedAt !== undefined) out.completedAt = record.completedAt;
  if (record.worktreeResult !== undefined) out.worktreeResult = record.worktreeResult;

  return out;
}
