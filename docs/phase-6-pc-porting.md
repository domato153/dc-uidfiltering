# DCUF Phase 6 PC Porting Path

> Historical refactor record — current instructions 아님. Use `AGENTS.md` and current source/build tooling for active work.

## Goal
- The future PC filter script should come from the refactored mobile 3.0 filter runtime, not from preserving the old `1.7.4` codebase.
- The portable unit is the shared filter stack plus a thin PC DOM adapter.

## What gets reused from mobile 3.0
- `src/shared/ip-data.js`
- `src/shared/storage-schema.js`
- `src/shared/storage-core.js`
- `src/shared/filter-core.js`
- the filter-facing parts of `src/targets/mobile/filter-module.js`
- the PersonalBlock runtime in `src/targets/mobile/personal-block-module.js`

## What does not get copied to PC
- mobile list transforms
- mobile popup position fixes
- mobile comment typography normalization
- mobile detached reply merge
- mobile dark-mode patches that only exist to stabilize the transformed mobile UI

## Future extraction rule
1. Move or keep all filter-rule changes in `shared/` first.
2. Keep the desktop adapter responsible only for selectors, subject extraction, visibility application, and rerender hooks.
3. If a new filter feature cannot be expressed through `FilterSubject`, `FilterSettings`, or `FilterDecision`, extend the shared contract first.
4. Do not add filter rules directly inside the future PC adapter.

## Minimum PC adapter surface
- `collectTargets(root?)`
- `extractSubject(element)`
- `applyDecision(element, decision)`
- `loadUserStats(uid)`
- `scheduleRefilter(reason?)`

## Shared state expectations
- storage keys remain identical across mobile and future PC builds
- legacy migration for `blockConfig.ip` remains in shared storage logic
- proxy mode compatibility (`boolean -> enum`) remains in shared storage logic
- IP dataset ownership remains in shared data only

## Phase 6 done condition
- There is a code-level PC adapter scaffold in `src/targets/pc/adapter-contract.js`
- There is a written extraction path describing how to derive a future PC filter build from mobile 3.0
- Future filter-rule work can start in `shared/` without needing the old PC script as the source of truth

## Current implementation rail
- Mobile release build: `tools/build-userscript.mjs`
- Desktop filter build: `tools/build-pc-filter-userscript.mjs`
- The desktop build now extracts the latest mobile `FilterModule` runtime block and `PersonalBlockModule` runtime, then combines them with shared core plus a thin `src/targets/pc/*.js` adapter layer.
- Future filter maintenance should start in `src/shared/`, `src/targets/mobile/filter-module.js`, or `src/targets/mobile/personal-block-module.js`, then rebuild both outputs before touching desktop adapter files.
