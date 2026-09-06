# Agent Maintenance Notes

This is the active, compact maintenance index. It records reusable causes and contracts, not commands or a chronological diary. Closed history is preserved in [`archive/agent-maintenance-notes-history-2026-07.md`](archive/agent-maintenance-notes-history-2026-07.md).

## Scope and evidence

- `cef5f71`'s exact `3.5.4-beta` artifact is the behavior authority for the current meaning-preservation work; its version-only `3.5.5` normalization and PC 1.9.9 build are separate exact-digest controls. Do not revive the discarded broad UI-renewal runtime by copying later style or adapter modules wholesale.
- Maintain the compact live-root map in [`ui-surface-contracts.md`](ui-surface-contracts.md). Before a UI correction, trace every matching injected phase and selector specificity, then assign one final visual owner to the affected surface.
- Add a failing positive contract before the fix. Geometry and hit-testing assertions require rendered positive-area controls; a zero-area or merely present node is not a pass.
- Source-work Testbed runs inject `testbed/artifacts/runtime-under-test.user.js`, require the source-runtime guard, and print the absolute path and SHA-256. Screenshots remain evidence, not approval.
- At Chromium document-start, the parser can replace the provisional `html`/`head` after the boot controller exists. A timer-only lock repair can expose one frame; observe the document only while locked/preparing, reinstall the attribute/style/overlay in the mutation checkpoint, and disconnect at ready/degraded.
- Test target applicability is selection metadata, not an early return inside a test body. Otherwise mobile-only or PC-only cases can be reported as zero-duration passes for the wrong artifact.
- A fixture must preserve the host's form, hidden inputs, original buttons, delegated handlers, route variant, popup close/reopen behavior, and relevant CSS conflict. A visual stand-in cannot prove host compatibility.
- A control and candidate both passing the same test proves matching outcomes only. Semantic equivalence requires independently injected artifacts and compared observations for storage, events, host identity/order, geometry, requests/errors, and settled lifecycle ownership; retain raw startup churn even when active ownership is equal.
- Reproduce baseline artifacts from the immutable source commit in an isolated export. A baseline verifier that invokes candidate build inputs is a false oracle, even when the expected digest happens to match.
- On `pull_request`, the default checkout is GitHub's synthetic merge ref. A job claiming exact candidate lineage must explicitly checkout `github.event.pull_request.head.sha`, verify `git rev-parse HEAD`, and use that same SHA in receipts and artifact names; a green merge-ref run is integration evidence only.
- Evidence binding must be portable across Git checkout policy: canonicalize CRLF/LF only for declared text sources, keep binaries and built userscripts byte-exact, bind product/build inputs and the proof/oracle implementation itself, and reject asymmetric receipt fields. `.gitattributes` is preventive checkout policy, not the sole proof of portable identity.
- Incremental UI replacement is transitional architecture, not a permanent dual path. Every registry `mixed` component requires a concrete exit contract; activate one surface owner at composition time and remove the superseded CSS/listener/observer/render path in the same PR.

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
- Authenticated delete keeps its confirmation-only content and native submit button, but shares the nonmember modify/delete page chrome, centered form geometry, card width, typography, and action-button material. Do not add a password input or replace the host form to achieve that visual parity.
- The live authenticated-delete host gives `.empty_pagewrap` a large vertical auto margin and `.pop_wrap.type5` its own square border/background/z-index. Reset that exact shell before centering the shared card geometry, and make the outer popup wrapper transparent and borderless so `.dcuf-delete-confirm-content` remains the only visual card owner.
- Popup tests must close and reopen the same native node and prove the delegated handler and submit count remain singular.
- Do not replace the preserved anchor-based editor-layer scale calculation inside a semantic-delta-zero refactor. The discarded layer-scale/content-box correction changed visible geometry. Characterization should assert positive viewport containment with a 1px rendering tolerance and record before/after anchor gaps. Because the immutable baseline derives transform coordinates from integer `offsetWidth`, allow at most 2px of toolbar-scroll tracking drift across Chromium platforms; a wider tolerance or exact inset change requires its own declared behavior fix and live evidence.
- Give immutable-control and candidate write-layout runs distinct report paths. A shared `write-layout-latest.json` lets the candidate overwrite the control rectangles while leaving only a control PASS marker, which is insufficient geometry evidence.

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
