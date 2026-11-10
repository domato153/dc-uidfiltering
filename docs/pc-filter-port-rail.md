# PC filter port rail

## Scope

Port the completed Mobile filter/owned-UI code;do not implement another PC UI or copy Mobile site styling. Native PC header,list,article,comments,writer and forms stay native. Current stage/result:docs/work/PC_FILTER_V7_PORT.md and CURRENT_STATE/NEXT_TASK.

## One implementation,explicit target inputs

`build/targets.json` is the current input authority. Both targets consume the same:

- `src/shared/storage-schema.js`, `ip-data.js`, `storage-core.js`, `filter-core.js`, `ui-contracts.js`, `theme-primitives.js`.
- `src/targets/shared/filter-runtime.js`, `filter-settings-host-adapter.js`, `filter-host-adapter.js`.
- `src/targets/shared/personal-block-module.js`, `personal-block-host-adapter.js`.
- `src/targets/shared/settings-presenter.js`, `filter-ui-style.js`, `theme-presenter.js`, `theme-host-port.js`, `popup-geometry-host-adapter.js`, `ui-disposable-scope.js` and the existing UI state store.
- `src/targets/shared/theme-material-values.js`:the unchanged adopted Mobile B1/v7 factory,now included by both builds. It declares values/recipes only;existing presenters retain shape and controls. PC target theme hook calls this factory without Mobile host CSS.

The historical architecture component ID `mobile-theme-material-values` remains stable;its source and consumers are shared. Its existing mixed selector debt is not silently promoted to conforming. Some original source comments retain historical Mobile/PC-fallback wording;manifest and current source connections above determine execution.

The old description of extracting marked sections from Mobile filter/personal-block files is superseded. The PC builder reads explicit shared sources directly. Never re-port from a generated legacy userscript or use the version label as evidence that official/development code is equal.

## PC-specific boundary

`src/targets/pc/` owns only entry,host visibility/selectors,theme composition and style mounting. `filter-style.js` is a PC adapter rail;shared UI rules must not be copied back there. Preserve existing PC dark-state observation,shortcut,menu registration and boot behavior. A new target-specific exception needs an observed native-host difference.

## Update flow

1. Change the actual common source for shared filter/data/UI work. A Mobile host-only change does not enter PC.
2. For a newly reusable Mobile-owned feature,inspect its dependencies and port the existing implementation through the shared rail;do not redesign/reimplement PC separately.
3. Rebuild affected targets at their current versions with `tools/build-userscript.mjs` and `tools/build-pc-filter-userscript.mjs`. Build-manifest roles and architecture overlay must agree.
4. Use the canonical `testbed/artifacts/runtime-under-test.user.js` guard for one target at a time. Set `DCUF_TESTBED_TARGET=pc` explicitly for PC. Restore the Mobile guard before a combined checkpoint;keep a separately named frozen PC runtime for comparisons.
5. Select tests by changed consumers:owned filter/headtext/shortcut,palette14,menu/selection/size,manual/management/backup;palette preview/save/cancel,light/dark,drag/resize/keyboard,nested close and unsaved data. Native host styles/nodes must remain unchanged. Compare behavior with a distinct frozen prior PC in fresh contexts.
6. Inspect actual same-size before/current images. A source-only connection check or screenshot alone does not certify behavior. Actual extension/device/submission coverage remains separate.

## Stage2 port2026-11-04

The pure material file moved byte-for-byte from the Mobile directory. Mobile output stays exactly2C14F66F;PC changes are limited to inserting that same factory and invoking it from its target hook. Existing20 common feature inputs were already current;no feature behavior,storage schema,metadata or version change was needed. The adopted brighter paired-ink dark primary,quiet auxiliary controls and label-sized backup actions transfer through existing variables/presenters.

Stage3 site/index/README/screenshot proposal and stage4 approved official publication are separate;this development port does not publish either target.
