---
issue: 264
issue_title: "Remove isolated / extensions:false / noSkills from core"
---

# Retro: #264 — Remove isolated / extensions:false / noSkills from core

## Stage: Planning (2026-05-30T00:09:21Z)

### Session summary

Planned Phase 16, Step 4: removing the extension-lifecycle-control axis (`isolated`, `extensions: false`, `noSkills`) from the pi-subagents core per ADR 0002.
Confirmed all three prerequisite Phase 16 steps (#261, #262, #263) are closed, so the explicit "deny-at-use" dependency is satisfied.
Produced a four-cycle TDD plan (`isolated` → `extensions` → `skills`/`noSkills`/preload → docs) and committed it.

### Observations

- Scope expansion decided with the user: the issue names only `isolated` / `extensions: false` / `noSkills`, but `noSkills` is the single mechanism behind **both** skill-restriction modes (`skills: false` and `skills: string[]` preload).
  Removing `noSkills` without also removing `AgentConfig.skills` would leave a field that silently stops restricting.
  Chose the **collapse-skills-fully** option (symmetric with `extensions`): retire `AgentConfig.skills`, `skill-loader.ts`, `safe-fs.ts` (sole consumer was the skill loader), `preloadSkills`, `PromptExtras`, and `extras.skillBlocks`.
  Children always inherit Pi's full skill system — the `skills: true` path.
- The recursion guard's `if (cfg.extensions)` gate is removed in the `extensions` cycle (cycle 2), since `SessionConfig.extensions` disappears there.
  A guard-always-runs assertion replaces the deleted "extensions: false skips the filter entirely" test.
- This is a **breaking** change (`feat!:`): public `SpawnOptions.isolated` and the `isolated:` / `extensions:` / `skills:` custom-agent frontmatter keys are removed.
  Custom agents with legacy frontmatter will silently ignore those keys (matches the Phase 14 precedent for `disallowed_tools`).
- Sequencing note surfaced to the user: some `isolated`-threading removed here (`RunOptions.isolated`, `Agent.run()` plumbing) is structure that Step 5 (#265, dissolve the runner) will delete anyway — small, unavoidable, and #265 depends on this step, so no reordering benefit.
- Helper-file churn accepted: `test/helpers/runner-io.ts` is touched in all three removal cycles (one field per cycle); ordering is fixed (`isolated` → `extensions` → `skills`) so no cycle leaves a dangling reference.
- Doc updates identified: `docs/architecture/architecture.md` (Mermaid session subgraph, directory tree, `SpawnOptions`/`RunOptions` field lists, roadmap status) and the `package-pi-subagents` SKILL.md session-domain row (8 → 6 modules).

## Stage: Implementation — TDD (2026-05-30T00:38:00Z)

### Session summary

Executed all four plan cycles (`isolated` → `extensions` + unconditional guard → `skills`/`noSkills`/preload → docs) as three `feat!:` commits plus one `docs:` commit.
The extension-lifecycle-control axis and the `skills` curation axis are gone; children always inherit the parent's extensions and full skill system, and the recursion guard is unconditional.
Test count went 1016 → 951 (−65): deleted `skill-loader.test.ts` and `safe-fs.test.ts`, plus removed isolated/extensions/skills/preload-specific cases; `check`, `lint`, `fallow dead-code`, and `verify:public-types` all green.

### Observations

- The plan's cycle split held up cleanly.
  The only interleaving friction was `test/config/custom-agents.test.ts`, where `extensions` and `skills` assertions shared the same `it` blocks.
  Handled it by retitling the shared tests to skills-only in cycle 2 (keeping skills compiling/passing), then deleting them in cycle 3 — no dangling references between commits.
- BSD `sed` (macOS) does not support `\|` alternation in basic regex; the standalone-fixture-line deletions needed `sed -E`.
  Worth remembering for future bulk fixture removals.
- Two in-scope judgment calls beyond the literal plan: (1) kept the generic tag-rendering test in `result-renderer.test.ts` by swapping the example tag `"isolated"` → `"inherit context"` rather than deleting coverage; (2) removed the now-unused `vi` import from `custom-agents.test.ts` after dropping the extensions-deprecation-warning test.
- The `spawn-config.test.ts` `agentInvocation` snapshot carried a stale `isolation: undefined` leftover (from the #263 worktree eviction) that `toEqual` had been silently ignoring; removed it alongside `isolated: false` for a clean exact-match assertion.
- `verify:public-types` confirmed the breaking `SpawnOptions.isolated` removal type-checks against an external consumer; no lockfile changes; `dist/` correctly gitignored after the type-bundle build.
- Pre-completion reviewer: **PASS** — both acceptance criteria code-verified, all deterministic checks green, 6 Mermaid diagrams render, docs accurate, zero dead code.
