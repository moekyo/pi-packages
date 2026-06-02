---
issue: 306
issue_title: "Evaluate commands inside command substitution and subshells against the permission rules"
---

# Retro: #306 — Evaluate nested bash commands (command substitution, process substitution, subshells)

## Stage: Planning (2026-06-02T00:33:17Z)

### Session summary

Planned #306 as a consumer of the #308 `BashCommand` model: extend `collectTopLevelCommandTexts` in `bash-program.ts` into a context-aware recursive enumerator that descends `command_substitution` (`$(…)`/backticks), `process_substitution` (`<(…)`/`>(…)`), and `subshell` (`( … )`), emitting each nested command as an additional `BashCommand` tagged with its execution `context`, in addition to the never-weaker whole emit.
Confirmed AST shapes with a throwaway `web-tree-sitter` probe and settled the one real design choice (the `context` field) with the owner before writing the plan.
Plan committed as a 3-step TDD sequence (enumeration descent → context tag + message surfacing → docs).

### Observations

- The owner chose to add the `context` field and surface it in the deny reason + ask prompt (`inside command substitution`), and to scope the tag to the **command-pattern** surface only — deferring per-command path/context provenance for the external-directory / bash-path surfaces to #307, which already introduces the per-command path model.
- `context` is added **with its consumers in a single commit** (step 2), not in step 1, because `pnpm fallow dead-code` flags a constructed-but-unread interface field (the exact trap the #308 retro called out for `context`/`name`/`argv`).
  Step 1 therefore keeps `BashCommand` one-field and lands the security fix (nested deny works as soon as the enumerator emits the inner units, since the handler already feeds `commands()` to the resolver).
- `context` is **optional and absent for top-level commands** (no `"top-level"` union member).
  This confines test churn: existing `commands()` and whole-`PermissionCheckResult` assertions stay green because `toEqual` treats an absent property as equal to `undefined`.
  Result-level `commandContext` is likewise only set for nested winners.
- The probe surfaced a non-obvious AST fact: when the **whole** command is a substitution (`$(a && b)` alone), `command_substitution` nests **under** `command_name`, not as a sibling argument — so the descent must search the entire `command` subtree, which `collectSubstitutionCommands` does.
- Robust delimiter skipping uses `node.isNamed` (a boolean property on `web-tree-sitter`'s node) rather than enumerating fragile anonymous token types (`$(`, `)`, `` ` ``, `(`, `<(`, …).
  This required adding `readonly isNamed: boolean` to the local `TSNode` interface.
- `BashCommandContext` is placed in `src/types.ts` (not the gate module) so `PermissionCheckResult` stays self-contained and the gate + presentation modules import it in the existing dependency direction.
- Design-review check on the shared-interface change: `PermissionCheckResult` gains one optional field read by two presentation modules and written by one resolver, riding the existing result-carries-context pattern (same as `command` / `matchedPattern`) — no new parameter threading, no LoD / output-argument smells.
- `configuration.md` documents the current limitation explicitly (nested contents "matched as part of their enclosing command rather than evaluated independently") — that prose and the "subshells … are not parsed" caveat are the required doc updates.
- Carried forward from #308: these are `feat:` commits (not `refactor:`), so #306 will appear in the changelog normally; no explicit-close caveat needed for release-please.
