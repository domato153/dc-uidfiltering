# Next bounded task

- Task ID: `header-navigation`
- Bounded slice: `header-drawer-layout-input-characterization`
- Objective: identify and measure the current drawer presentation width/layout policy and adapter-owned native measurement/containment at narrow/wide/short viewports, including issue and recommendation-only shapes. Define the smallest immutable layout-input boundary needed for real presenter replacement.
- Why next: typed toggle values are separated; CSS and adapter still share the 640px width policy. The researched replacement plan needs a responsive change scenario that preserves native geometry without editing the adapter.
- Expected transition: exact E786 observations, explicit policy-versus-native-geometry ownership, a baseline change-locality counterexample and one selected bounded implementation. Investigation only; no visual/source/ownership move yet.
- Stop/replan: changed/missing control, unexplained native/geometry/phase difference, a required shared/PC/lifecycle owner, wrong-root/remote drift or unavailable oracle. Recover exact inputs or re-scope from current evidence.

Read INDEX/CURRENT/policy, UI_REPLACEABILITY_VALIDATION and the completed intent/body boundaries. Confirm E786 root/dist/guard/control. Trace each width/clamp/offset/recommendation decision in the current presenter and adapter, including both body measure/apply phases. Use the guarded existing observer and fresh contexts for baseline checks; record contrary evidence and applicability. Keep native actions/focus/identity, timers/observers/subscription/state/error ownership and PC bytes intact. Research changing external API facts only if they affect the selection. Keep mixed owners, palette FAIL and upper/live UNKNOWN. Select the implementation only after this characterization, then update candidate/surface contracts before moving responsibilities.

## Declared entry inventory

LIVE pointers are not completeness proof; derive direct dependencies independently. The tracked candidate is a clean-CI entry identity; ignored controls are local evidence.

```dcuf-next-action
{
  "id": "header-drawer-layout-input-characterization",
  "stageId": "header-navigation",
  "requiredDependencies": [
    {
      "id": "governing-policy",
      "path": "AGENTS.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "accepted-plan",
      "path": "docs/work/MOBILE_UI_MODERNIZATION.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "efficient-verification",
      "path": "docs/work/VERIFICATION_EFFICIENCY.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "build-targets",
      "path": "build/targets.json",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "architecture",
      "path": "architecture/registry.json",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "candidate-overlay",
      "path": "architecture/candidates/mobile-ui-modernization-assurance.json",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "surface-contract",
      "path": "docs/ui-surface-contracts.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "gate-routing",
      "path": "verification/gates.json",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "drawer-adapter",
      "path": "src/targets/mobile/header-drawer-host-adapter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "drawer-presenter",
      "path": "src/targets/mobile/header-drawer-presenter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "composition",
      "path": "src/targets/mobile/post-main-fixes.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "current-boundary",
      "path": "docs/work/HEADER_DRAWER_TOGGLE_INTENT.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "body-boundary",
      "path": "docs/work/HEADER_DRAWER_OWNED_BODY.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "body-observer",
      "path": "testbed/run-header-drawer-owned-shell-differential.mjs",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "body-contract",
      "path": "testbed/header-drawer-body-contract.mjs",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "behavior-tests",
      "path": "testbed/run-tests.mjs",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "harness",
      "path": "testbed/harness",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "fixture-server",
      "path": "testbed/server/server.mjs",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "fixtures",
      "path": "testbed/fixtures",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "fixture-public",
      "path": "testbed/public",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "current-candidate",
      "path": "Dc_UserFilter_Mobile_v3.5.5.user.js",
      "mode": "FROZEN",
      "sha256": "e7869194916a5423ce493a33d5a8c85952ac84ddb07160927b320ed36f775779"
    },
    {
      "id": "replacement-validation-plan",
      "path": "docs/work/UI_REPLACEABILITY_VALIDATION.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "toggle-contract",
      "path": "testbed/header-drawer-toggle-contract.mjs",
      "mode": "LIVE",
      "sha256": null
    }
  ],
  "requiredDecisions": [
    "working-checkpoint",
    "layout-entry",
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
      "id": "layout-entry",
      "status": "ADOPTED",
      "boundary": "Characterize current presentation width/layout inputs and adapter measurement/containment first; no source move, new layout framework, general UiPort dispatch, state owner or visual delta in this investigation.",
      "source": "docs/work/UI_REPLACEABILITY_VALIDATION.md"
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
      "id": "native-focus",
      "status": "ACTIVE",
      "effect": "Retain original controls/default actions, native topology and owned-shell focus guard."
    },
    {
      "id": "layout-coupling",
      "status": "ACTIVE",
      "effect": "CSS and adapter share width policy; measure narrow/wide/short, issue and recommendation-only/no-issue shapes. Do not confuse presentation policy with native containment reads or improve metrics by removing safety."
    },
    {
      "id": "phase-scope",
      "status": "ACTIVE",
      "effect": "Both body phases, width pairs, early raw rules and startup variance remain. Refresh traces do not prove arbitrary phase equivalence."
    },
    {
      "id": "existing-failures",
      "status": "ACTIVE",
      "effect": "Original acceptance/palette FAIL; header/34-feature/live UNKNOWN; timer/page-head/popup explanations unresolved."
    },
    {
      "id": "guard-and-control",
      "status": "ACTIVE",
      "effect": "Freeze exact E786; serialize probes/builders and restore mobile guard after PC work."
    }
  ],
  "localEvidence": [
    {
      "path": "artifacts/controls/header-layout-input-E786.user.js",
      "disposition": "REGENERATE",
      "recovery": "Recover exact E786 generated bytes or rebuild their recorded source checkpoint in an isolated control directory. Require exact SHA; missing bytes remain STALE_REPLAN, never an old substitute or tree reset."
    },
    {
      "path": "docs/work/HEADER_DRAWER_TOGGLE_INTENT.md",
      "disposition": "DURABLE",
      "recovery": "Tracked bounded implementation and characterization. Missing ignored reports never recreate old execution as PASS; next investigation produces new exact-input observations."
    }
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
