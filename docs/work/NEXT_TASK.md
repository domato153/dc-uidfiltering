# Next bounded task

- Task ID: `header-navigation`.
- Status: `READY_FOR_BOUNDED_IMPLEMENTATION`; the 79FC owned-shell unit is complete within its recorded scope. Original/new palette comparison FAIL and full-header UNKNOWN remain.
- Bounded slice: `header-drawer-owned-body-presentation-boundary`.
- Why next: HTML/construction and label/ARIA descriptions now belong to the presenter, but `setDrawerOpenState` still defines owned body display/visibility/opacity/pointer/overflow/max-height styles. Extracting those value policies next reduces the remaining current presentation coupling without redesigning native geometry or event ownership.
- Expected transition: Fresh-check nested worktree/Git/79FC runtime and HEADER_DRAWER_OWNED_SHELL.md. Freeze exact 79FC with fresh source HEAD/binding before editing; update the existing overlay/surface contract for zero visual/behavior delta. Move only owned-body open/closed inline value policies into an immutable presenter description consuming adapter-measured serializable geometry. Keep DOM reads, native root state/geometry, mounting/focus, scheduling/listeners/disposal, remaining direct toggle handling and raw CSS phases in their owners. Do not batch or reorder existing measurements/writes. Build at current version and compare a new exact pair in separate contexts.
- Objective: One owned-body presentation description, preserving CSS values/priorities/order and measured max-height/inline-start, owned node identity/default input/focus, original issue/recommendation/popup topology/handlers, settings/metadata/versions and PC isolation. No generic renderer, new owner/resource, new geometry algorithm, native clone/portal, priority removal or mixed promotion. Scope body-inner padding/direct toggle/native variables separately if moving them requires a new contract.
- Validation: Fresh architecture/impact before/after; pure frozen serializable value descriptions plus independent geometry/hit oracles; current immediate-control/candidate minor rank/tip/popup-only and major recommendation across light/dark/narrow/short/wide states; retained-focus Enter, replacement, duplicate connect, dispose/reconnect, storage and baseline timers/frames. Detect selected wrong visibility/priority/measurement/omission faults and restore native positives. The current owned-shell observer's legacy-template input is 689A-specific: retain its historical oracle or adapt a new applicable current-control oracle before claiming a 79FC body differential. Keep raw startup orders and original/new palette FAIL separate; run fresh selected checks and verify-repo all, report incomplete full profiles honestly.
- Known limits: Original CI listeners and six historical C84 timer fields cannot be identified from later traces. A030 original minor/major door controls are unreachable in the new observation; retain the approved D-11 distinction and do not infer equality from callback counts. The 2026-10-03 popup-only timeout still lacks an event trace; its cause remains UNKNOWN despite the independently repaired focus defect.
- Publication boundary: Validated bounded checkpoints/non-force push only to `origin/codex/ui-port-boundary`; live dispatch, PR, release, dependency install, user-profile install and account/content writes remain separate requests.
- Stop/replan: Missing/stale current control/oracle, changed measurement/write order, lost style value/priority, per-refresh remount, native focus/input/topology/geometry/resource drift, a selected survivor, uncharacterized style phase, PC impact or a newly observed higher-priority boot/live defect. Preserve UNKNOWN/raw failures; do not broaden or weaken contracts to pass.

Fresh-read `docs/work/CURRENT_STATE.md`, `docs/work/INDEX.md`, the compact surface map, Git and `node tools/inspect-continuity.mjs` first. Work only in the exact active nested worktree. The standing checkpoint instruction does not authorize official publication or live execution.

## Machine-readable next-action closure

This is a declared dependency/entry inventory, not proof of semantic completeness. Independently derive omitted inputs from the execution path. LIVE dependencies need fresh reads; FROZEN dependencies must match exact bytes. A hash match alone grants neither entry nor success.

```dcuf-next-action
{
  "id": "header-drawer-owned-body-presentation-boundary",
  "stageId": "header-navigation",
  "requiredDependencies": [
    {
      "id": "governing-policy",
      "path": "AGENTS.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "checkpoint-safety",
      "path": "verification/checkpoint-policy.json",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "decision-rationale",
      "path": "docs/work/DECISION_RATIONALE.md",
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
      "id": "surface-map",
      "path": "docs/ui-surface-contracts.md",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "surface-machine",
      "path": "architecture/ui-surfaces.json",
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
      "id": "shell-adapter",
      "path": "src/targets/mobile/header-shell-host-adapter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "shell-presenter",
      "path": "src/targets/mobile/header-shell-presenter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "gnb-adapter",
      "path": "src/targets/mobile/header-gnb-host-adapter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "gnb-presenter",
      "path": "src/targets/mobile/header-gnb-presenter.js",
      "mode": "LIVE",
      "sha256": null
    },
    {
      "id": "host-theme",
      "path": "src/targets/mobile/theme-host-style.js",
      "mode": "LIVE",
      "sha256": null
    },
    { "id": "original-core", "path": "src/targets/mobile/filter-module.js", "mode": "LIVE", "sha256": null },
    { "id": "shell-lifecycle", "path": "src/targets/mobile/ui-module.js", "mode": "LIVE", "sha256": null },
    { "id": "bootstrap-locking", "path": "src/runtime/bootstrap.js", "mode": "LIVE", "sha256": null },
    { "id": "runtime-coordinator", "path": "src/targets/mobile/runtime-coordinator.js", "mode": "LIVE", "sha256": null },
    { "id": "theme-port", "path": "src/targets/shared/theme-host-port.js", "mode": "LIVE", "sha256": null },
    { "id": "theme-presenter", "path": "src/targets/shared/theme-presenter.js", "mode": "LIVE", "sha256": null },
    { "id": "page-head-adapter", "path": "src/targets/mobile/gallery-page-head-host-adapter.js", "mode": "LIVE", "sha256": null },
    { "id": "page-head-presenter", "path": "src/targets/mobile/gallery-page-head-presenter.js", "mode": "LIVE", "sha256": null },
    { "id": "recent-adapter", "path": "src/targets/mobile/header-recent-visit-host-adapter.js", "mode": "LIVE", "sha256": null },
    { "id": "recent-presenter", "path": "src/targets/mobile/header-recent-visit-presenter.js", "mode": "LIVE", "sha256": null },
    { "id": "drawer-adapter", "path": "src/targets/mobile/header-drawer-host-adapter.js", "mode": "LIVE", "sha256": null },
    { "id": "drawer-presenter", "path": "src/targets/mobile/header-drawer-presenter.js", "mode": "LIVE", "sha256": null },
    { "id": "fixture-server", "path": "testbed/server", "mode": "LIVE", "sha256": null },
    { "id": "fixture-public", "path": "testbed/public", "mode": "LIVE", "sha256": null },
    { "id": "root-package", "path": "package.json", "mode": "LIVE", "sha256": null },
    { "id": "testbed-package", "path": "testbed/package.json", "mode": "LIVE", "sha256": null },
    { "id": "dependency-lock", "path": "pnpm-lock.yaml", "mode": "LIVE", "sha256": null },
    { "id": "mobile-builder", "path": "tools/build-userscript.mjs", "mode": "LIVE", "sha256": null },
    { "id": "hosted-observation", "path": "docs/work/HOSTED_ACCEPTANCE_OBSERVATION.md", "mode": "LIVE", "sha256": null },
    { "id": "baseline", "path": "verification/baselines.json", "mode": "LIVE", "sha256": null },
    { "id": "palette-observer", "path": "testbed/run-palette-differential.mjs", "mode": "LIVE", "sha256": null },
    { "id": "historical-classifier", "path": "tools/classify-palette-owner-split.mjs", "mode": "LIVE", "sha256": null },
    { "id": "owner-probe", "path": "tools/probe-palette-owner-lifecycle.mjs", "mode": "LIVE", "sha256": null },
    { "id": "owner-negative-controls", "path": "tools/test-palette-owner-split.mjs", "mode": "LIVE", "sha256": null },
    { "id": "evidence-binding", "path": "tools/evidence-binding.mjs", "mode": "LIVE", "sha256": null },
    { "id": "declared-deltas", "path": "verification/intended-deltas.json", "mode": "LIVE", "sha256": null },
    {
      "id": "cascade-audit",
      "path": "testbed/run-header-cascade-audit.mjs",
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
      "id": "runtime-tests",
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
      "id": "mobile-candidate",
      "path": "Dc_UserFilter_Mobile_v3.5.5.user.js",
      "mode": "FROZEN",
      "sha256": "79fcbc260fdcd43febe62b56bf4ee29d8e4c09f9a061663dadf550ec3f1f87da"
    },
    {"id":"current-adjudication","path":"docs/work/PALETTE_RESOURCE_ADJUDICATION.md","mode":"LIVE","sha256":null},
    {"id":"runtime-instrumentation","path":"testbed/harness/runtime-instrumentation.js","mode":"LIVE","sha256":null},
    {"id":"settings-presenter","path":"src/targets/shared/settings-presenter.js","mode":"LIVE","sha256":null},
    {"id":"shared-ui-contracts","path":"src/shared/ui-contracts.js","mode":"LIVE","sha256":null},
    {"id":"disposable-scope","path":"src/targets/shared/ui-disposable-scope.js","mode":"LIVE","sha256":null},
    {"id":"listener-provenance","path":"docs/work/PALETTE_LISTENER_PROVENANCE.md","mode":"LIVE","sha256":null},
    {"id":"listener-diagnostic-hook","path":"tools/palette-listener-diagnostic.js","mode":"LIVE","sha256":null},
    {"id":"listener-diagnostic-probe","path":"tools/probe-palette-listener-provenance.mjs","mode":"LIVE","sha256":null},
    {"id":"popup-geometry-adapter","path":"src/targets/shared/popup-geometry-host-adapter.js","mode":"LIVE","sha256":null},
    {"id":"header-overlay","path":"architecture/candidates/mobile-ui-modernization-assurance.json","mode":"LIVE","sha256":null},
    {"id":"active-plan","path":"docs/work/MOBILE_UI_MODERNIZATION.md","mode":"LIVE","sha256":null},
    {"id":"post-main-composition","path":"src/targets/mobile/post-main-fixes.js","mode":"LIVE","sha256":null},
    {"id":"shell-width-projection","path":"docs/work/HEADER_SHELL_RESET_CONTRACT.md","mode":"LIVE","sha256":null},
    {"id":"shell-width-probe","path":"tools/probe-header-shell-reset.mjs","mode":"LIVE","sha256":null},
    {"id":"current-boundary-inventory","path":"docs/work/HEADER_BOUNDARY_GAPS.md","mode":"LIVE","sha256":null},
    {"id":"ui-boundary-checker","path":"tools/verify-ui-boundaries.mjs","mode":"LIVE","sha256":null},
    {"id":"phase-ownership-checker","path":"tools/test-header-palette-ownership.mjs","mode":"LIVE","sha256":null},
    {"id":"owned-shell-result","path":"docs/work/HEADER_DRAWER_OWNED_SHELL.md","mode":"LIVE","sha256":null},
    {"id":"owned-shell-observer","path":"testbed/run-header-drawer-owned-shell-differential.mjs","mode":"LIVE","sha256":null}
  ],
  "requiredDecisions": [
    "working-checkpoint",
    "D-11-original-node",
    "D-12-layered-comparison",
    "D-19-listener-evidence",
    "D-20-shell-phase-evidence",
    "D-21-owned-drawer-boundary",
    "D-22-bounded-order-admission"
  ],
  "decisions": [
    {
      "id": "working-checkpoint",
      "status": "ADOPTED",
      "boundary": "Only validated bounded checkpoints to codex/ui-port-boundary; no official or live authority.",
      "source": "AGENTS.md"
    },
    {
      "id": "D-11-original-node",
      "status": "ADOPTED",
      "boundary": "Keep native header nodes/default events in place; no clone, portal or hidden-original forwarding.",
      "source": "docs/work/DECISION_RATIONALE.md"
    },
    {
      "id": "D-12-layered-comparison",
      "status": "ADOPTED",
      "boundary": "Bounded comparison pilot; raw visual classification is not header acceptance.",
      "source": "docs/work/DECISION_RATIONALE.md"
    },
    {
      "id": "D-13-to-D-18-bounded-observations",
      "status": "ADOPTED",
      "boundary": "Preserve limited shared/storage observations, timer uncertainty and recovery fixes as bounded evidence; no final feature PASS.",
      "source": "docs/work/DECISION_RATIONALE.md"
    },
    {
      "id": "full-header-promotion",
      "status": "DEFERRED",
      "boundary": "Await current stage/34-ID/live and upper evidence; no promotion from checkpoint CI.",
      "source": "architecture/ui-surfaces.json"
    },
    {"id":"D-19-listener-evidence","status":"ADOPTED","boundary":"New provenance supports bounded current observation only; no original CI identity, native-door equivalence, or full-header admission.","source":"docs/work/DECISION_RATIONALE.md"},
    {"id":"D-20-shell-phase-evidence","status":"ADOPTED","boundary":"Retain both shell width pairs; characterize early scope and later conflict protection separately. Public reconnect order and diagnostic rollback are distinct; no full-header or order-independence admission.","source":"docs/work/DECISION_RATIONALE.md"},
    {"id":"D-21-owned-drawer-boundary","status":"ADOPTED","boundary":"The existing owned template/label descriptor now belongs to the presenter; preserve native adapter mounting/focus, mixed labels and admission gaps when continuing body separation.","source":"docs/work/DECISION_RATIONALE.md"},
    {"id":"D-22-bounded-order-admission","status":"ADOPTED","boundary":"Keep bounded owned-shell/native equality, raw control startup-order variance and original/new palette FAIL distinct; freeze the exact current control and retain applicable oracles before the next body-value move.","source":"docs/work/DECISION_RATIONALE.md"}
  ],
  "hazards": [
    {
      "id": "hosted-palette-failure",
      "status": "ACTIVE",
      "effect": "Original cda1087 full acceptance stays FAILED. A new A030/689A execution explains the 18-key delta and supports candidate native actions/lifecycle, but does not identify original CI callbacks or admit full owner split. The old classifier still rejects this pair."
    },
    {
      "id": "raw-scope",
      "status": "ACTIVE",
      "effect": "Unmarked/non-typea and early raw rules may differ; mounted duplication is not proof of deletion."
    },
    {
      "id": "historical-timeout",
      "status": "ACTIVE",
      "effect": "Old popup timeout lacks an event trace; repaired self-insertion focus defect does not diagnose that old attempt."
    },
    {
      "id": "historical-timer",
      "status": "ACTIVE",
      "effect": "Six original C84 timer fields remain unclassified; later current matching pairs do not close them."
    },
    {
      "id": "live-gap",
      "status": "ACTIVE",
      "effect": "Current 79FC has no actual-extension/public/hosted-live result; old 689A/public and 0C30 startup evidence is historical. Hosted/original/new synthetic palette FAIL stays separate."
    },
    {
      "id": "resource-guard",
      "status": "ACTIVE",
      "effect": "Serialize builders/probes; PC can overwrite the generic guard. Require mobile SHA before each header probe."
    },
    {"id":"listener-ledger","status":"ACTIVE","effect":"Registration ledger and actual reachable callbacks differ. New 22-context observation is separately bound to both tools; original identities, complete callback equivalence and live/extension coverage remain UNKNOWN. Control original doors are unreachable; do not force or forward their actions."},
    {"id":"transition-scope","status":"ACTIVE","effect":"Several mixed-header component exits name full visual promotion, while the plan first requires zero-delta separation. Distinguish structural gaps, retained compatibility debt and absent evidence; a mixed label alone does not choose a code change."},
    {"id":"public-reconnect-order","status":"ACTIVE","effect":"Shell public reconnect reinserts its subscription at the Map end. Selected native actions pass before explicit test-only order rollback; arbitrary mutation-order equivalence remains unproved."},
    {"id":"owned-shell-focus","status":"ACTIVE","effect":"Recreating the DCUF shell or inserting a current first child into itself drops retained native focus. Preserve the source guard and original mounted owned nodes through refresh; template extraction is not permission to rewrite mounting."},
    {"id":"partial-startup-gap","status":"ACTIVE","effect":"Drawer is absent from the inspected UIModule boot callbacks and separately connects on lists. Partial-startup behavior is unobserved; do not infer a product bug, global order equivalence or successful boot disposal from manual adapter tests."},
    {"id":"raw-startup-order","status":"ACTIVE","effect":"Unchanged control has early/late drawer-style insertion and current raw order differs. Preserve raw evidence/source phase and other-owner ordering checks; bounded computed/native equality is not arbitrary phase independence. Drawer absence on write is not global resource closure."}
  ],
  "localEvidence": [
    {
      "path": "testbed/artifacts/baseline-mobile-beta.user.js",
      "disposition": "REGENERATE",
      "recovery": "Exact A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343 control is present locally. If missing, use the baseline contract's historical source/build procedure and require exact bytes; never substitute C84/32BA classifier inputs. This recreates declared baseline bytes, not an old observation."
    },
    {
      "path": "artifacts/handoff-hosted-cda1087/artifacts/acceptance-observed-mobile-palette.json",
      "disposition": "REGENERATE",
      "recovery": "Original raw report and both downloaded side files are a precondition for raw-dependent adjudication. Verify hashes in HOSTED_ACCEPTANCE_OBSERVATION.md before entry. Recovery means retrieving the original named CI artifact, not regenerating an old execution. Missing/unavailable or mismatched bytes require STALE_REPLAN with a new bounded observation task; no inherited classification."
    },
    {
      "path": "docs/work/HOSTED_ACCEPTANCE_OBSERVATION.md",
      "disposition": "DURABLE",
      "recovery": "Tracked source/run/failure/raw-hash projection only. Same-host raw reports and sides are in artifacts/handoff-hosted-cda1087/. Verify original hashes; re-download named artifact if needed while available. If unavailable, raw-dependent adjudication stays UNKNOWN and a newly bound observation is a new claim, not regeneration of the old trace."
    },
    {
      "path": "verification/receipts/2026-09-23-write-edit-delete-popup.json",
      "disposition": "DURABLE",
      "recovery": "Tracked accepted native-form baseline only; no current header admission."
    },
    {
      "path": "testbed/artifacts/runtime-under-test.user.js",
      "disposition": "REGENERATE",
      "recovery": "In a new LF checkout, run mobile canonical build, mobile --testbed-output, then PC canonical build serially here; confirm exact 79FC root/dist/guard and 1A7 PC bytes. Do not normalize expected hashes or run PC guard builder concurrently."
    },
    {
      "path": "testbed/artifacts/header-keyboard-validation-final-2026-10-04.json",
      "disposition": "REGENERATE",
      "recovery": "If absent, run current guarded candidate-focused/cascade/mobile/host/PC checks to create new bounded reports, not the original final summary or traces. Frozen-control claims require the exact local 1E24 archive and replay inputs below; otherwise retain them as UNKNOWN. Existing final summary SHA is 943A7099EA4E9ED0E3399C65D16651A83D68E3A6233DD976560FE86209087968."
    },
    {
      "path": "Legacy유저스크립트storage/Dc_UserFilter_Mobile_v3.5.5_pre-drawer-focus_1E24FEDF.user.js",
      "disposition": "UNRECOVERABLE",
      "recovery": "Exact local frozen control SHA 1E24FEDF291FA67C792D01F23E55B5548664A63AB9D4D5B9DC2952C189D4212B. If missing, no guessed control or historical comparison claim; current candidate characterization does not require this old comparison."
    },
    {
      "path": "testbed/artifacts/replay-header-keyboard.mjs",
      "disposition": "UNRECOVERABLE",
      "recovery": "Local replay tool SHA BCBFBBF2372C3DE3132C0E9D3B974A088B5C1BBA2DEA74C7C0602C36350E3B2C. If absent, do not claim replay of the old eight reports or mutations; run new tracked checks for new evidence only."
    },
    {
      "path": "testbed/artifacts/gnb-reset-inherited-popup-timeout-2026-10-03.json",
      "disposition": "UNRECOVERABLE",
      "recovery": "The original attempt has no event trace; preserve UNKNOWN cause and do not infer it from later passing retries."
    },
    {"path":"artifacts/palette-adjudication-2026-10-04/owner-lifecycle.json","disposition":"REGENERATE","recovery":"Existing new 689A candidate-only observation SHA 431548D6A0ED5001F3930229B9B044E044C10D9B7226E46911F28FB74B88353B. If missing, run the unchanged lifecycle probe for a new bound observation; do not reconstruct these exact old bytes or original CI phase."},
    {"path":"artifacts/palette-adjudication-2026-10-04/reconciliation.json","disposition":"REGENERATE","recovery":"Existing audit summary SHA 13F8CAD29ED8A23D08A264B83D58BCFC8F267A914A51E064761DDDC8E3AA56A6. Durable scope/gaps are in PALETTE_RESOURCE_ADJUDICATION.md. If absent, reconcile original raw and fresh inputs again; no inherited PASS or old summary recreation."},
    {"path":"artifacts/palette-listener-provenance-2026-10-04/report-2026-10-04T07-39-32-511Z.json","disposition":"REGENERATE","recovery":"New local observation SHA 43EC31702111E9E9A759FB945FA73D3D7C2110A104160016FC938990C0293D47; tool SHAs/scope are in PALETTE_LISTENER_PROVENANCE.md. If missing/stale, retain the durable limited projection and rerun the diagnostic with original raw/control preconditions for new evidence. Never reconstruct this report or original CI identities. Full stage/owner-split admission remains UNKNOWN."},
    {"path":"docs/work/HEADER_SHELL_RESET_CONTRACT.md","disposition":"DURABLE","recovery":"Tracked candidate-only projection, exact final/partial report and tool hashes, native/negative scope and explicit rollback. It is sufficient as a limited inventory locator, never a full-header receipt."},
    {"path":"artifacts/header-shell-reset-2026-10-05/report-2026-10-05T10-53-10-641Z.json","disposition":"REGENERATE","recovery":"Final local observation SHA A3B1D89FECAA001B99109148BA83DF0FB18D749D3280A103AC3129999D312880. If absent/stale, run the tracked probe with --require-runtime-under-test for a new bound report; do not recreate old bytes or inherit execution. Inventory missing coverage as UNKNOWN until renewed."},
    {"path":"artifacts/header-shell-reset-2026-10-05/report-2026-10-05T10-50-40-116Z.json","disposition":"UNRECOVERABLE","recovery":"Initial PARTIAL attempt SHA F8EC176C700CEF2423715111DAEF45196256C343F34DABDA280C448650D7EAF0 is tied to an earlier uncommitted diagnostic hash. If absent, retain durable failure attribution only; never replay a current tool as this old attempt."},
    {"path":"docs/work/HEADER_BOUNDARY_GAPS.md","disposition":"DURABLE","recovery":"Tracked historical 689A source/evidence scope and selected implementation boundary; current result is in HEADER_DRAWER_OWNED_SHELL.md. Recheck source, effective overlay and exact dependencies; it is not a component/stage conformance receipt."},
    {"path":"artifacts/header-boundary-inventory-2026-10-05/inspection.json","disposition":"REGENERATE","recovery":"Local source/evidence inspection SHA 2B99BB54A73531282BD388F790CE0783F8B9AC90AE63688FA3FF8E8A08DAA9EA. If absent, re-inspect current source/build and report hashes for a new inventory, not reconstruction of old bytes. No browser execution is inherited."},
    {"path":"Dc_UserFilter_Mobile_v3.5.5.user.js","disposition":"REGENERATE","recovery":"Before editing, freeze exact 79FC bytes with fresh source HEAD/current pre-change binding for the body unit. Require SHA 79FCBC260FDCD43FEBE62B56BF4EE29D8E4C09F9A061663DADF550EC3F1F87DA; do not substitute legacy 689A as the next immediate control. A rebuilt artifact does not recreate old event traces."},
    {"path":"docs/work/HEADER_DRAWER_OWNED_SHELL.md","disposition":"DURABLE","recovery":"Tracked current source result, exact report identities, oracle corrections/raw-order variance and incomplete admission. Recheck inputs; it is not a header-stage receipt."},
    {"path":"artifacts/header-drawer-owned-shell-2026-10-05/control.user.js","disposition":"REGENERATE","recovery":"Historical pre-template 689A control frozen at d4540c6902509b5d61d8c8800a76e4bc1d7835b9. Recover exact bytes from that source or the local archive and require SHA 689A66DFBA738CC3325BE85CD3E1EA53E4AE3089A3454CAF5CC69BC657D3E0DD. Never recreate its old execution/binding or use it as the next body control."},
    {"path":"artifacts/header-drawer-owned-shell-2026-10-05/differential-2026-10-05-final-v2.json","disposition":"REGENERATE","recovery":"Bounded report SHA 5B09B88C75ABEE52DD4807439543492096ADC958EB9DFB52070BA54DBFAF013B. If missing/stale, replay an applicable exact pair into a new path or retain UNKNOWN. Raw phase differences and the observer's legacy-control precondition remain in the durable projection."},
    {"path":"artifacts/header-drawer-owned-shell-2026-10-05/proof-audit-port-excluded.json","disposition":"REGENERATE","recovery":"Proof-system report SHA C09D29FEA8FD37399921094CFA968C087F36A96A6F913ADFE033D91E5FC04CDD. If missing/stale, resolve a fresh impact route and run tools/audit-proof-system.mjs with a new output at the current guarded runtime. A new audit is not the old execution or a full product/profile receipt."},
    {"path":"artifacts/header-drawer-owned-shell-2026-10-05/environment-port-reservation.json","disposition":"UNRECOVERABLE","recovery":"Local execution record SHA 9B2EC8484F5C4BEF607F8B067F52A04146D8E729E5BB491AC370FD63C59CE909 binds the observed port-5061 failure workaround, unchanged child checks and ignored wrapper/logs. If absent, retain only the durable limited projection; do not recreate this old record. New environmental failures require their own observation and bounded remedy."}
  ],
  "qualificationScope": "CONTINUITY_ONLY",
  "workSuccessCertified": false
}
```
