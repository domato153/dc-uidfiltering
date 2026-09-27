# DCUF modernization decision rationale

This is a compact record of consequential choices and alternatives, not a second current-state or architecture authority. `SELECTED` means chosen for the present candidate/workflow, **not** product acceptance or a PASS receipt. `NOT ADOPTED` applies to this scope, not every future situation. `DEFERRED` stays unresolved until its stated trigger. Fresh Git/artifact state, machine contracts, receipts, `CURRENT_STATE.md`, and `NEXT_TASK.md` outrank this rationale.

The format adapts the explicit “adapted / not adopted wholesale” separation in the read-only `translation:main@0aab6011` `.agents/skills/maintenance-regression-supervisor/references/source-notes.md`, plus the short context/decision/consequence and supersession principle of [Nygard's ADR proposal](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). Do not copy its project authority or create a chronological command diary here. A changed decision needs a new or explicitly superseding entry; do not silently relabel prior rationale as a verified result.

## Cold-reader decision precedence

- D-01–D-03 and D-05–D-06 remain cross-cutting method/continuity choices. D-11 is the current original-node header-door choice; D-12 is the current layered feature-state comparison method; D-13 below limits the new shared filter/storage observation. `CURRENT_STATE.md` and the single `NEXT_TASK.md` still decide what is current and next.
- D-04 and D-07–D-10 retain historical reasons and rejected alternatives, **not** their old “next” actions. D-07's GNB step was completed by D-08; D-08's shell/page-head ownership and D-09's hit-characterization queue were advanced by the later header work; D-10's proposed-only native issue door became D-11's implemented original-node candidate. Their `DEFERRED` bullets describe the state at those decisions and must not be copied into today's work queue. The current source and `HEADER_NAVIGATION_INVENTORY.md` resolve which specific old defect was repaired; remaining header acceptance and live states stay `UNKNOWN`.
- The clone bridge, second popup portal, synthetic forwarding to a hidden original, and whole-page/hash-only regression stamp remain `NOT ADOPTED` under D-11/D-12. An old proposal or deferred item may be reopened only after its stated revisit trigger, fresh contrary evidence, and an explicit new/superseding decision—not because a fresh receiver encountered it in historical text.

## D-01 — Derived UI ownership map

- SELECTED: Query accepted registry + candidate overlay, `architecture/ui-surfaces.json`, current source, and mobile/PC build inputs through `tools/inspect-live-architecture.mjs`; run `--check` at ownership changes and guidance verification.
- NOT ADOPTED: A second full-DOM database, hand-maintained diagram as semantic authority, or treating a manifest link check as live-site proof.
- DEFERRED: Actual DCInside route/DOM/cascade applicability stays with focused host tests and exact-artifact Canary.
- Reason: One derived view exposes source/manifest divergence without duplicating owners; the gate cannot infer unlisted styles or all route semantics from literals.
- Evidence: `architecture/registry.json`, `architecture/ui-surfaces.json`, `tools/test-live-architecture.mjs`, [software reflexion models](https://www.cs.ubc.ca/~murphy/papers/rm/fse95.html).
- Revisit: A source/manifest link failure, new surface ownership, or live Canary contradiction.

## D-02 — Skill routing and research depth

- SELECTED: Narrow skill descriptions, conditional cross-skill routing, positive/negative/overlap/held-out cases, and proportionate primary-source research before consequential method choices.
- NOT ADOPTED: Loading every skill on each edit, researching every exact repository fact, or transplanting `anima`/`translation` single-use permits and event-history control planes into ordinary DCUF UI work.
- DEFERRED: Model-level trigger recall/precision evaluation; static corpus checks do not prove that an arbitrary future model selects the right skill.
- Reason: The current failure mode is missed or overbroad routing, while existing impact/receipt/stage gates already cover the present mutation boundary.
- Evidence: `verification/skill-routing-cases.json`, `verification/research-selection.json`, `tools/verify-skills.mjs`, `translation:main@0aab6011` `.agents/skills/maintenance-regression-supervisor/references/evidence-retrieval.md`, `anima:aio-rewrite-work@7dbdf432` `aio-rewrite/working/EVIDENCE_SELECTION_POLICY.json`, [OpenAI skill eval guidance](https://developers.openai.com/blog/eval-skills).
- Revisit: A real missed/over-triggered skill, a changed action boundary, or an available independent model-level evaluator.

## D-03 — Proportionate UI assurance

- SELECTED: Scoped boundary/geometry/behavior checks during a surface iteration, cross-target and adversarial checks at consequential R3/stage boundaries, and exact-artifact live Canary for real host composition.
- NOT ADOPTED: Running the full mutation/Layer-3 catalogue per CSS declaration, an arbitrary `!important` removal quota, or treating a synthetic screenshot as approval.
- DEFERRED: Final global READY and live-site acceptance remain `UNKNOWN` until their exact current-artifact checkpoints run.
- Reason: Canary catches real host layout and click reachability, but hidden storage/filter/PC/lifecycle semantics need independent automated checks.
- Evidence: `docs/work/MOBILE_UI_MODERNIZATION.md`, `docs/work/CURRENT_STATE.md`, `verification/assurance-case.json`.
- Revisit: A concrete evidence gap, native form/shared runtime change, observed regression, or final acceptance decision.

## D-04 — Current UI sequence and handoff

- SELECTED: Continue the header/navigation zero-visual-delta boundary after separate recent-visit and list-only drawer host-adapter extractions and a single adapter-mounted drawer style presenter; preserve the native-form receipt as the last accepted local stage baseline.
- NOT ADOPTED: Calling the header READY, changing its visual composition before its boundary is proved, or promoting an older receipt to the current candidate fingerprint.
- DEFERRED: Resolve the independently observed 390px drawer/tablist pointer collision, replace the copied inline rank-action bridge, and justify or remove the original popup portal before header visual promotion; live Canary is still pending.
- Reason: The current candidate has a valid repository ownership map but no current header stage receipt or live result. The drawer stylesheet has one source at the prior phase with reversible host-context markers, while the broader header/GNB/recent-visit cascade remains legacy debt. The legacy drawer clone retains `onclick` because the DOM clone algorithm copies attributes and HTML activates event-handler content attributes; it is not an inert display copy. The original popup portal is a contained legacy exception rather than a conforming target boundary.
- Evidence: `docs/work/NEXT_TASK.md`, `docs/work/CURRENT_STATE.md`, `architecture/ui-surfaces.json`, the guarded drawer style/host lifecycles and independent light/dark exact-artifact differential, [DOM clone algorithm](https://dom.spec.whatwg.org/#concept-node-clone), and [HTML event-handler content attributes](https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-content-attributes).
- Revisit: Focused characterization or semantic differential changes the boundary, the collision is resolved, or a current exact-artifact receipt changes stage status.

## D-05 — Continuity authority and next-thread recovery

- SELECTED: Fresh local state → current projection (`CURRENT_STATE.md`) → one task (`NEXT_TASK.md`) → only the decision/evidence details required by the question. Preserve accepted, candidate, stale, rejected, and deferred meanings separately.
- NOT ADOPTED: A new tracked next-thread handoff claiming authority, chat memory as a current result, or a chronological command transcript in the hot path.
- DEFERRED: Move old historical checkpoint detail out of `CURRENT_STATE.md` only if its size actually impedes retrieval; the marked historical section is not a current claim.
- Reason: The `translation` handoff explicitly labels itself temporary/non-authoritative; DCUF already has a durable projection and receipt model, so a parallel handoff would create stale-state risk.
- Evidence: `verification/continuity-contract.json`, `tools/inspect-continuity.mjs`, `translation:main@0aab6011` `.agents/skills/maintenance-regression-supervisor/references/continuity/THREAD_HANDOFF__RETRIEVAL_AUTHORITY__2026-08-23_2133_KST.md`.
- Revisit: The next thread cannot recover the correct task/evidence from the compact route, or this rationale conflicts with fresh authority.

## D-06 — Context-free task handoff

- SELECTED: A new project task with no inherited chat, pointed at the exact active local worktree's `docs/work/INDEX.md`; the receiver independently checks HEAD/branch/fingerprint and returns `ACCEPTED` or `STALE_REPLAN` before continuing.
- NOT ADOPTED: A fork or side chat as a context-loss test, the saved project root's older checkout as the candidate, or a second timestamped handoff packet whose prose competes with `CURRENT_STATE.md` and `NEXT_TASK.md`.
- DEFERRED: Each future receiver must repeat the cold worktree/artifact check; the recent-visit receiver did return `ACCEPTED`, but that does not establish a current header or live-site PASS.
- Reason: The earlier fork copied completed chat history and thus could not test repository-only recovery. The parent project root is a different branch, so the active nested worktree path is decision-critical. A compact situation model and stop/replan check protect meaning without a transcript dump.
- Evidence: `.agents/skills/dcuf-long-work-continuity/references/handoff-contract.md`, `verification/continuity-contract.json`, `docs/work/CURRENT_STATE.md`, `docs/work/NEXT_TASK.md`, `translation:main@0aab6011` `.agents/skills/maintenance-regression-supervisor/references/handoff-continuity.md`, [OpenAI Docs on fork history](https://developers.openai.com/blog/mastering-codex-remote-for-engineering).
- Revisit: The receiver cannot locate the exact dirty worktree, challenges the next-action rationale, or finds a changed candidate dependency.

## D-07 — Recent-visit style boundary and next header slice

- SELECTED: Supersede D-04's remaining-recent-visit-style premise. Keep the newly separated recent-visit behavior and light/dark presentation in one reversible adapter/presenter pair at the prior core cascade phase; continue with only the three GNB layout rules as the next bounded zero-delta owner extraction.
- NOT ADOPTED: Treating computed equivalence as live approval, moving the shared `html, body, ...` reset into the GNB owner, or changing the inherited `!important` values during this extraction.
- DEFERRED: The rest of the header/page-head cascade, copied rank-action handler, original popup portal, and narrow-width pointer collision remain open before a new header visual assembly.
- Reason: The recent-visit owner/lifecycle test fails on the frozen immediate control and passes on the current candidate; independent processes find no semantic or computed-visual differences in 29 observations. This establishes a narrow local boundary, not a full header or live-site result.
- Evidence: `docs/ui-surface-contracts.md`, `testbed/run-header-recent-visit-differential.mjs`, `artifacts/header-recent-visit-style-differential.json`, guarded mobile 120/120 and host compatibility 11/11 on the current artifact.
- Revisit: A live-site composition conflict, changed cascade/hit result, or a current header stage receipt changes the boundary or stage status.

## D-08 — GNB layout owner without changing host navigation

- SELECTED: Supersede D-07's next-GNB premise. Keep the site-owned GNB root, nav, list, and anchors in place; move only the three core layout rules to one semantic GNB presenter, with reversible adapter roles and the existing list/view mutation bus.
- NOT ADOPTED: Moving the shared page reset or palette host-chrome rules into this presenter, adding an independent observer, or removing inherited `!important` before the full header visual stage.
- DEFERRED: The remaining anonymous header shell/page-head cascade, drawer clone/portal, narrow drawer hit defects, and exact-artifact live Canary remain open.
- Reason: The owner test fails on the frozen immediate control and passes on the candidate; independent browser processes show 0 semantic/computed differences in 33 observations, including actual GNB root replacement and native pointer/Enter paths. The bus prefilter needed the exact `.gnb_bar` root to see descendant replacement; without it, a declared subscription existed but was ineffective.
- Evidence: `docs/ui-surface-contracts.md`, `testbed/run-header-gnb-differential.mjs`, `artifacts/header-gnb-style-differential.json`, guarded mobile and PC/host checks recorded in `CURRENT_STATE.md`.
- Revisit: A live-site GNB topology/cascade mismatch or a current exact-artifact header receipt changes the boundary or stage status.

## D-09 — Gallery heading ownership and remaining header interaction gate

- SELECTED: Move only `.page_head` geometry, direct `.fl`/`.fr`, and clearfix `::after` to a reversible gallery-heading presenter/adapter at the former core cascade phase. Keep `.list_array_option::after` and all other header owners in place. Continue next with measured drawer, rank-action, and popup hit/stacking characterization before changing their interaction boundary.
- NOT ADOPTED: Treating the zero-delta CSS split as header visual approval, removing inherited `!important` by quota, or declaring an open but covered popup reachable.
- DEFERRED: The 390px drawer-toggle/tablist collision, 750px cloned rank-action miss, 390px relation-popup/select-box overlap, copied inline handler, original hot-rank popup portal, and exact-artifact live Canary remain open.
- Reason: The owner/lifecycle contract fails on the frozen immediate control and passes on the candidate; two independent browser processes yield 0 semantic/computed-visual differences in 42 observations. The 390px relation popup has a positive box after opening, but `elementFromPoint` hits `.select_box.array_num` over its center on both sides. The heading subscriber's first moved-node selector scan also breached the existing 5,500-node performance gate; native class traversal restored the measured selector budget while retaining replacement coverage.
- Evidence: `docs/ui-surface-contracts.md`, `testbed/run-gallery-page-head-differential.mjs`, `testbed/artifacts/gallery-page-head-differential.json`, the guarded heading owner and performance tests, and `docs/agent-performance-notes.md`. These are local Testbed facts, not real-site confirmation.
- Revisit: The next hit/handler characterization changes the minimal repair, host markup changes, or a current exact-artifact header receipt changes stage status.

## D-10 — Original-node gallery door candidate

- SELECTED: Test an in-place original `.issue_contentbox` overlay as the next bounded source change; keep the native rank and tip popups under their original parent. This is an implementation direction, not product acceptance.
- NOT ADOPTED: A second host-popup portal or a copied noninteractive snapshot whose actions call the hidden original. In the focused browser probe, `original.click()` reached the original listener with `isTrusted=false`, unlike pointer/Enter on the original in-place control.
- DEFERRED: The actual adapter/presenter change, exact control/candidate differential, fixed-menu stacking, dynamic replacement, other-route `#gall_top_recom` inventory, and exact-artifact live Canary.
- Reason: The current clone copies the tip trigger but strips the cloned tip ID while its real popup stays hidden, so the strengthened positive test still reports callback count one with zero area/hit. In a separate after-disposal Testbed prototype, the original source and both popups retained parent/sibling identity, tip hit-testing worked at 390/750/1280px and 390px dark, and original pointer/Enter events stayed trusted. At 390x500 the rank close needed scrolling. The public host's `.issue_wrap` stacking context is `z-index:13`; the prototype cannot prove production stacking or other-route content.
- Evidence: `testbed/run-header-door-feasibility.mjs`, `testbed/artifacts/header-door-feasibility.json`, `testbed/evidence/live/2026-09-25/header-native-door-feasibility-site-read.json`, and the still-failing `gallery door rank-tip popup is positively reachable from the drawer` Testbed case.
- Revisit: A production candidate fails popup containment/hit, host event meaning, dark/responsive geometry, replacement/disposal, or live-site stacking; then stop and request a design decision instead of moving another host popup.

## D-11 — Native issue and recommendation controls replace the clone bridge

- SELECTED: Supersede D-10's proposed-only state with reversible presentation of the original `.issue_contentbox` and `#gall_top_recom` nodes. Keep rank and tip popups under their original host source, and retain popup-only presentation after the DCUF toggle closes while either native popup is open. Use normal-specificity responsive geometry for the formerly 840/420px recommendation layout and narrow/short tip inset.
- NOT ADOPTED: A copied interactive subtree, a second body portal, synthetic forwarding to a hidden original, or a blanket `!important` removal quota. The archived control's tip callback fired without a reachable popup, and the major carousel clone did not retain the original direct listener.
- DEFERRED: A full-header exact-artifact semantic receipt, final per-feature control/candidate inventory, and the user's actual Tampermonkey-extension Canary. The seven-case isolated-browser public-host run uses a GM shim and is not that extension check.
- Reason: Focused tests show original pointer/Enter actions, rank/tip close after drawer closure, major carousel action, identity/order, dynamic replacement, and disposal. The public minor/major host canary initially exposed a 1px left overflow on the 390px tip, then passed after a narrow/short inset; no new `!important` was added. The active contract is `header-native-door-v1`; the interim hit-repair contract is retired but remains historical evidence.
- Evidence: `testbed/run-tests.mjs`, `testbed/run-header-live-shape-gap.mjs`, `testbed/run-header-public-canary.mjs`, `testbed/evidence/live/2026-09-26/header-top-recom-major-site-read.json`, `architecture/ui-surfaces.json`, and `verification/intended-deltas.json`.
- Revisit: A different route or authenticated host shape breaks original-node geometry, popup stacking, handler identity, lifecycle cleanup, or full-header control comparison.

## D-12 — Layered feature-state comparison, not a single regression score

- SELECTED: At each scoped change, select focused owner/positive-interaction checks from impact; at a surface gate, bind separate-process stable/candidate semantic observations and declared deltas to a feature-state receipt; on the settled final runtime, aggregate every applicable function with deterministic and actual-extension live evidence. Report coverage, unresolved differences, positive interactions, targeted mutation detection, live applicability, and evidence validity as separate dimensions. An optional canonical semantic digest indexes a receipt but never replaces its raw/field-level record.
- NOT ADOPTED: A whole-page DOM/screenshot/source hash as a functional stamp, a pass-count or mutation score as a defect-free probability, treating equality with a known stable defect as success, or a full-suite/Layer-3 run after every CSS declaration.
- DEFERRED: Implementing a final receipt aggregator or optional canonical digest until a surface gate needs common output; current per-surface reports remain useful only within their exact bindings. The all-feature inventory, actual-extension Canary, and integrated upper assurance have not run for the current candidate.
- Reason: Differential observations expose changed behavior but cannot establish correctness alone; positive user actions catch covered popups that callbacks or visual equality miss, while combinatorial and targeted mutation checks challenge state gaps and weak oracles. A multidimensional evidence vector preserves unknowns and does not invent a calibrated regression probability.
- Evidence: `docs/work/MOBILE_UI_MODERNIZATION.md` (proportionate comparison and final-inventory sections), `verification/semantic-observation-schema.json`, `tools/run-semantic-differential.mjs`, [Playwright best practices](https://playwright.dev/docs/best-practices), [Playwright actionability](https://playwright.dev/docs/actionability), [NIST SP 800-142](https://csrc.nist.gov/pubs/sp/800/142/final), [Stryker mutation metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/), [mutation-score/real-fault study](https://ieeexplore.ieee.org/document/8453121/), and [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html).
- Revisit: A real feature row cannot be represented by the existing observations, a new host state invalidates the inventory denominator, mutation survivors expose a blind spot, or final aggregation is needed for a stage decision.

## D-13 — Shared filter/storage comparison keeps resource drift separate

- SELECTED: Keep the exact-control/current-candidate field-level view comparison as a bounded functional observation on three synthetic states per target. Advance next to the mobile view-route subscriber/timer lifecycle adjudication while retaining the report's raw differences and `UNKNOWN` final feature status.
- NOT ADOPTED: Relabeling the old threshold-zero outcome assertion as master-switch-off coverage, inferring a full shared-feature PASS from zero functional differences in these three states, or applying the four-header-key **list-route** palette owner classification to the two additional view owners and timer reduction without their own lifecycle evidence.
- DEFERRED: Other filter states, management/settings actions, pending/rejected storage, full row-level inventory, exact actual-extension Canary, and integrated upper assurance remain outside this bounded comparison.
- Reason: The selected outcome test seeds `threshold=0` with master enabled. A separate direct master-disabled/threshold-10 case, threshold-zero case, and positive personal-UID block case matched GM/DOM/network effects on both targets, but the mobile view route retained six candidate-only subscriber keys and fewer active timers in every snapshot. Resource ownership cannot be inferred from the functional projection or the earlier list-route classifier.
- Evidence: `docs/work/SHARED_SETTINGS_PC_CROSS_AUDIT.md`, `testbed/run-shared-filter-storage-differential.mjs`, `testbed/artifacts/final-shared-filter-storage-C84-1A7.json`, `tools/test-shared-filter-storage-differential.mjs`, and the exact current artifact/binding checks in `CURRENT_STATE.md`.
- Revisit: A source, SUT, fixture, harness, observer, or route change stales the comparison; a failed resource lifecycle/negative control or contrary live observation requires reclassification before a feature or stage claim.
