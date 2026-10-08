# Next bounded task

- Task ID: `header-navigation`
- Bounded slice: `header-drawer-width-input-boundary`
- Objective: make one frozen presenter max-width input the authority for its CSS and existing adapter width calculations, preserving default output and native behavior.
- Why next: CSS-only 560 leaves an 80px wide minor-list anchor error; CSS-only growth overflows. Recommendation-only/narrow contexts conceal the coupling. The final-top correctness prerequisite is implemented; retain its current regression.
- Expected transition: one pure frozen numeric value consumed by three CSS sites and three adapter sites. Both owners remain mixed; no final-header/UiPort/replaceability admission.
- Stop/replan: changed/missing control, default CSS/phase/native behavior difference, need for new DOM geometry reads/state/subscribers/coordinator changes, wrong root or remote drift.

Read INDEX/CURRENT/policy, HEADER_DRAWER_LAYOUT_INPUT and HEADER_DRAWER_FINAL_TOP. Confirm A5EB root/dist/guard/control and unchanged PC. Inventory all six 640/24px width sites and the default style-builder phase. Add failing value/freeze/default-CSS/adapter-consumption controls, update the candidate/surface contract, then expose one frozen maxWidth=640 presenter description. Use it in three existing CSS expressions and three existing adapter calculations without changing rounding, clamping, visibility or measure/apply order. Validate caps below/at/above the viewport on wide/narrow/664px breakpoint, light/dark, minor/recommendation/mixed contexts, native input/focus, final-top idempotency, replacement/reset and disposal. Compare exact A5EB/candidate semantic receipts in fresh contexts and rebuild at current version. Refresh the Git route and affected proof. Width editing effort and full replacement readiness remain unmeasured; no visual redesign, generic layout framework, extra reads or issue-top correction belongs to this unit.

## Declared entry inventory

LIVE pointers are not completeness proof; derive direct dependencies independently. The tracked artifact is the clean-CI entry identity; local controls/reports are ignored evidence.

```dcuf-next-action
{
  "id": "header-drawer-width-input-boundary",
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
    {"id":"body-observer","path":"testbed/run-header-drawer-owned-shell-differential.mjs","mode":"LIVE","sha256":null},
    {"id":"body-contract","path":"testbed/header-drawer-body-contract.mjs","mode":"LIVE","sha256":null},
    {"id":"behavior-tests","path":"testbed/run-tests.mjs","mode":"LIVE","sha256":null},
    {"id":"harness","path":"testbed/harness","mode":"LIVE","sha256":null},
    {"id":"fixture-server","path":"testbed/server/server.mjs","mode":"LIVE","sha256":null},
    {"id":"fixtures","path":"testbed/fixtures","mode":"LIVE","sha256":null},
    {"id":"fixture-public","path":"testbed/public","mode":"LIVE","sha256":null},
    {
      "id": "current-candidate",
      "path": "Dc_UserFilter_Mobile_v3.5.5.user.js",
      "mode": "FROZEN",
      "sha256": "a5eb4ba2f05cf17f7857e9dc16741ed5b658ebd84470cda7558eb62e7ef93a32"
    },
    {"id":"replacement-validation-plan","path":"docs/work/UI_REPLACEABILITY_VALIDATION.md","mode":"LIVE","sha256":null},
    {"id":"toggle-contract","path":"testbed/header-drawer-toggle-contract.mjs","mode":"LIVE","sha256":null},
    {"id":"layout-characterization","path":"docs/work/HEADER_DRAWER_LAYOUT_INPUT.md","mode":"LIVE","sha256":null},
    {"id":"final-top-correction","path":"docs/work/HEADER_DRAWER_FINAL_TOP.md","mode":"LIVE","sha256":null}
  ],
  "requiredDecisions": [
    "working-checkpoint",
    "width-entry",
    "scope-and-admission"
  ],
  "decisions": [
    {
      "id": "working-checkpoint",
      "status": "ADOPTED",
      "boundary": "Only bounded validated commits/non-force pushes to origin/codex/ui-port-boundary; no official/live/release authority.",
      "source": "AGENTS.md"
    },
    {
      "id": "width-entry",
      "status": "ADOPTED",
      "boundary": "Extract one frozen numeric presenter maxWidth=640 input for its three CSS declarations and three existing adapter calculations. Preserve default CSS bytes, rounding/clamping, body/native read/write phases and native input/focus/restoration/settings/PC. No DOM read, framework, state/subscriber, issue-top or coordinator change. Keep components mixed.",
      "source": "docs/work/HEADER_DRAWER_LAYOUT_INPUT.md"
    },
    {
      "id": "scope-and-admission",
      "status": "ADOPTED",
      "boundary": "Body equality is bounded/synthetic, not mixed exit or full profile/stage/live admission. Preserve palette FAIL and upper/final UNKNOWN.",
      "source": "docs/work/VERIFICATION_EFFICIENCY.md"
    }
  ],
  "hazards": [
    {
      "id": "width-coupling",
      "status": "ACTIVE",
      "effect": "Narrow and recommendation-only contexts hide stale placement. Keep wide minor-list CSS-only shrink/grow negatives, containment and breakpoint coverage."
    },
    {
      "id": "native-contract",
      "status": "ACTIVE",
      "effect": "Preserve original controls/default input/focus, body phases, final native heights/positions, popup-only closure, reset/restoration and quiescence. Retain new final-top regression."
    },
    {
      "id": "existing-gaps",
      "status": "ACTIVE",
      "effect": "Analogous issue-top behavior and live applicability unverified; full-header/34-feature/upper/live UNKNOWN and original palette FAIL remain. Width extraction is not readiness or universal edit-cost proof."
    },
    {
      "id": "guard-and-control",
      "status": "ACTIVE",
      "effect": "Freeze exact A5EB; serialize probes/builders, restore mobile guard after PC work and renew affected proof inputs."
    }
  ],
  "localEvidence": [
    {
      "path": "artifacts/controls/header-final-top-A5EB.user.js",
      "disposition": "REGENERATE",
      "recovery": "Recover exact A5EB generated bytes or rebuild the checkpoint containing this correction in an isolated control directory. Require exact SHA; missing bytes remain STALE_REPLAN, never reset the tree or substitute old E786."
    },
    {
      "path": "docs/work/HEADER_DRAWER_FINAL_TOP.md",
      "disposition": "DURABLE",
      "recovery": "Tracked negative/correction and current source/artifact scopes. Ignored old reports are local execution, not required entry and never recreated as PASS; rerun affected evidence on current exact inputs."
    }
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
