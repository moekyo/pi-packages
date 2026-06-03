import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { GateHandlerSession } from "./gate-handler-session";
import type {
  SkillPermissionChecker,
  SkillPromptEntry,
} from "./skill-prompt-sanitizer";
import type { PermissionState } from "./types";

/**
 * The session surface `AgentPrepHandler` invokes during `before_agent_start`:
 * bind context + identify the agent (via {@link GateHandlerSession}), check
 * skill permissions for prompt sanitization (via {@link SkillPermissionChecker}),
 * refresh config, decide tool exposure, manage the active-tools / prompt-state
 * cache keys, and store the resolved skill entries.
 */
export interface AgentPrepSession
  extends GateHandlerSession,
    SkillPermissionChecker {
  refreshConfig(ctx?: ExtensionContext): void;
  getToolPermission(toolName: string, agentName?: string): PermissionState;
  shouldUpdateActiveTools(cacheKey: string): boolean;
  commitActiveToolsCacheKey(cacheKey: string): void;
  getPolicyCacheStamp(agentName?: string): string;
  shouldUpdatePromptState(cacheKey: string): boolean;
  commitPromptStateCacheKey(cacheKey: string): void;
  setActiveSkillEntries(entries: SkillPromptEntry[]): void;
}
