import { getNonEmptyString, toRecord } from "#src/common";
import { INTERNAL_PATH_POLICY_VALUES } from "#src/input-normalizer";
import type { ScopedPermissionResolver } from "#src/permission-resolver";
import { SessionApproval } from "#src/session-approval";
import { deriveApprovalPattern } from "#src/session-rules";
import type { PermissionCheckResult } from "#src/types";
import type { BashPathRuleCandidate, BashProgram } from "./bash-program";
import { pickMostRestrictive } from "./candidate-check";
import type { GateResult } from "./descriptor";
import { formatPathAskPrompt } from "./path";
import type { ToolCallContext } from "./types";

interface UncoveredBashPathCheck {
  readonly token: string;
  readonly policyValues: readonly string[];
  readonly check: PermissionCheckResult;
}

interface BashPathResolution {
  readonly tokens: string[];
  readonly uncovered: UncoveredBashPathCheck[];
  readonly allSessionCovered: boolean;
}

/**
 * Build a pure descriptor for the cross-cutting path permission gate (bash).
 *
 * Reads path-candidate tokens from the injected `BashProgram` (the broader
 * `path`-rule filter, accepting dot-files and relative paths). Evaluates each
 * token against the `path` permission surface and returns the most
 * restrictive result.
 *
 * Returns `null` when the gate does not apply (tool is not bash, no command,
 * no tokens extracted, or all tokens evaluate to `allow`).
 * Returns a `GateBypass` when all tokens are session-covered.
 * Returns a `GateDescriptor` for the most restrictive token needing a check.
 */
export function describeBashPathGate(
  tcc: ToolCallContext,
  bashProgram: BashProgram | null,
  resolver: ScopedPermissionResolver,
): GateResult {
  if (tcc.toolName !== "bash") return null;

  const command = getNonEmptyString(toRecord(tcc.input).command);
  if (!command) return null;

  if (!bashProgram) return null;

  const candidates = bashProgram.pathRuleCandidates(tcc.cwd);
  if (candidates.length === 0) return null;

  const resolution = resolveBashPathCandidates(
    candidates,
    resolver,
    tcc.agentName ?? undefined,
  );

  // All tokens are session-covered — bypass.
  if (resolution.allSessionCovered) {
    return createSessionBypass(tcc, command, resolution.tokens);
  }

  // Pick the most restrictive (deny > ask > allow, first-wins) uncovered token.
  const worst = pickWorstUncoveredPathCheck(resolution.uncovered);
  if (!worst) return null;

  const pattern = deriveApprovalPattern(worst.token);
  const askMessage = formatPathAskPrompt(
    tcc.toolName,
    worst.token,
    tcc.agentName ?? undefined,
  );

  return {
    surface: "path",
    input: {
      path: worst.token,
      [INTERNAL_PATH_POLICY_VALUES]: worst.policyValues,
    },
    denialContext: {
      kind: "bash_path",
      command,
      pathValue: worst.token,
      agentName: tcc.agentName ?? undefined,
    },
    sessionApproval: SessionApproval.single("path", pattern),
    promptDetails: {
      source: "tool_call",
      agentName: tcc.agentName,
      message: askMessage,
      toolCallId: tcc.toolCallId,
      toolName: tcc.toolName,
      command,
    },
    logContext: {
      source: "tool_call",
      toolCallId: tcc.toolCallId,
      toolName: tcc.toolName,
      agentName: tcc.agentName,
      command,
      path: worst.token,
    },
    decision: {
      surface: "path",
      value: worst.token,
    },
    preCheck: worst.check,
  };
}

function resolveBashPathCandidates(
  candidates: readonly BashPathRuleCandidate[],
  resolver: ScopedPermissionResolver,
  agentName: string | undefined,
): BashPathResolution {
  const uncovered: UncoveredBashPathCheck[] = [];
  let allSessionCovered = true;

  for (const candidate of candidates) {
    const check = resolveCandidate(candidate, resolver, agentName);
    if (check.matchedPattern === undefined && check.source !== "session") {
      allSessionCovered = false;
      continue;
    }

    if (check.source !== "session") allSessionCovered = false;
    const uncoveredCheck = toUncoveredCheck(candidate, check);
    if (!uncoveredCheck) continue;

    uncovered.push(uncoveredCheck);
    if (check.state === "deny") break;
  }

  return {
    tokens: candidates.map(({ token }) => token),
    uncovered,
    allSessionCovered,
  };
}

function resolveCandidate(
  candidate: BashPathRuleCandidate,
  resolver: ScopedPermissionResolver,
  agentName: string | undefined,
): PermissionCheckResult {
  return resolver.resolve(
    "path",
    {
      path: candidate.token,
      [INTERNAL_PATH_POLICY_VALUES]: candidate.policyValues,
    },
    agentName,
  );
}

function toUncoveredCheck(
  candidate: BashPathRuleCandidate,
  check: PermissionCheckResult,
): UncoveredBashPathCheck | null {
  if (check.state !== "deny" && check.state !== "ask") return null;
  return {
    token: candidate.token,
    policyValues: candidate.policyValues,
    check,
  };
}

function createSessionBypass(
  tcc: ToolCallContext,
  command: string,
  tokens: readonly string[],
): GateResult {
  return {
    action: "allow",
    log: {
      event: "permission_request.session_approved",
      details: {
        source: "tool_call",
        toolCallId: tcc.toolCallId,
        toolName: tcc.toolName,
        agentName: tcc.agentName,
        command,
        tokens,
        resolution: "session_approved",
      },
    },
  };
}

function pickWorstUncoveredPathCheck(
  uncovered: readonly UncoveredBashPathCheck[],
): UncoveredBashPathCheck | null {
  const worstCheck = pickMostRestrictive(uncovered.map(({ check }) => check));
  return uncovered.find(({ check }) => check === worstCheck) ?? null;
}
