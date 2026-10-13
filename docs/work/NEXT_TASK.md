# Next: recover header live admission

- Task ID: `header-navigation`
- Bounded slice: `header-live-admission-recovery`
- Objective: Complete the missing actual-extension/native-header and remaining property-specific live priority packet in HEADER_FINAL_ADMISSION.md. Local implementation and current palette adjudication are complete.
- Why next: Pinned full Chromium fails before extension installation (`spawn UNKNOWN`); headless-shell Testbed checks cannot substitute for actual-extension receipt. Selected priority reasons pass, while other declarations' necessity remains UNKNOWN.
- Expected transition: Formal admission only when exact current mixed criteria and all required receipts qualify; preserve raw palette FAIL and no automatic registry fold/release.
- Stop/replan: Missing exact local evidence, changed runtime/oracle/toolchain, live drift, surviving negative or remote drift. Report a concrete environment blocker; do not lower the oracle.

The latest user item-1 request authorizes pinned extension and exact script installation in isolated temporary profiles. Normal browser/account settings and content writes remain outside scope. Completed source checkpoint is 1ab24282f5ab675a48d129a9f3718c1a8188a51e. The current evidence/checker unit's checkpoint receipt owns its future publication identity.

## Declared entry inventory

Tracked/build-recoverable inputs qualify entry only. Ignored evidence must be recovered at its exact digest or replaced by fresh execution with a reviewed exact-artifact profile; CI cannot certify local availability.

```dcuf-next-action
{
  "id": "header-live-admission-recovery",
  "stageId": "header-navigation",
  "requiredDependencies": [
    {"id":"governing-policy","path":"AGENTS.md","mode":"LIVE","sha256":null},
    {"id":"accepted-plan","path":"docs/work/MOBILE_UI_MODERNIZATION.md","mode":"LIVE","sha256":null},
    {"id":"current-authorization","path":"docs/work/CURRENT_STATE.md","mode":"LIVE","sha256":null},
    {"id":"current-admission","path":"docs/work/HEADER_FINAL_ADMISSION.md","mode":"LIVE","sha256":null},
    {"id":"completed-source-unit","path":"docs/work/HEADER_FINISH.md","mode":"LIVE","sha256":null},
    {"id":"surface-contract","path":"docs/ui-surface-contracts.md","mode":"LIVE","sha256":null},
    {"id":"build-targets","path":"build/targets.json","mode":"LIVE","sha256":null},
    {"id":"source-builder","path":"tools/build-userscript.mjs","mode":"LIVE","sha256":null},
    {"id":"runtime-sources","path":"src","mode":"LIVE","sha256":null},
    {"id":"architecture","path":"architecture/registry.json","mode":"LIVE","sha256":null},
    {"id":"candidate-overlay","path":"architecture/candidates/mobile-ui-modernization-assurance.json","mode":"LIVE","sha256":null},
    {"id":"surface-map","path":"architecture/ui-surfaces.json","mode":"LIVE","sha256":null},
    {"id":"gate-routing","path":"verification/gates.json","mode":"LIVE","sha256":null},
    {"id":"routed-baselines","path":"verification/baselines.json","mode":"LIVE","sha256":null},
    {"id":"impact-resolver","path":"tools/resolve-impact.mjs","mode":"LIVE","sha256":null},
    {"id":"gate-runner","path":"tools/run-gates.mjs","mode":"LIVE","sha256":null},
    {"id":"evidence-binding","path":"tools/evidence-binding.mjs","mode":"LIVE","sha256":null},
    {"id":"palette-observer","path":"testbed/run-palette-differential.mjs","mode":"LIVE","sha256":null},
    {"id":"palette-classifier","path":"tools/classify-palette-owner-split.mjs","mode":"LIVE","sha256":null},
    {"id":"palette-negative-controls","path":"tools/test-palette-owner-split.mjs","mode":"LIVE","sha256":null},
    {"id":"palette-lifecycle","path":"tools/probe-palette-owner-lifecycle.mjs","mode":"LIVE","sha256":null},
    {"id":"cascade-observer","path":"testbed/run-header-cascade-audit.mjs","mode":"LIVE","sha256":null},
    {"id":"native-observer","path":"testbed/run-header-drawer-owned-shell-differential.mjs","mode":"LIVE","sha256":null},
    {"id":"fixtures","path":"testbed/fixtures","mode":"LIVE","sha256":null},
    {"id":"harness","path":"testbed/harness","mode":"LIVE","sha256":null},
    {"id":"server","path":"testbed/server/server.mjs","mode":"LIVE","sha256":null},
    {"id":"live-contract","path":"verification/live-site-canary.json","mode":"LIVE","sha256":null},
    {"id":"live-driver","path":"testbed/run-live-site-canary.mjs","mode":"LIVE","sha256":null},
    {"id":"live-verdict","path":"testbed/harness/live-site-contract.mjs","mode":"LIVE","sha256":null},
    {"id":"live-replay","path":"tools/verify-live-site-canary.mjs","mode":"LIVE","sha256":null},
    {"id":"extension-package-verifier","path":"tools/prepare-live-extension.mjs","mode":"LIVE","sha256":null},
    {"id":"checkpoint-workflow","path":"docs/checkpoint-workflow.md","mode":"LIVE","sha256":null},
    {"id":"checkpoint-policy","path":"verification/checkpoint-policy.json","mode":"LIVE","sha256":null}
  ],
  "requiredDecisions": ["working-checkpoint","semantic-entry","scope-and-admission","live-authorization"],
  "decisions": [
    {"id":"working-checkpoint","status":"ADOPTED","boundary":"Validated bounded commit/non-force push only to origin/codex/ui-port-boundary; official/release/version changes remain separate.","source":"AGENTS.md"},
    {"id":"semantic-entry","status":"ADOPTED","boundary":"Preserve immutable full predicates, complete CSS and native DOM/events/forms/order/settings. No mixed exit without exact current criteria.","source":"docs/ui-surface-contracts.md"},
    {"id":"scope-and-admission","status":"ADOPTED","boundary":"Current palette classification is a sidecar; original raw FAIL remains. Selected priority reasons do not justify every declaration or close header/live/upper admission.","source":"docs/work/HEADER_FINAL_ADMISSION.md"},
    {"id":"live-authorization","status":"ADOPTED","boundary":"User authorized isolated temporary-profile extension/script installation and read-only public native actions for item 1. Preserve normal profiles/accounts; no content writes or release authority.","source":"docs/work/CURRENT_STATE.md"}
  ],
  "hazards": [
    {"id":"full-browser-environment","status":"ACTIVE","effect":"Full Chromium cannot launch; actual extension remains unavailable before installation. Headless-shell success is only Testbed capability."},
    {"id":"cascade-applicability","status":"ACTIVE","effect":"Selected typea/reset/palette negatives pass, but remaining priorities and live conflict prevalence are unknown; never invent collision reasons."},
    {"id":"evidence-reuse","status":"ACTIVE","effect":"Exact artifact/report/source/build/fixture/harness/toolchain/node/browser identity qualifies reuse. Old global fingerprints keep their original scopes."}
  ],
  "localEvidence": [
    {"path":"artifacts/header-finish-2026-10-13/unit-result.json","disposition":"REGENERATE","recovery":"Recover exact SHA-256 055BE1CDBB8E3BEAFC61B0C6898ED9626E78C768E1E4FA15BD16A03244A08E60 and its pinned reports. If unavailable, rerun coverage and add a reviewed exact-artifact profile; never fabricate an old unit."},
    {"path":"artifacts/header-finish-2026-10-13/full-mobile.json","disposition":"REGENERATE","recovery":"Recover exact SHA-256 44826C6625C662397084A3A13DEA3ED4E5B4F6C99D78720CA98687BDF41B35DE for current classifier reuse, or rerun and review a new profile."},
    {"path":"artifacts/controls/header-early-6028.user.js","disposition":"REGENERATE","recovery":"Recover exact 602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017 bytes from its source/receipt in isolation; never reset the active tree."}
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
