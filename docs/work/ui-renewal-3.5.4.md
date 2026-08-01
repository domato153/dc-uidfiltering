# DCUF mobile 3.5.4 minimal correction brief

## Status

`READY_FOR_IMPLEMENTATION`

The user approved this replacement scope on 2026-08-02. It supersedes the failed broad UI-renewal brief and its P0/P1 visual-fidelity closure claims.

## Fixed references

- Repository: `domato153/dc-uidfiltering`
- Remote work branch at approval: `codex/ui-renewal-3.5.4-collab`
- Discarded UI-renewal tip: `5c0e54b571d36de3cd8d8a28e4b81432e5d24714`
- Stable release-history base: `ad04039feef7c775843cf88858315ed7fe3185d6`
- Buildable 3.5.3 source snapshot: `e730cd48edd5dc3c9abb45d75b056d3122231cc4`
- Recovery branch: `archive/mobile-3.5.4-beta-ui-renewal` at the discarded tip

Every review and handoff must name the exact current commit. A moved SHA invalidates stale conclusions.

## Product scope

Start from the 3.5.3 DOM, event, CSS, storage, and build contracts. Implement only:

1. Decouple the filter master switch from mobile convenience features. The master disables filtering/statistics behavior only; each convenience feature follows its own setting.
2. Remove the user-facing list scroll-position restoration setting and its dedicated runtime. Ignore stale stored data without rewriting the settings object.
3. Port a PUMX default-activation race fix only if comparison proves it is a bounded, native-first improvement. Preserve `#btn_pumx`, the native handler, and the native state. No clone, replacement, synthetic state, or unbounded observer.
4. Preserve all 14 existing palette IDs and stored values. Make README/web documentation match the runtime list.
5. Correct only the affected non-member modify/delete password cards, authenticated delete confirmation, and structurally shared password/confirm popups. Preserve native forms, hidden inputs, buttons, handlers, submit, Enter, close, and reopen behavior.
6. Bound and center `div.btn_recommend_box.recomuse_y.morebox` without changing its DOM or native recommendation/CAPTCHA behavior.

## Explicit exclusions

- No header/list/article/comment/write redesign or new design system.
- No `surface-theme.js`, `live-corrections.js`, `live-native-bridge.js`, runtime-coordinator rewrite, CSSOM deletion, global correction phase, broad popup rule, global capture listener, node move/clone, unconditional visibility, `100vw`, new global z-index ladder, or accumulated `!important` layer.
- No official branch, PR, tag, release, or stable promotion.
- Generated root/dist userscripts are validation artifacts and must not be committed.
- No automated live-site login or state-changing action. The user owns final live approval.

## Host-compatibility coverage

Keep the valid 3.5.3 functional Testbed. Add live-shaped fixtures only for the changed contracts: logged-in/out delete and password forms, delegated native controls, recommendation with and without CAPTCHA, late PUMX button/handler insertion, and normal/minor/mini routes.

Assertions cover form/action/method/hidden fields, native handler call counts, popup open-close-reopen, action-row order and hit-testing, bounded recommendation geometry, timer/observer cleanup, stale storage tolerance, convenience behavior with the filter master off, and the exact 14 palette IDs. Geometry and interaction contracts are gates; visual taste is not.

## Acceptance state

Local source validation, build, and the requested force-with-lease push may complete this implementation cycle. Until the user performs a live-site smoke test, report the result only as a locally validated 3.5.4 candidate awaiting single-user live approval.
