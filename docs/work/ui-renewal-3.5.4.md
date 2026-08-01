# DCUF UI renewal 3.5.4 — reviewed implementation brief

## Status

`REVIEW_REQUIRED`

Review disposition: `AGENT_NEUTRAL_RULES_APPLIED_AWAITING_IMPLEMENTATION_APPROVAL`

This brief is implementation-ready as a specification, but it is not authorization to edit runtime source, fixtures, generated userscripts, versions, or release state. Runtime work starts only after explicit user approval changes this status to `READY_FOR_IMPLEMENTATION` and assigns the first active phase.

## Execution control

This repository uses agent-neutral, phase-based ownership.

- Chat/Work or Codex may perform diagnosis, specification, implementation, validation, independent review, or follow-up.
- Every active phase has one owner and the branch has one active writer. Parallel implementation, parallel commits, and final review of a moving branch are prohibited.
- Each handoff records: phase, owner, start SHA, scope, allowed paths, state, result SHA, validation, and fixed review target where applicable.
- Handoff requires a clean checkpoint commit. Independent review targets one `REVIEW_READY` SHA; later branch movement invalidates that review.
- Reviewers normally report findings without editing. To apply changes, the reviewer closes review and becomes the next phase owner from the reviewed SHA.
- Low-risk, isolated changes may omit independent review. Native DOM/events, storage/migration, initialization/lifecycle, test-fixture fidelity, broad cascade ownership, and release-candidate changes require independent review.
- `codex/*` and `.codex/` are retained compatibility names and do not assign work to Codex.

### Current planned assignment

- Planned primary implementer: `Chat/Work`
- Planned independent reviewer: `Codex`
- Parallel work: prohibited
- Current active phase: none; implementation approval is still required

### Project states

- `REVIEW_REQUIRED`
- `READY_FOR_IMPLEMENTATION`
- `IMPLEMENTING`
- `VALIDATION_REQUIRED`
- `IMPLEMENTATION_COMPLETE`
- `PAUSED`

### Phase states

- `IN_PROGRESS`
- `REVIEW_READY`
- `CHANGES_REQUESTED`
- `DONE`
- `PAUSED`

## Audited baseline

- Repository: `domato153/dc-uidfiltering`
- Branch: `codex/ui-renewal-3.5.4-collab`
- Runtime/source audit baseline: `dbb2954435eedb8a5463d47e16c6edb1943793cf`
- The guidance-only commits after that baseline do not alter the audited runtime snapshot.
- `docs/ui-surface-contracts.md` remains the compact surface contract.
- `docs/agent-maintenance-notes.md` remains the durable cause/contract index.
- `Dc_UserFilter_Mobile_v3.5.3.user.js` is only a behavior reference for known-working host flows. It is not a visual target and must not be copied wholesale.

## Audit verdict

The redesign direction is valid, but the current snapshot is **not safe to treat as completed or regression-protected**.

The main risk is not a single selector. The runtime has multiple competing visual owners, and parts of the Testbed encode simplified or synthetic host behavior. The historical `106/106` result is therefore not a reliable acceptance signal for the live failures found during smoke testing.

Implementation must proceed through the ordered packages below. Do not append another global override layer or declare completion from screenshots or the old test count.

## Confirmed findings

### 1. Cascade ownership is structurally ambiguous

Mobile build order:

1. `login-surface.js`
2. `bootstrap.js`
3. shared runtime prelude
4. `style-banner.js`
5. `write-defaults.js`
6. `runtime-coordinator.js`
7. `theme-module.js`
8. `filter-module.js`
9. `convenience-module.js`
10. `personal-block-module.js`
11. `ui-module.js`
12. `post-main-fixes.js`

`theme-module.js`, `filter-module.js`, and `post-main-fixes.js` style overlapping host surfaces. The resulting design is an accidental product of injection order, specificity, inline styles, and `!important`, rather than one explicit owner.

### 2. Filter master-disable is incorrectly coupled and mislabeled

`MobileConvenienceModule.isEnabled()` gates recent highlighting, draft recovery, and preview through `masterDisabled`, although they have independent settings. Personal blocking is already independent, so `모든 기능 끄기` is inaccurate.

Required result:

- Preserve the existing storage key and value shape.
- Treat it as a filter-panel disable only.
- Rename it to bounded language such as `글·댓글 필터 끄기`.
- It may disable statistics, ratio, headtext, PUM, guest, proxy, telecom, and blocked-UID decisions owned by that panel.
- It must not disable personal blocking, recent highlighting, preview, draft recovery, palette selection, or unrelated tools.
- Replace tests that encode the old coupling.

### 3. Mirrored writer tests can pass while the live native menu fails

The transformed list hides the original table and clones the writer node. The current Testbed popup does not prove that live DCInside event wiring accepts the cloned target.

Do not repair this with `originalAuthor.click()`, synthetic events, or a pre-appended mock menu. First capture a bounded live probe of the exact writer signature and post-click result. A pass requires a trusted click on the visible writer to create the original native nickname menu. If the host requires the original node, revise the row architecture so that original remains the visible target.

### 4. Native popup coverage is incomplete

The Testbed does not prove:

- click-created `#pop_manage_report_list`;
- the exact sibling trigger/open state for `#subject_morelist`;
- the complete 30/50/100 list-size layer;
- clipping, stacking-context, containment, and hit-testing under short and competing-layer states.

Preserve original popup nodes, contents, events, dimensions, and lifecycle. Keep each in place when reachable; portal only the original node after proving its ancestor graph makes in-place reachability impossible. Never clone it.

### 5. PUMX default activation has a startup race

`write-defaults.js` marks activation before verifying that the host accepted the click. Completion must be marked only after observable host state changes. Reuse readiness/mutation infrastructure, bound retries, and cover already-active, late-handler, absent, write, and modify states.

### 6. Recent-visit navigation now owns behavior

`UIModule.bindRecentVisitNavigation()` intercepts clicks in capture phase and stops native propagation. Prefer the host handler. If custom behavior is necessary, verify exact controls, disabled/on synchronization, edge behavior, reduced motion, exclusion of open/more controls, rerender, and bfcache duplicate prevention.

### 7. Palette definitions are duplicated

Fourteen palette IDs are independently defined in the main theme and login surface, with some dark-value drift. Use one canonical source or a strict deterministic parity check. Login must retain exactly one palette read, zero writes, zero menu/gallery startup, and no credential or form-value access.

### 8. Reduced-motion scope is too broad

Rules equivalent to `body *` can disable unrelated host motion. Scope them to DCUF-owned roots and exact transformed surfaces whose motion DCUF introduced.

### 9. Guidance is sound; runtime contains existing debt

The current writer clone and multi-owner cascade violate the intended preserved-node and one-owner guidance. Treat them as implementation debt, not as precedent.

## Required ownership model

Do not solve this with another final-fixes stylesheet.

| Area | Allowed responsibility | Must not own |
| --- | --- | --- |
| `bootstrap.js` | boot lock, overlay, degraded/recovery presentation | page redesign |
| `filter-module.js` | filter logic/visibility and filter panel/FAB shell | final host-surface design |
| `theme-module.js` | palette state/tokens/dialog and shared owned-component tokens | repeated global correction passes |
| dedicated final surface owner | approved header/list/view/comments/write material | behavior or duplicate corrections |
| `post-main-fixes.js` | exact adapters, normalization, native-layer containment | broad restyling |
| `convenience-module.js` | preview, recent highlight, draft recovery | filter-master semantics |
| `personal-block-module.js` | personal-block UI/behavior | host redesign |
| `ui-module.js` | list coordination and verified interaction bridges | synthetic host popup behavior |
| `write-defaults.js` | verified default-state behavior | CSS or unverified one-shot activation |

A new surface module is acceptable only when superseded rules are moved or removed in the same change.

## Work packages

### P0-A — Establish truthful fixtures before production fixes

Change fixtures/harness first and add failing tests. If a new regression passes before the production fix, the fixture or assertion is invalid.

Required coverage:

- complete logged-in/out header rails, logout, night state, tooltip, wrapping;
- exact recent-visit root/sprite geometry;
- exact current writer signatures;
- exact headtext sibling structure;
- full 30/50/100 list-size layer;
- click-created management popup;
- complete AI quick-registration rail and settings layer;
- host-hidden recent/favorite label behavior;
- short viewport and competing-layer states.

### P0-B — Correct filter/convenience semantics

- Remove filter-master gating from convenience enablement.
- Preserve independent switches and storage.
- Rename the filter label.
- Keep personal blocking independent.
- Add toggle-combination tests.
- Add static prevention of `masterDisabled` references in `convenience-module.js`.

### P0-C — Resolve native writer interaction

1. Capture exact live visible/original writer, event path, and resulting popup.
2. Reproduce the signature in the fixture.
3. Add a failing trigger-created menu and hit-test contract.
4. Implement the smallest original-contract-preserving architecture.
5. Reject synthetic clicks, cloned mock popups, and pre-inserted popups.

Acceptance applies to major, minor, and mini list surfaces where relevant.

### P0-D — Repair native popup ownership and reachability

Record root, parent chain, clipping ancestors, stacking contexts, geometry, and top element for:

- author menu;
- `#subject_morelist`;
- 30/50/100 layer;
- gallery drawer and management popup;
- autocomplete and editor menus;
- DCCon;
- article actions/share/scrap/report/PUM;
- shortcut, preview, settings, backup, block, manual-block, and convenience dialogs.

Acceptance requires positive area, visual-viewport containment, and `elementFromPoint` ownership.

### P0-E — Make PUMX activation state-based

Delay or retry until the host state contract is available, mark only after verified change, preserve the original control/handler, and bind custom drawing to verified state.

### P1-A — Consolidate cascade ownership

Create one owner for header/recent, list, article, comments, write, and native-layer containment. Remove or narrow competitors in `filter-module.js`, `theme-module.js`, and `post-main-fixes.js`. Retain `!important` only for documented host conflicts, visibility contracts, or layer corrections.

Approved composition remains selective glass:

- glass: global rails, one outer shell per major section, owned overlays;
- flat/readable: repeated rows, comments, article paper, editor paper, native popup interiors.

### P1-B — Correct write-page fidelity

Preserve active recent/favorite semantics, verified ordering, horizontal toolbar behavior, native form fields/actions/types/submission, editor lifecycle/dropdowns, and the original PUMX control.

### P1-C — Audit recent navigation

Retain native behavior where possible. Otherwise encode exact control scope, edges, reduced motion, rerender, bfcache, and duplicate-binding behavior.

### P1-D — Unify palette definitions

Use one canonical source or deterministic outputs and verify all IDs, labels, light values, dark values, storage key, and allowed values.

### P2 — Maintainability and accessibility

Where touched, add appropriate list semantics, replace historical final-fix comments with ownership comments, preserve fail-fast builds, and keep maintenance notes compact. Do not expand into unrelated refactoring.

## Static verification additions

Where practical, extend deterministic checks to:

- reject filter-master references in convenience code;
- verify palette parity;
- require each final surface-owner marker exactly once;
- reject broad reduced-motion selectors;
- require exact fixture signatures;
- require the source-runtime guard;
- retain generated byte equality, BOM, metadata, syntax, and SHA checks.

Static checks supplement, not replace, behavior and geometry tests.

## Required validation matrix

### Routes

- board/mgallery/mini list and view;
- write and modify;
- delete/password;
- exact `sign.dcinside.com/login`.

### States

- logged in/out;
- light/dark;
- wide/narrow/short viewport;
- first load/rerender/delayed insertion/bfcache;
- closed and each single-open layer;
- relevant competing-layer pairs;
- filter master on/off with independent convenience and personal-block settings.

Representative viewports include approximately 390×844, 390×560, 1100×720, and up to 1400px write allowance; they are not exclusive supported dimensions.

## Execution and commit sequence

1. Baseline evidence: fixtures, audit summaries, failing tests only.
2. Behavior: filter semantics, writer interaction, PUMX state activation.
3. Layers: native popup reachability and focused tests.
4. Cascade: remove competitors and establish owners.
5. Write/secondary surfaces: write fidelity, navigation, palette, login.
6. Settled runtime validation: artifacts plus guarded path/SHA and results.

Separate rules, fixtures, runtime, and generated artifacts where practical. Stage explicit paths and exclude archives, raw audits, attachments, cookies, storage dumps, credentials, and unrelated files.

## Validation and invalidation rules

1. Run guidance verification after guidance changes.
2. Build `testbed/artifacts/runtime-under-test.user.js` from source.
3. Set its absolute path and require the runtime guard.
4. Run focused tests per package.
5. Run the complete required mobile suite once on the final unchanged runtime.
6. Run PC verification for shared filter/storage/identity changes.
7. Perform bounded read-only live smoke.
8. Record runtime path, SHA-256, selected/full counts, and live-only limits.

Runtime, fixture, or harness changes invalidate affected evidence. Branch movement invalidates stale review conclusions.

## Acceptance criteria

Implementation completes only when:

- no P0 remains;
- affected live triggers and dynamic states are represented truthfully;
- each surface has one final owner;
- filter master no longer controls independent features;
- a trusted visible-writer click creates the original menu;
- affected popups are contained, reachable, and win hit-testing;
- PUMX is verified by state;
- forms, storage, nodes/events, and submission paths remain intact;
- focused and final guarded runs pass on one runtime SHA;
- final live smoke does not contradict fixtures;
- visual composition matches approved references without weakening behavioral, accessibility, geometry, lifecycle, or containment checks.

## User decisions versus objective regressions

The active implementer should fix these without reopening visual choices:

- writer menu failure;
- popup clipping/unreachability;
- filter master disabling independent features;
- PUMX not activating;
- both recent/favorite labels visible;
- AI overlap caused by incorrect reset;
- malformed checked indicator;
- detached/misordered title decoration;
- controls outside the viewport;
- duplicate cascade owners or stale tests.

Only genuinely ambiguous material choices such as unsettled spacing, tint strength, or icon treatment require a user decision.

## Stop and escalation conditions

Pause only the affected package and report evidence when:

- live structure differs materially;
- preserving the original interactive node conflicts with the mirrored architecture;
- required portal lifecycle cannot be preserved;
- the visual result would change form behavior, storage semantics, or native popup contents;
- final live smoke contradicts a passing fixture.

Do not silently choose a synthetic workaround.

## Explicitly out of scope

- version bump or stable promotion;
- official branch updates;
- PR creation or merge;
- tags, releases, homepage publishing, canonical replacement;
- unrelated performance/shared-core refactors;
- Ponytail branding or external code import;
- raw live audits or sensitive data.

## Phase handoff and independent review checklist

Before editing:

- confirm branch and current SHA;
- confirm `READY_FOR_IMPLEMENTATION` by explicit user approval;
- record phase owner, start SHA, scope, allowed paths, and state;
- read `AGENTS.md`, UI/DOM skills, surface contracts, and maintenance notes;
- capture required live evidence;
- create failing live-shaped tests before production fixes.

At implementation checkpoint:

- stop branch writes and commit a clean checkpoint;
- record result SHA, changed paths, and validation;
- mark the fixed SHA `REVIEW_READY` when independent review is required;
- report chosen owner per surface and removed/narrowed competitors;
- report preserved contracts, runtime path/SHA-256, test results, and remaining live-only checks.

During independent review:

- review only the fixed target SHA/diff;
- check scope, P0 coverage, native DOM/events, fixture truthfulness, storage/forms/lifecycle, cascade ownership, and evidence validity;
- report findings without editing;
- if fixes are needed, mark `CHANGES_REQUESTED` and assign a new single writer from the reviewed SHA.

Do not publish or promote without a separate request.
