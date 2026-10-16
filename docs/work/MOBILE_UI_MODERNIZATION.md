# Mobile UI modernization and three-layer assurance

Status: `ACTIVE`

This tracked document is the durable implementation plan for replacing the mobile DCInside presentation with a balanced Fluid/Tactile UI while preserving product semantics. Chat plans, screenshots, and historical receipts are context only. Fresh Git state, current machine contracts, exact artifacts, and reproducible evidence take precedence.

## Success condition

The work is complete only when all of the following are true for the same exact candidate artifact:

- mobile presentation can be selected or replaced without changing application-runtime or host-adapter behavior;
- representative cosmetic, owned-composition, responsive-layout and actual replacement/restoration scenarios have current receipts proving local presentation edits and preserved behavior, following `docs/work/UI_REPLACEABILITY_VALIDATION.md`; static separation alone does not satisfy this condition;
- all declared semantic contracts pass and every undeclared difference is rejected as drift;
- differential, specification, characterization, metamorphic, static, live-shaped, and live-canary evidence agree without being double-counted when they share an oracle or producer;
- targeted negative mutations fail for their intended reason and positive controls remain accepted;
- every mandatory assurance claim is `PASS`, every current receipt binding is valid, and there are no unresolved defeaters;
- the final functional inventory has an explicit result for every applicable feature, and the exact-artifact live canary checklist has no mandatory `FAIL` or `UNKNOWN`; the recoverable `3.5.6-beta` bundle contains the exact `3.5.5` rollback artifact.

“No regression” means the evidence above is current and mutually consistent. It is not an absolute guarantee.

## Preserved product contracts

The modernization must preserve:

- GM keys, stored shapes, defaults, failure behavior, and last-user-intent ordering;
- filtering decisions, personal-block semantics, network requests, and delayed-content coverage;
- DCInside-owned node identity and order, native handlers, form fields and submission traces, focus, popup descendants, geometry containment, and lifecycle cleanup;
- metadata scope (`@match`, `@grant`, `@run-at`) and public API behavior;
- PC filtering and management behavior while excluding mobile host styling.

The target boundary does not clone, replace, move, reorder, wrap, or portal host nodes for presentation. The former list gallery-door source clone and `#hot_rank_pop2` body portal are frozen-control history, not current candidate behavior. The current header candidate projects reversible state onto the original `.issue_contentbox`, `#gall_top_recom`, and native rank/tip popups; its popup-only state keeps an already-open native popup reachable after the drawer closes. The old cloned rank-tip trigger opened an unreachable original `#hot_tip_pop`, and the old recommendation clone could not preserve direct carousel listeners. Local focused tests and an isolated-browser public-host check cover these repairs, but full-header acceptance, final feature inventory, and a user-extension exact-artifact Canary remain separate gates. Visual assertions may be updated only for a declared intended delta; behavior, storage, accessibility, geometry, lifecycle, and containment assertions may not be weakened to make a redesign pass.

The 2026-09-25 feasibility prototype preceded this implementation: programmatically forwarding a copied control's click to a hidden original produced an untrusted event, so snapshot-plus-routing was rejected as equivalent native behavior. A subsequent public major-list read established `#gall_top_recom.concept_wrap` as a separate live shape with direct carousel controls and 840/420px host child widths; the candidate now covers it with the original node and responsive child containment. A public-site isolated-browser run injects the exact guarded candidate with a GM shim and tests original actions and popup geometry at 390/750/1280px plus 390x500. This is valuable real-host composition evidence, but it does not install or exercise the user's Tampermonkey extension and does not by itself close the formal stage gate.

## Architecture target

The migration extends the existing `UiPort` using [Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture/) and incremental [Branch by Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html). Old and new mutating owners never run together.

| Layer | Sole responsibility | Forbidden |
| --- | --- | --- |
| Application runtime | GM storage, filtering, network, state, scheduling, immutable snapshots, typed-intent effects | CSS, UI markup, host selectors |
| Host adapter | DCInside selectors and semantic markers, native events/forms/popups/geometry, existing mutation bus | storage policy, filter decisions, design |
| Presentation | DCUF-owned markup, semantic-role CSS, visual state and motion | GM/network APIs, global DOM search, host listeners/observers |

The internal contracts are:

- `SurfaceSnapshot`: deeply frozen, serializable, and contains no DOM node or function;
- `UiSurface`: `mount`, `render`, and `unmount`;
- `HostSurfaceAdapter`: `connect`, `refresh`, `mountOwnedRoot`, `invokeNative`, and `dispose`;
- adapters alone apply the shared `data-dcuf-surface`, `data-dcuf-role`, and `data-dcuf-state` tuple to host nodes. A passive presentation context that overlaps a transient tuple owner may use only a manifest-registered, adapter-owned namespaced role/state pair; currently this is limited to `data-dcuf-comment-role/state` on authors so personal-selection semantics remain authoritative;
- presentation selectors use manifest-declared semantic markers or `.dcuf-*` only;
- a machine-readable surface manifest records adapter, presenter, style owner, allowed roots, states, cascade exceptions, and tests;
- each surface has exactly one final visual owner;
- `!important` requires a registered selector/property, a concrete host-collision reason, and a regression test. A large extracted zero-delta payload may use a transitional profile only while its surface is `adapted-zero-delta`; the verifier recomputes and SHA-256-binds the complete ordered selector/property ledger, enforces its semantic marker prefix, and rejects the profile at `modern-candidate` or `modern`;
- the PC build consumes explicit shared inputs and never extracts or transforms mobile source strings.

Presentation verification rejects direct or aliased access to GM APIs, fetch/XHR, global document selection, `MutationObserver`, timer/rAF creation, raw DCInside selectors, and broad element selectors such as `html`, `body`, `*`, `button`, or `input` unless the exact machine contract permits a DCUF-owned descendant selector.

## Intended-delta and semantic observations

Every surface slice begins with a machine-readable intended-delta contract. It declares the only permitted changes: semantic color role, spacing, radius, typography, approved geometry, and approved motion. It also declares the invariant observations: filter result, storage/network trace, host node identity and order, native handler and form trace, focus, lifecycle resources, PC result, accessibility, and containment.

Comparisons preserve both raw observations and normalized semantic observations. The normalization specification is included in evidence binding. Unknown observation fields, missing applicability, warnings, and non-zero exits fail closed; they are never silently ignored or summarized away.

Settled resource normalization is directional: active timers, frames, intervals, observers, or listeners in a candidate may not exceed the exact control. Explicit cleanup may reduce those counts, while every cumulative count remains in raw evidence. All non-resource observations remain exact unless their contract names a bounded geometry tolerance.

The oracle families are intentionally diverse because behavior-preservation research reports that no single technique is sufficient ([systematic mapping](https://arxiv.org/abs/2106.13900)) and oracle research warns about common failure modes ([test-oracle survey](https://ieeexplore.ieee.org/document/6963470)):

1. exact `3.5.5` control/candidate differential in separate processes and fresh browser contexts;
2. specification invariants and contracts;
3. pre-change legacy characterization;
4. metamorphic relations;
5. static architecture, selector, and cascade verification;
6. live-shaped fixtures and exact-artifact live canary.

The fixed metamorphic relations are:

- palette preview then cancel returns to the initial state;
- light → dark → light preserves stored and functional state;
- open → close → reopen preserves host node, handler, and focus contracts;
- duplicate initialization or rerender does not increase owner or resource counts;
- pointer submit and Enter produce the same native submission trace;
- pending GM operation reorder still resolves to the last user intent;
- viewport, orientation, or route-family changes alter layout only;
- initial, delayed-insertion, and full-replacement DOM paths produce the same filtering result.

This is a bounded application of [metamorphic testing](https://www.cs.hku.hk/data/techreps/document/TR-2017-04.pdf); no new framework is required.

## Three assurance layers

### Layer 1 — implementation verification

The slice implementer produces architecture/UI-boundary/selector/cascade checks, characterization and adapter/presenter contracts, focused Testbed coverage, host compatibility, semantic differential evidence, storage/network/event/DOM/focus/geometry/resource traces, intended visual-delta results, and a targeted negative mutation. A Layer-1 pass cannot approve its own change.

### Layer 2 — independent cross-audit

Following the technical-independence and objective-evidence intent of NASA IV&V ([guidance](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695713/8.06%2B-%2BIV%2BV%2BSurveillance)), the audit starts from fresh context, rebuilds from source, verifies artifact identity, runs control and candidate in separate Node processes and fresh browser contexts with isolated stores, recomputes impact from Git diff → registry relations → invariants, and cross-checks distinct oracle families. Results are only `PASS`, `BLOCKED`, or `UNKNOWN`; unexecuted, inapplicable, skipped, or environment-failed evidence is not `PASS`.

### Layer 3 — upper assurance audit

A lightweight machine-readable assurance case links claims, evidence, scope, assumptions, and defeaters. It follows the argument/evidence structure described by [SEI assurance cases](https://www.sei.cmu.edu/library/arguing-security-creating-security-assurance-cases/) without adopting a full GSN tool or numeric confidence score. Structured argumentation has found issues missed by standards-only analysis in an empirical case study ([study](https://doi.org/10.1016/j.infsof.2013.02.008)); unresolved uncertainty remains `UNKNOWN`, consistent with cautions about implausible quantitative assurance outputs ([review](https://doi.org/10.1016/j.ssci.2016.09.014)).

Mandatory claims cover:

1. only declared visual semantics changed;
2. GM storage, filtering, network, and PC semantics are preserved;
3. host DOM, events, forms, popups, and lifecycle are preserved;
4. presentation boundaries and one-owner composition exist in source and build output;
5. accessibility, geometry, and performance remain within declared limits;
6. evidence is bound to the current SUT, oracle, fixture, harness, toolchain, and route;
7. synthetic evidence is applicable to current live-site shapes.

The upper audit actively tests whether artifacts are accidentally identical, normalizers erased differences, routing missed a changed file or invariant, fixtures are inapplicable, tests had zero applicability, visual edits weakened behavior assertions, receipts are stale, evidence families share a producer, warnings or raw differences disappeared, canary executed another artifact, or Continuity outran its receipts.

## Falsifying the assurance system

Targeted proof-system mutations cover high-value boundaries rather than mutating the entire product. Each must fail for its assigned reason, and legitimate positive controls must pass. The catalogue includes:

- aliased GM/document/observer access from presentation;
- broad selectors, duplicate style owners, host-node clone/replace/move;
- native form action/type/hidden-field mutation;
- mobile CSS leakage into PC;
- missing listener/observer/timer/rAF cleanup;
- control=candidate and candidate-artifact substitution;
- stale receipt reuse after harness/fixture/oracle changes;
- silent route/theme/viewport/auth skips or forged non-applicable PASS;
- omitted raw warning or semantic observation field;
- unjustified geometry-tolerance expansion or intended-delta laundering;
- nonexistent receipt claims in Continuity;
- deleted mandatory assurance claim or defeater.

This scope is informed by Google’s large-scale mutation evidence ([15-million-mutant study](https://research.google/pubs/long-term-effects-of-mutation-testing/)). The process ends at Layer 3: the Layer-3 verifier is falsified with negative and positive controls and exposes every unresolved defeater; recursive audits are not created.

## State interaction coverage

The state model factors route, surface, authentication, palette/theme, viewport, dynamic DOM state, popup state, storage timing, and input method. Ordinary host surfaces use deterministic 3-way coverage; native forms/popups and the final integrated UI use 4-way coverage. The generator must prove every required tuple is covered and every forbidden combination is absent. This adapts [NIST SP 800-142](https://csrc.nist.gov/pubs/sp/800/142/final); the reported result that 4-way tests found all faults in one studied application using under 5% of exhaustive cases is supporting evidence, not a universal guarantee.

## Proportionate functional comparison and feature receipts

Use the existing oracle families and state model at three decision boundaries. This makes the final inventory in this plan executable without running a full suite after every CSS edit:

| Boundary | Comparison and recorded result | Escalation |
| --- | --- | --- |
| Each scoped change | Route Git diff through the registry to affected feature/state IDs. Run the cheapest relevant owner/cascade and positive behavior, focus, geometry, hit-target, or lifecycle checks; include a metamorphic relation when the edit touches its transition. Record selected/observed cases and exact runtime/dependency identities. | A changed native event/form, shared storage/filter/PC path, unknown impact, or failed positive check expands to the affected cross-target or surface gate. |
| Surface or layer transition | On frozen exact control and candidate bytes, compare applicable feature-state observations in isolated processes/stores; retain raw and normalized field-level differences, classify only declared visual deltas or independently specified improvements, and run targeted negative mutations for that boundary. Bind receipts to SUT, contracts, oracle, fixtures, harness, toolchain, and route. | Missing/zero applicability, a surviving relevant mutation, an unclassified difference, or stale binding blocks this gate rather than becoming a passing snapshot. |
| Settled final runtime | Complete the inventory below for every applicable function; run the full applicable deterministic suite once, separate-process stable/candidate differentials, required 3-way/4-way state coverage, targeted proof-system mutations, exact-artifact actual-extension live checkpoints, and Layer 3. | Any mandatory `FAIL`/`UNKNOWN`, unresolved difference or defeater, or changed final-runtime/dependency identity prevents final `PASS`/`READY`; refresh only affected evidence, including the full suite if its settled runtime changed. |

The planned unit of comparison is a **feature-state receipt**, not a whole-page digest: stable feature ID; route/auth/theme/viewport and preconditions; action and expected state transition; applicability or justified `N/A`; exact control/candidate artifact SHA-256 and evidence binding; raw and normalized observations from `verification/semantic-observation-schema.json`; field-level difference and its `identical`/`declared-visual`/`specified-improvement`/`regression`/`unclassified` classification; positive action, hit, focus, popup, and native-handler evidence where applicable; automated/live evidence links; and `PASS`/`FAIL`/`UNKNOWN` disposition. Reuse existing per-surface reports where their binding and observation fields suffice; a future final inventory may aggregate them without creating a second oracle. A digest of canonically serialized semantic fields may index a receipt ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html)), but the readable fields and raw differences remain available: matching hashes prove only matching chosen observations, not correct or reachable behavior. Whole DOM, screenshot, or source SHA equality is not a functional pass.

Report an evidence vector rather than a made-up regression-probability percentage: `observed applicable feature-state rows / all applicable rows` (with `N/A` and `UNKNOWN` separate), `unclassified functional differences`, `passed required positive interactions / required interactions`, `detected / valid selected mutants` with survivors and no-coverage cases named, `confirmed mandatory actual-extension live rows / mandatory live rows`, and current binding/Layer-3 status. Final acceptance needs complete applicable inventory and required positive checks, zero unresolved functional differences, no mandatory live unknowns, and valid current receipts; a high mutation score or stable/candidate equality cannot override those gates. [Playwright's user-visible/isolation and actionability guidance](https://playwright.dev/docs/best-practices) supports positive unforced interaction checks; [Stryker's mutation-state definitions](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/) make mutation score a test-sensitivity measure, not a defect-free probability. The old stable behavior can itself be wrong, so an apparent improvement needs an independent specification or positive user-path oracle. Unmodeled states and external site drift remain explicit residual risks.

## Design contract

- Preserve all 14 palette IDs and stored values, mapped to semantic tokens.
- Keep list information density; do not turn every row into an isolated card.
- Use 90–120 ms button feedback, 160 ms state transitions, and 200–220 ms popup transitions.
- Reveal at most the first eight initially visible rows once.
- Under `prefers-reduced-motion`, remove non-essential motion and its observer.
- Animate only transform/opacity; perform no frame-by-frame layout read.
- Do not add a framework, glass blur, View Transitions, scroll hijacking, or automatic header collapse.
- Screenshots are supporting evidence only; geometry, visibility, hit testing, focus, and semantic material role are separate contracts.

## Execution sequence and gates

The 2026-10-08 user-approved tooling change is recorded in `VERIFICATION_EFFICIENCY.md`. Before owned drawer-body separation, routing now distinguishes runtime from verification relations, supports bounded header coverage, selects mutation groups and removes focused suites covered by acceptance. Checkpoint CI stays narrow; PR/manual full acceptance follows impact or explicit full mode. Batch related owner changes into one reviewable unit. Continuity keeps current situation/direct inputs and retrieves historical diagnostics on demand. Existing FAIL/UNKNOWN and surface/final/live admission remain.

1. **Seal the foundation with zero visual delta.** Record fresh Git/artifact/tool hashes, freeze `3.5.5` mobile and `1.9.9` PC controls, pass policy/acceptance/proof-system/upper audits, and mark all evidence invalidated by later source, harness, fixture, normalizer, toolchain, or route changes.
2. **Complete the shared UI boundary with zero visual delta.** Move palette pinch geometry/touch handling to an adapter; separate filter settings, personal block, and convenience state/effects/listeners; replace PC source-string extraction with explicit shared inputs; prove mobile/PC semantic equivalence and storage-order faults.
3. **Replace surfaces in slices.** Tokens/settings/palette → list/search/paging → article/recommendation → comments/replies → write/edit/delete/native popup → header/navigation. Each slice follows contract → legacy separation → Layer 1 → Layer 2 → modern presenter → Layer 1 → Layer 2 → Continuity update. The same composition change removes the superseded legacy CSS/listener/observer/render path.
   - The native-form zero-visual-delta boundary is structurally complete for write/modify-editor, the in-place leave-confirm popup, non-member modify/delete password, authenticated delete confirmation, desktop-site viewport mode, headtext drag/tips, write-editor floating layers, attachments, AI prompt, write options/PUMX, adult control, final action rows, generic controls, font label, hidden host chrome, font menu, draft lifecycle, and bounded write-ad cleanup. Original forms, fields, actions, popup/layer nodes and parents, focus, dimensions, native handlers, and lifecycle stay in place; adapters expose frozen serializable observations, reuse the shared mutation bus, scrub copied stale owned markers before rollback recording, and release every owned resource. The presenter's two extracted host-cascade payloads remain an explicit `adapted-zero-delta` debt whose complete ordered `!important` selector/property ledgers are count/SHA-256 bound; modernizing this surface must remove those profiles instead of expanding them. Header/navigation is the next separation slice.
   - **Current course constraint:** no additional visual redesign is allowed after the already accepted modern surfaces until header/navigation has a complete zero-visual-delta adapter/presenter boundary with current Layer-1/2 evidence. The native-form boundary is now structurally complete: its remaining AI prompt, write-option/PUMX, adult control, generic controls, font label, hidden host chrome, and final action-row selectors use adapter-projected semantics with original nodes/events/forms preserved. Header/navigation is the next and final zero-delta separation slice; only after it is sealed may the native-form or header surface enter a new visual assembly step.
4. **Run Layer 3 at four transitions.** After the shared UI/PC boundary; after list/article/comments; after native forms/popups; after the final integrated UI.
5. **Scale audit intensity by decision boundary, not by edit count.** Ordinary token, spacing, and scoped CSS iterations use the boundary/owner check, affected functional and geometry tests, and a relevant live check; they do not repeat the full mutation catalogue, full Testbed, or Layer 3 after every declaration. Host-surface changes add focused native-event/DOM/lifecycle checks and targeted negative controls. Storage, shared PC/build behavior, native form/popup ownership, unknown impact routing, or a final stage-acceptance decision expands coverage to the affected cross-target/full gates. Run the complete applicable functional suite once on the settled final artifact before final acceptance; a later source, fixture, harness, or artifact change invalidates that final pass and requires renewed coverage. A stale or absent proof receipt prevents a PASS/READY claim for that stage, but is not by itself a product defect or a reason to stop safe intermediate UI work. Escalate only for a concrete evidence gap, observed regression, or unresolved high-impact defeater. MAX review is reserved for a consequential final or newly escalated decision, not routine CSS iteration.

The exact-artifact live Canary is the primary check for real DCInside composition, click reachability, and host-style behavior that synthetic fixtures can miss. It complements rather than duplicates the inexpensive automated contracts for hidden storage, filtering, PC, rare lifecycle, and artifact identity. Keep the inherited native-form `!important` profile fixed during the zero-delta boundary; do not impose a removal quota or demand hundreds of individual justifications before ordinary UI progress. A modern replacement must remove that transitional profile or register only its actual, narrowly justified new exceptions.

Live canary checkpoints are settings/list, article/comments, and native form/header. Failure is classified as `product`, `oracle`, `fixture-harness`, `verifier-routing`, or `environment-live`; the affected surface composition returns to legacy until the cause is corrected. Assertions are not weakened and global CSS patches are not layered on.

### Final functional inventory and live-canary gate

- Freeze the **published** mobile `3.5.5` userscript bytes and SHA-256 as the control, not a rebuild of its branch or a matching version string. Freeze the final candidate userscript and its guarded Testbed/root/`dist/` identity before comparison. Run control and candidate in separate processes/browser profiles with isolated GM and browser storage; never enable both userscripts on one page. Compare equivalent routes and states close in time so a DCInside change is not mistaken for candidate drift. Declare intended visual differences, but compare functional semantics and independently require positive usability; equality with a known control defect is not a pass.
- Maintain one final inventory row per applicable user-visible function and native interaction: initialization/recovery; filtering, personal block, settings, backup and palette; list/search/paging; article/recommendation; comments/replies; write/modify/delete; header/recent visits/gallery drawer; and every owned or native popup. Include shared PC filtering/settings when shared inputs change. Each row names its route/auth/state prerequisites, expected result, stable-control observation, candidate observation, automated contract, live checkpoint, and `PASS`/`FAIL`/`UNKNOWN` disposition. A missing applicable row is `UNKNOWN`, not a silent skip; a genuinely inapplicable route/state is `N/A` with its reason recorded. The complete deterministic suite and control/candidate differentials cover rare timing, storage, dynamic replacement, and failure combinations; live testing need not repeat every combinatorial synthetic case.
- On the actual DCInside site, execute every applicable high-value user path at the three checkpoints on the **same final candidate bytes**. Cover representative major/minor/mini routes, logged-in/out where applicable, light/dark, narrow/wide, and closed/open/reopened states; record exceptions when a live state is unavailable. For each interactive popup/control, verify visible positive-area bounds, real pointer hit target (`elementFromPoint` or an unforced browser click), keyboard activation/focus, stacking/clipping, native handler effect, and close/reopen or disposal. Programmatic `.click()`, a screenshot, a large `z-index`, or control/candidate visual similarity alone cannot establish reachability. Keep live writes/deletes confined to explicitly authorized controlled test content/account; without that safe setup, mark the affected live result `UNKNOWN` and do not claim final acceptance.
- Record a compact canary receipt for each row: control and candidate artifact SHA-256, route and site observation time, browser/viewport/theme/auth context, action and expected outcome, actual control/candidate outcome, hit/focus/popup evidence where relevant, and failure classification. Exclude credentials, private content, and raw user data. A site change affecting both sides is investigated as environment/host drift, not normalized into PASS. The manual `live-canary` final-acceptance profile retains no automated commands; a written receipt tied to the final hashes is required before any final `PASS`/`READY` claim. The separate reusable desktop startup workflow in `docs/live-site-canary.md` supplies actual-extension evidence for its four public wide desktop routes only; it does not replace this broader action/state gate. A candidate rebuild or changed live checklist/fixture/oracle invalidates only the evidence it affects, and the final suite plus affected canary rows must be rerun on the replacement artifact.

## Continuity protocol

- The living UI ownership view is derived on demand by `node tools/inspect-live-architecture.mjs --surface <id>` from the accepted registry plus candidate overlay, surface manifest, current source, and mobile/PC build inputs. `--check` is the cheap repository gate at a source/build/ownership change and in guidance verification. It checks source existence, exact component ownership, mobile inclusion, declared style-ID source, and test references; it does **not** prove runtime behavior, unlisted styles, or live-site DOM. Keep `docs/ui-surface-contracts.md` compact for host geometry/events and do not maintain a competing full-DOM inventory.
- This adapts [Murphy et al.'s software reflexion model](https://www.cs.ubc.ca/~murphy/papers/rm/fse95.html): compare a declared high-level map with actual source and expose discrepancies. It borrows architecture-as-executable-test from [ArchUnit](https://www.archunit.org/userguide/html/000_Index.html) without adding the Java tool, and keeps the smallest useful view in the spirit of the [C4 diagram guidance](https://c4model.com/diagrams). These are method inputs; the exact DCUF gate and canary are the local evidence.
- The skill route is a thin, selective entrypoint. [OpenAI Skills documentation](https://developers.openai.com/api/docs/guides/tools-skills) makes name/description the discovery surface, and [OpenAI's skill-evaluation guidance](https://developers.openai.com/blog/eval-skills) motivates positive, negative, overlap, paraphrase, and held-out cases. `verification/skill-routing-cases.json` plus `tools/verify-skills.mjs` protect the route metadata and expected combinations; they do not prove that every future model invocation will select correctly. Re-evaluate model-level triggering separately when an evaluator is available.
- Read-only benchmark on 2026-09-23: `anima:aio-rewrite-work@7dbdf432` (`aio-rewrite/working/RETRIEVAL_GATE_RESEARCH_BASIS.md`, `SKILL_ORCHESTRATION_POLICY.json`, `SKILL_ORCHESTRATION_ENFORCEMENT_RESEARCH_2026-09-01.md`) separates skill decision from action admission and external-evidence selection; `translation:main@0aab6011` (`.agents/skills/maintenance-regression-supervisor/references/evidence-retrieval.md`, `governance-control-plane.md`) distinguishes repository-owned answers from decision-changing external research and binds execution evidence. DCUF adopts selective pre-decision research, current-authority retrieval, and targeted gates. It does not copy their single-use permit/event-history machinery into ordinary UI edits, because DCUF's existing impact, receipt, and stage gates cover the present risk more cheaply.
- `verification/research-selection.json` makes ER0 local sufficiency, ER1 changing external authority, ER2 comparative research, and ER3 high-consequence conflicting evidence explicit. Its positive/negative/held-out verifier tests the declared selection rule, while the evidence skill's reference requires source appraisal, a disconfirming limitation, and a DCUF-local transfer check. It does not prove model-level trigger recall. `docs/work/DECISION_RATIONALE.md` separately records selected, not-adopted, and deferred choices with revisit triggers; it is lower authority than current contracts and receipts.
- `verification/continuity-contract.json` defines the authority order, required current-state fields, update triggers, generalized retrieval labels, and thin-router limit. It adapts preferred/alternative/hidden labels and direct concept relations from W3C SKOS, but remains a small project-local JSON contract rather than an RDF store.
- `CURRENT_STATE.md` records the accepted baseline, active candidate fingerprint, last audit, stale evidence, blockers, and unexecuted live checks.
- `NEXT_TASK.md` contains exactly one bounded task.
- Both are updated at stage start, audit completion, failure reclassification, and canary result.
- The `dcuf-long-work-continuity` skill is a thin router: it reads only fresh local state plus the two current projections on the resume/status hot path, and loads detailed receipts, maintenance notes, surface contracts, semantic-preservation, or release guidance only when the request concept requires them.
- For a context-free local task transfer, `docs/work/INDEX.md` is the canonical locator in the exact active worktree. The sender records that worktree's path and local-only candidate; `NEXT_TASK.md` carries objective, next-action rationale, expected transition, and stop/replan condition. The receiver independently re-reads fresh Git/evidence and returns `ACCEPTED` or `STALE_REPLAN` before work. A fork is excluded because it inherits prior chat; this adapts the decision-critical cold-receiver checks from read-only `translation:main` `.agents/skills/maintenance-regression-supervisor/references/handoff-continuity.md` without its cross-ref transport system.
- Receipts act as immutable evidence events while `CURRENT_STATE.md` is a compact query projection. This is a selective event/projection pattern, not a full event-sourcing subsystem; command diaries and replay infrastructure remain excluded.
- A `PASS` or `READY` statement must link an existing receipt and exact source/artifact digest. Unsupported claims are rejected by the upper assurance verifier.
- Completed command logs and transient dead ends are removed; only reusable causes, discarded unsafe fixes, fragile host contracts, and durable coverage move to `docs/agent-maintenance-notes.md`.
- At completion this plan moves to `docs/archive/`, and current Continuity points to the completed assurance receipt so an old active plan cannot impersonate current authority.

## Release boundary

The first installable canary is `3.5.6-beta`, derived from stable `3.5.5`. Stable and canary must not run simultaneously. The ZIP contains the exact beta, exact `3.5.5` rollback, a SHA-256 manifest, and recovery instructions. A commit, push, merge, tag, publication, or stable promotion requires a separate explicit request.
