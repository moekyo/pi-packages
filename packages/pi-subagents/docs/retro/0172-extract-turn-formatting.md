---
issue: 172
issue_title: "refactor(pi-subagents): extract shared turn-formatting logic"
---

# Retro: #172 — Extract shared turn-formatting logic

## Stage: Planning (2026-05-24T18:00:00Z)

### Session summary

Planned the extraction of duplicated turn-formatting logic from `lifecycle/agent-runner.ts` and `ui/message-formatters.ts` into a new shared module `session/content-items.ts`.
The plan covers extracting `ToolCallContent`, `getToolCallName`, and a new `extractAssistantContent` function, with a 6-step TDD order.

### Observations

- Issue #170 (completed) shifted the duplication target from `conversation-viewer.ts` to `message-formatters.ts` — the issue body's line references are stale but the duplication still exists in the same form.
- Both dependencies (#164 and #170) are closed, so this is unblocked.
- The duplication is clearly incidental (same data extraction, different presentation) — safe to extract per the code-design skill's structural-reasons check.
- `getToolCallName` has no direct unit tests today; the extraction enables testing it for the first time.
- `getAgentConversation` also has no tests — noted as out of scope but worth a follow-up.
- Considered adding `extractText` to the new module for consistency but deferred to keep scope tight.

## Stage: Implementation — TDD (2026-05-24T19:05:00Z)

### Session summary

Completed all 6 TDD steps from the plan.
Created `session/content-items.ts` with `getToolCallName` and `extractAssistantContent`, added 11 unit tests, then refactored both `message-formatters.ts` and `agent-runner.ts` to use the shared module.
Test count went from 896 to 907 (+11).

### Observations

- Steps 1 and 2 (test-only commits) were folded into step 3's feat commit per the plan's intent — all three land together.
- The `getToolCallName` parameter type needed widening from `{ type: string }` to `{ type: string; [key: string]: unknown }` to allow test object literals to pass excess-property checking.
  This in turn required an `as unknown as` double cast at the `agent-runner.ts` call site, because the SDK's `TextContent | ThinkingContent | ToolCall` union lacks an index signature.
  Same pattern already present in `conversation-viewer.ts`.
- `message-formatters.ts` had both an import and a re-export of `getToolCallName`; simplified to a pure re-export only.
- The lint fixup (unused import) was amended into the same refactor commit before pushing.
- Architecture doc updated: `content-items.ts` added to session module listing, production-duplication section updated, Step 9 marked Done.
