---
issue: 301
issue_title: "Only first command in bash command chain is evaluated"
---

# Retro: #301 — Only first command in bash command chain is evaluated

## Stage: Planning (2026-06-01T20:26:00Z)

### Session summary

Planned the fix for the bash command-chain permission bypass: a chained command like `cd /path && npm install pkg` matches the whole string against `cd *` (allow) and never evaluates `npm *` (deny) against the second command.
Explored the permission path and confirmed the bash `path` and `external_directory` surfaces already decompose chains via tree-sitter; only the bash command-pattern surface matches the raw string.
A plan was written and committed (`docs/plans/0301-evaluate-bash-command-chains.md`), then the session pivoted to a refactor-first approach.

### Observations

- Key constraint: `PermissionManager.checkPermission()` is synchronous (public `PermissionsService` + RPC contracts) and the issue's reproduction test calls it directly, but robust chain decomposition needs async tree-sitter.
  The chosen mechanism (after architecture review) reuses the existing tree-sitter parse in the gate layer and checks each simple-command via the unchanged synchronous `checkPermission`, combining most-restrictively — `checkPermission` stays single-command and synchronous.
- The synchronous service API / RPC remain whole-string (advisory); the runtime gate — the real security boundary — is fully fixed.
  An async decompose-and-check service method is a possible follow-up.
- Scope decision: top-level chain operators only (`&&`, `||`, `;`, `|`, `&`, newlines).
  Nested command substitution and subshells are matched as their enclosing command's text — a documented known limitation, never weaker than today.
- Behavior change to call out in docs: config patterns that span a chain (e.g. `"cd * && npm *"`) no longer match as a unit once each command is evaluated independently.
- Pivot: in response to "what architectural changes would make this easier?", the owner chose Beck-style refactor-first.
  Issue #304 was filed to consolidate bash command analysis behind a `BashProgram` value object and a `pickMostRestrictive` helper.
  **#301 is now blocked on #304.**
  After #304 ships, #301 collapses to: add `BashProgram.topLevelCommands()`, add a bash command gate that evaluates each top-level command and selects with `pickMostRestrictive`, wire it into the tool-gate producer, and update `docs/configuration.md`.
- The committed `0301-…` plan still describes the heavier standalone-extractor approach (the owner chose to leave it as-is for now).
  It should be rewritten to the trivial dependent version once #304 lands.

### Diagnostic details

- **Escalation-delay tracking** — Reversed the initial mechanism recommendation (synchronous hand-rolled splitter) after the owner's architecture-review prompt revealed it would create a second bash decomposition that can diverge from the tree-sitter one; switched to the tree-sitter-gate approach before writing the plan, not after.
