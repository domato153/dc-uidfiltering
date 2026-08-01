# Agent Maintenance Notes

This is the active, compact maintenance index. It records reusable causes and contracts, not commands or a chronological diary. Closed history is preserved in [`archive/agent-maintenance-notes-history-2026-07.md`](archive/agent-maintenance-notes-history-2026-07.md).

## Scope and evidence

- Stable `3.5.3` behavior is the product baseline for the `3.5.4-beta` correction cycle. Do not revive the discarded broad UI-renewal runtime by copying later style or adapter modules wholesale.
- Maintain the compact live-root map in [`ui-surface-contracts.md`](ui-surface-contracts.md). Before a UI correction, trace every matching injected phase and selector specificity, then assign one final visual owner to the affected surface.
- Add a failing positive contract before the fix. Geometry and hit-testing assertions require rendered positive-area controls; a zero-area or merely present node is not a pass.
- Source-work Testbed runs inject `testbed/artifacts/runtime-under-test.user.js`, require the source-runtime guard, and print the absolute path and SHA-256. Screenshots remain evidence, not approval.
- A fixture must preserve the host's form, hidden inputs, original buttons, delegated handlers, route variant, popup close/reopen behavior, and relevant CSS conflict. A visual stand-in cannot prove host compatibility.

## Filter, storage, and convenience contracts

- The filter master switch controls filtering only. Mobile convenience features read their own settings and continue operating when filtering is disabled.
- Keep the filter label explicit: “모든 필터 기능 끄기”. Convenience copy must not imply that the filter switch owns convenience execution.
- List scroll restoration is retired. Ignore a stale `listRestore` property when merging the existing `dcuf_mobile_convenience_settings_v1` object; do not migrate, rewrite, or reset the stored object merely to remove it.
- Recent-post highlighting stores only the list/post identity and timestamp. It must not store or apply offsets or call `scrollTo` as a return-navigation side effect.
- Preserve all existing GM keys and shapes. The retirement above is a read-compatible omission, not a storage schema change.

## Native form and popup ownership

- DCInside-owned forms and popups keep their original node, method, action, hidden fields, button types, handlers, and DOM order. Never clone or replace an interactive host control to make styling easier.
- Nonmember modify/delete password cards must neutralize the host's absolute `.btn_svc` positioning on the exact direct buttons before using a two-column action grid. Cancel remains left and confirm remains right; the whole visible control must win `elementFromPoint`.
- Authenticated delete confirmation is recognized only by `form#delete[name="delete"]` plus `.empty_pagewrap .pop_wrap.type5 .pop_content.robot > .btn_box`. Style that owned card in normal flow without broad `.pop_wrap` rules.
- Popup tests must close and reopen the same native node and prove the delegated handler and submit count remain singular.

## Recommendation and palette contracts

- The live article root is `#container > article > div.view_content_wrap` on major, minor, and mini routes.
- Only `div.btn_recommend_box.recomuse_y.morebox` owns the centered width correction. It is capped at 680px, contained at narrow widths, and leaves overflow visible for host popups and CAPTCHA content. Do not use `100vw` or move/replace the box.
- Recommendation tests cover normal and CAPTCHA states, wide and narrow viewports, containment, and native click counts on all three routes.
- Preserve all 14 palette IDs and labels: blue/기본 블루, purple/퍼플, green/그린, orange/오렌지, mono/모노톤, indigo/인디고, sky/스카이, cyan/시안, teal/틸, lime/라임, amber/앰버, red/레드, rose/로즈, pink/핑크. README and homepage counts must match the runtime registry.

## PUMX lifecycle contract

- Default PUMX activation is write-route-only and uses exactly one mutation source: the runtime coordinator when present, otherwise one fallback observer.
- Wait until the native inline handler's referenced global function exists. Treat `.on` or `aria-pressed="true"` as already active and never click it again.
- Click a given button at most once, verify the native active state, and stop immediately on success. Release timer, observer/subscription, and exposed retry state on success, the two-second deadline, or `pagehide`.
- Repeated blind `.click()` calls are discarded: they can toggle an already active control off or invoke the host handler more than once.

## Remote authority and release boundaries

- A local `origin/*` tracking ref is not server authority. Before a destructive branch update, query the exact remote ref, preserve the old tip on an archive branch, and use an explicit `--force-with-lease=<ref>:<expected-sha>`.
- Root and `dist/` userscripts are generated from `src/` and build tooling. Validate their byte identity, but do not commit candidate artifacts unless a release workflow explicitly requires it.
- The rebuilt `3.5.4-beta` candidate remains pending one user-run live-site approval. Local Testbed success is not a stable release, promotion, tag, or live approval.
