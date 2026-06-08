---
issue: 347
issue_title: "piInfrastructureReadPaths in config.json is silently ignored by config-loader merge pipeline"
---

# Retro: #347 — piInfrastructureReadPaths config-loader gap

## Stage: Planning (2026-06-08T21:30:00Z)

### Session summary

Diagnosed `piInfrastructureReadPaths` being silently dropped: it is parsed by `normalizePermissionSystemConfig()` but that runs on the output of `loadAndMergeConfigs()`, whose intermediate `UnifiedPermissionConfig` never declares, parses, or merges the field — structurally identical to the [#332] loader gap.
Produced `docs/plans/0347-infra-read-paths-config-loader-gap.md` with five red→green TDD cycles that add a shared `normalizeOptionalStringArray` helper, carry the field through the unified loader with override-wins merge, and add `refresh`/`save` preservation tests.

### Observations

- Root cause is a missing field in `UnifiedPermissionConfig`, not a matching bug — confirmed `isPiInfrastructureRead()` / `path-utils.ts` matching is correct and out of scope ([#122], [#350] already cover it).
- Verified against the [#332] fix shape: `ConfigStore.save()` spreads `...existing.config`, so once the loader carries the field the save path preserves it automatically — no explicit save-side copy expected (step 5 adds a test that folds in a `save()` fix only if it proves red).
- Decision (`ask_user`): replace (override-wins) merge across layers, not concatenate — every other `UnifiedPermissionConfig` field replaces or deep-shallow-merges, so a concatenating array would be the lone divergent rule; the reported bug is a single-layer drop, so replace is the minimal consistent fix.
- Chose to extract `normalizeOptionalStringArray` into `common.ts` (alongside `normalizeOptionalPositiveInt`) rather than duplicate the inline guard — both `normalizeUnifiedConfig` and the existing `normalizePermissionSystemConfig` validate the same "optional string array" concern, so the helper dedupes rather than adds a third copy.
- Pre-monorepo plans in `docs/plans/archive/` use upstream issue numbers; ignored them for `NNNN` selection.
  Picked `0347` to match the issue.
- No `docs/architecture/`, schema, `config.example.json`, or `docs/configuration.md` changes needed — the field is already declared and documented everywhere except the loader.

[#122]: https://github.com/gotgenes/pi-packages/issues/122
[#332]: https://github.com/gotgenes/pi-packages/issues/332
[#350]: https://github.com/gotgenes/pi-packages/issues/350
