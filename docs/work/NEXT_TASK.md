# Next: formal header admission evidence

- Task ID: `header-navigation`
- Bounded slice: `header-formal-admission`
- Objective: Qualify formal header admission with exact-artifact priority/exit evidence and separately authorized actual-extension execution. Local implementation is complete; do not revive another header implementation slice.
- Why next: Current local implementation, native comparisons, full regression and public GM-shim checks are validated. Formal promotion requires evidence and authority outside that completed scope.
- Expected transition: Current criterion-bound admission only if every required receipt qualifies; retain original palette FAIL and no automatic registry fold/release.
- Stop/replan: Missing exact control, unexpected raw coverage/phase difference, unmodeled native heights/live states, surviving negative or remote drift. Preserve original palette FAIL and final/live UNKNOWN.

The continuous instruction was fulfilled for local header implementation and validation in HEADER_FINISH.md. Checkpoint receipt owns final publication/CI. Actual-extension installation/live execution still requires separate authority; do not treat the completed local unit as that authorization.

## Declared entry inventory

Tracked/build-recoverable inputs qualify entry only. Cold execution also requires exact local control bytes; CI certifies neither their availability nor product success.

```dcuf-next-action
{
  "id": "header-formal-admission",
  "stageId": "header-navigation",
  "requiredDependencies": [
    {"id":"governing-policy","path":"AGENTS.md","mode":"LIVE","sha256":null},
    {"id":"accepted-plan","path":"docs/work/MOBILE_UI_MODERNIZATION.md","mode":"LIVE","sha256":null},
    {"id":"replacement-plan","path":"docs/work/UI_REPLACEABILITY_VALIDATION.md","mode":"LIVE","sha256":null},
    {"id":"current-authorization","path":"docs/work/CURRENT_STATE.md","mode":"LIVE","sha256":null},
    {"id":"build-targets","path":"build/targets.json","mode":"LIVE","sha256":null},
    {"id":"source-builder","path":"tools/build-userscript.mjs","mode":"LIVE","sha256":null},
    {"id":"architecture","path":"architecture/registry.json","mode":"LIVE","sha256":null},
    {"id":"candidate-overlay","path":"architecture/candidates/mobile-ui-modernization-assurance.json","mode":"LIVE","sha256":null},
    {"id":"surface-map","path":"architecture/ui-surfaces.json","mode":"LIVE","sha256":null},
    {"id":"surface-contract","path":"docs/ui-surface-contracts.md","mode":"LIVE","sha256":null},
    {"id":"gate-routing","path":"verification/gates.json","mode":"LIVE","sha256":null},
    {"id":"routed-baselines","path":"verification/baselines.json","mode":"LIVE","sha256":null},
    {"id":"impact-resolver","path":"tools/resolve-impact.mjs","mode":"LIVE","sha256":null},
    {"id":"gate-runner","path":"tools/run-gates.mjs","mode":"LIVE","sha256":null},
    {"id":"early-theme-composition","path":"src/targets/mobile/theme-host-style.js","mode":"LIVE","sha256":null},
    {"id":"early-core-composition","path":"src/targets/mobile/filter-module.js","mode":"LIVE","sha256":null},
    {"id":"header-shell-presenter","path":"src/targets/mobile/header-shell-presenter.js","mode":"LIVE","sha256":null},
    {"id":"header-shell-adapter","path":"src/targets/mobile/header-shell-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"gallery-page-head-presenter","path":"src/targets/mobile/gallery-page-head-presenter.js","mode":"LIVE","sha256":null},
    {"id":"gallery-page-head-adapter","path":"src/targets/mobile/gallery-page-head-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"header-gnb-presenter","path":"src/targets/mobile/header-gnb-presenter.js","mode":"LIVE","sha256":null},
    {"id":"header-gnb-adapter","path":"src/targets/mobile/header-gnb-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"header-recent-visit-presenter","path":"src/targets/mobile/header-recent-visit-presenter.js","mode":"LIVE","sha256":null},
    {"id":"header-recent-visit-adapter","path":"src/targets/mobile/header-recent-visit-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"header-drawer-presenter","path":"src/targets/mobile/header-drawer-presenter.js","mode":"LIVE","sha256":null},
    {"id":"header-drawer-adapter","path":"src/targets/mobile/header-drawer-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"phase-observer","path":"testbed/run-header-cascade-audit.mjs","mode":"LIVE","sha256":null},
    {"id":"native-observer","path":"testbed/run-header-drawer-owned-shell-differential.mjs","mode":"LIVE","sha256":null},
    {"id":"fixtures","path":"testbed/fixtures","mode":"LIVE","sha256":null},
    {"id":"harness","path":"testbed/harness","mode":"LIVE","sha256":null},
    {"id":"server","path":"testbed/server/server.mjs","mode":"LIVE","sha256":null},
    {"id":"header-finish-contract","path":"docs/work/HEADER_FINISH.md","mode":"LIVE","sha256":null},
    {"id":"live-contract","path":"verification/live-site-canary.json","mode":"LIVE","sha256":null},
    {"id":"live-driver","path":"testbed/run-live-site-canary.mjs","mode":"LIVE","sha256":null},
    {"id":"live-replay","path":"tools/verify-live-site-canary.mjs","mode":"LIVE","sha256":null},
    {"id":"extension-package-verifier","path":"tools/prepare-live-extension.mjs","mode":"LIVE","sha256":null},
    {"id":"checkpoint-workflow","path":"docs/checkpoint-workflow.md","mode":"LIVE","sha256":null},
    {"id":"checkpoint-policy","path":"verification/checkpoint-policy.json","mode":"LIVE","sha256":null},
    {"id":"early-factory-contract","path":"testbed/run-header-early-selector-binding.mjs","mode":"LIVE","sha256":null},
    {"id":"early-ownership-oracle","path":"tools/test-header-palette-ownership.mjs","mode":"LIVE","sha256":null},
    {"id":"final-boundary-test","path":"testbed/run-header-final-boundary.mjs","mode":"LIVE","sha256":null},
    {"id":"issue-top-contract","path":"testbed/run-header-issue-top-contract.mjs","mode":"LIVE","sha256":null}
  ],
  "requiredDecisions": [
    "working-checkpoint",
    "semantic-entry",
    "scope-and-admission",
    "continuous-goal"
  ],
  "decisions": [
    {"id":"working-checkpoint","status":"ADOPTED","boundary":"Only validated bounded commit/non-force push to origin/codex/ui-port-boundary. No official/live-write/release/version change.","source":"AGENTS.md"},
    {"id":"semantic-entry","status":"ADOPTED","boundary":"Adapters supply full immutable native predicates. Preserve typea/tag/body/roles, complete CSS, .style interface and mount order. No mixed exit without its exact criteria.","source":"docs/ui-surface-contracts.md"},
    {"id":"scope-and-admission","status":"ADOPTED","boundary":"Exact CSS/native behavior preservation plus declared issue-top scheduling correction. Formal priority/extension/live gates and original palette FAIL remain mandatory.","source":"docs/work/HEADER_FINISH.md"},
    {"id":"continuous-goal","status":"ADOPTED","boundary":"User explicitly authorized continuous header completion on 2026-10-13. Do not pause between phases; preserve checkpoint-only publishing and separate install/account/content/release authority.","source":"docs/work/CURRENT_STATE.md"}
  ],
  "hazards": [
    {"id":"hoisted-startup","status":"ACTIVE","effect":"Preserve early before-const composition and late construction/mount phase. Inputs stay literal, frozen and DOM-free; avoid TDZ or executable caller closures."},
    {"id":"native-specificity","status":"ACTIVE","effect":"Preserve complete typea/body/tag/role predicates and declarations/order. CSS equality also needs native identity/input/geometry/resource evidence; stale-role negative is synthetic."},
    {"id":"existing-gaps","status":"ACTIVE","effect":"Selected phase proof does not justify all priorities, live conflicts or driver/startup exit. Original palette FAIL and header/final/upper/live UNKNOWN remain."},
    {"id":"control-and-guard","status":"ACTIVE","effect":"Freeze 6028; serialize builds/probes and restore mobile guard. Historical reports retain original fingerprints and are reusable only within unchanged dependency scope."}
  ],
  "localEvidence": [
    {"path":"artifacts/controls/header-early-6028.user.js","disposition":"REGENERATE","recovery":"Required SHA-256: 602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017. Recover/build exact 2e168f40477b14d8b29e8fa7ab6aad80c8323e45 bytes in isolation from its source/receipt; never reset the active tree or substitute a matching version."}
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
