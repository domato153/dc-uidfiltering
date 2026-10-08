# Next bounded task

- Task ID: `header-navigation`
- Bounded slice: `header-drawer-toggle-intent-description-boundary`
- Objective: extract the pure frozen typed toggle description into the current presenter, consuming an immutable current-open snapshot. The existing adapter applies it in the same native callback/stack. Preserve native pointer/default Enter, cancellation, focus, rapid ordering, popup-only closure, reset semantics, settings, geometry and PC bytes.
- Why next: exact 2FB3 characterization confirms same-stack native updates, while general UiPort snapshots lack a drawer driver and have different subscriber-error/no-op/reset/result semantics. Separate intent values without introducing those differences.
- Expected transition: exact 2FB3 control/candidate comparison and a bounded intent-value extraction with selected descriptor/order negatives. Keep native command/state ownership in the adapter, both owners mixed, and full UiPort/header admission separate.
- Stop/replan: missing/changed control, unclassified native/default/focus/order/failure difference, required new shared/PC/state/lifecycle owner, wrong-root/remote drift or unavailable oracle. Recover exact inputs or re-scope the larger driver design; no new subscriber/async indirection or weakened assertions.

Read INDEX/CURRENT/policy and the selected boundary in HEADER_DRAWER_TOGGLE_INTENT. Confirm exact 2FB3 root/dist/guard and local control before source edits. Match the frozen surface/open and surface/close description vocabulary to the actual shared constants in a pure test; do not dispatch through the general snapshot store. Retain existing adapter guards/cancellation, setDrawerOpenState phases and native reset semantics. Update candidate responsibility/surface contract at implementation, refresh the Git route, and extend the existing guarded observer with independent timing/value negatives. The disposable characterization probe is not an implementation prerequisite.

## Declared entry inventory

LIVE pointers are not completeness proof; derive direct dependencies independently. The tracked candidate is a clean-CI entry identity; the local control is not a CI dependency.

```dcuf-next-action
{
  "id": "header-drawer-toggle-intent-description-boundary",
  "stageId": "header-navigation",
  "requiredDependencies": [
    {"id":"governing-policy","path":"AGENTS.md","mode":"LIVE","sha256":null},
    {"id":"accepted-plan","path":"docs/work/MOBILE_UI_MODERNIZATION.md","mode":"LIVE","sha256":null},
    {"id":"efficient-verification","path":"docs/work/VERIFICATION_EFFICIENCY.md","mode":"LIVE","sha256":null},
    {"id":"build-targets","path":"build/targets.json","mode":"LIVE","sha256":null},
    {"id":"architecture","path":"architecture/registry.json","mode":"LIVE","sha256":null},
    {"id":"candidate-overlay","path":"architecture/candidates/mobile-ui-modernization-assurance.json","mode":"LIVE","sha256":null},
    {"id":"surface-contract","path":"docs/ui-surface-contracts.md","mode":"LIVE","sha256":null},
    {"id":"gate-routing","path":"verification/gates.json","mode":"LIVE","sha256":null},
    {"id":"drawer-adapter","path":"src/targets/mobile/header-drawer-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"drawer-presenter","path":"src/targets/mobile/header-drawer-presenter.js","mode":"LIVE","sha256":null},
    {"id":"composition","path":"src/targets/mobile/post-main-fixes.js","mode":"LIVE","sha256":null},
    {"id":"intent-contract","path":"src/shared/ui-contracts.js","mode":"LIVE","sha256":null},
    {"id":"intent-application","path":"src/runtime/ui-state-store.js","mode":"LIVE","sha256":null},
    {"id":"current-boundary","path":"docs/work/HEADER_DRAWER_TOGGLE_INTENT.md","mode":"LIVE","sha256":null},
    {"id":"body-boundary","path":"docs/work/HEADER_DRAWER_OWNED_BODY.md","mode":"LIVE","sha256":null},
    {"id":"body-observer","path":"testbed/run-header-drawer-owned-shell-differential.mjs","mode":"LIVE","sha256":null},
    {"id":"body-contract","path":"testbed/header-drawer-body-contract.mjs","mode":"LIVE","sha256":null},
    {"id":"behavior-tests","path":"testbed/run-tests.mjs","mode":"LIVE","sha256":null},
    {"id":"harness","path":"testbed/harness","mode":"LIVE","sha256":null},
    {"id":"fixture-server","path":"testbed/server/server.mjs","mode":"LIVE","sha256":null},
    {"id":"fixtures","path":"testbed/fixtures","mode":"LIVE","sha256":null},
    {"id":"fixture-public","path":"testbed/public","mode":"LIVE","sha256":null},
    {"id":"current-candidate","path":"Dc_UserFilter_Mobile_v3.5.5.user.js","mode":"FROZEN","sha256":"2fb36b4de22ce79c9282abe7d635b74dd9008f0f62d651485f8b61766a58bfab"}
  ],
  "requiredDecisions": ["working-checkpoint", "intent-entry", "scope-and-admission"],
  "decisions": [
    {"id":"working-checkpoint","status":"ADOPTED","boundary":"Only bounded validated commits/non-force pushes to origin/codex/ui-port-boundary; no official/live/release authority.","source":"AGENTS.md"},
    {"id":"intent-entry","status":"ADOPTED","boundary":"Extract frozen typed intent values only; preserve same-stack native adapter execution. No generic snapshot subscriber, awaited host application or new state owner. Full UiPort separation remains deferred.","source":"docs/work/HEADER_DRAWER_TOGGLE_INTENT.md"},
    {"id":"scope-and-admission","status":"ADOPTED","boundary":"Body equality is bounded/synthetic, not mixed exit or full profile/stage/live admission. Preserve palette FAIL and upper/final UNKNOWN.","source":"docs/work/VERIFICATION_EFFICIENCY.md"}
  ],
  "hazards": [
    {"id":"native-focus","status":"ACTIVE","effect":"Retain self-insertion focus guard, trusted default events; no forced input or key forwarding."},
    {"id":"intent-order","status":"ACTIVE","effect":"Current commits notify before dispatch returns, but generic snapshots do not drive drawer; subscribers catch errors, no-ops do not notify, and awaited burst results hold latest state. Preserve direct native order/reset/failure behavior."},
    {"id":"phase-scope","status":"ACTIVE","effect":"Preserve both body phases, early raw rules, both widths and startup variance. Refresh traces do not prove arbitrary order equivalence."},
    {"id":"existing-failures","status":"ACTIVE","effect":"Original acceptance/palette FAIL; header/34-feature/live UNKNOWN. Timer/page-head/popup explanations remain unresolved."},
    {"id":"guard-and-control","status":"ACTIVE","effect":"Serialize builders/probes; PC replaces generic guard. Freeze 2FB3 and restore mobile guard after PC work."}
  ],
  "localEvidence": [
    {"path":"artifacts/controls/header-toggle-intent-2FB3.user.js","disposition":"REGENERATE","recovery":"Recover exact 2FB3 generated bytes or rebuild their source in an isolated control directory. Require declared SHA; no old substitute/tree reset. STALE_REPLAN until recovered."},
    {"path":"docs/work/HEADER_DRAWER_TOGGLE_INTENT.md","disposition":"DURABLE","recovery":"Tracked observations and selected boundary. Missing disposable probe/report never recreate old execution; implementation requires a fresh exact control/candidate comparison."}
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
