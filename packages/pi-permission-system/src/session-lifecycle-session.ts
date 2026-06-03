import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { SessionLogger } from "./session-logger";

/**
 * The session surface `SessionLifecycleHandler` invokes across
 * `session_start`, `resources_discover`, and `session_shutdown`: refresh and
 * report config, reset / reload / shut down session state, resolve the agent
 * name, surface config issues, read the runtime context, and log.
 *
 * `activate` is intentionally absent — the lifecycle handler never calls it
 * directly (ISP: do not depend on methods you do not use).
 */
export interface SessionLifecycleSession {
  refreshConfig(ctx?: ExtensionContext): void;
  resetForNewSession(ctx: ExtensionContext): void;
  logResolvedConfigPaths(): void;
  resolveAgentName(ctx: ExtensionContext, systemPrompt?: string): string | null;
  getConfigIssues(agentName?: string): string[];
  reload(): void;
  getRuntimeContext(): ExtensionContext | null;
  shutdown(): void;
  readonly logger: SessionLogger;
}
