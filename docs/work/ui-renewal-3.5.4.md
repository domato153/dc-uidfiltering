# DCUF UI renewal 3.5.4 — Chat-audited implementation brief

## Status

`CHAT_REVIEW_REQUIRED`

Review disposition: `SPEC_REVISED_AWAITING_USER_APPROVAL`

This brief is implementation-ready as a specification, but it is not authorization to edit runtime source, fixtures, generated userscripts, versions, or release state. The user must explicitly approve this reviewed revision and change the status to `READY_FOR_IMPLEMENTATION` before coding resumes.

## Audited baseline

- Repository: `domato153/dc-uidfiltering`
- Branch: `codex/ui-renewal-3.5.4-collab`
- Runtime/source audit baseline: `dbb2954435eedb8a5463d47e16c6edb1943793cf`
- The documentation-only commit containing this revised brief does not change the audited runtime snapshot.
- `docs/ui-surface-contracts.md` remains the compact surface contract.
- `docs/agent-maintenance-notes.md` remains the durable cause/contract index.
- `Dc_UserFilter_Mobile_v3.5.3.user.js` is only a behavior reference for known-working host flows. It is not a visual target and must not be copied wholesale.

## Audit verdict

The redesign direction is valid, but the current snapshot is **not safe to treat as a completed or regression-protected implementation**.

The main risk is not a single bad selector. The runtime currently has multiple competing visual owners, and parts of the Testbed encode simplified or synthetic host behavior. Therefore the historical `106/106` result is not a reliable acceptance signal for the live failures found during smoke testing.

Implementation may proceed only through the ordered work packages below. Do not append another global override layer and do not declare completion from screenshots or the old test count.

## Confirmed findings

### 1. Cascade ownership is structurally ambiguous

The mobile build order is:

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

`theme-module.js`, `filter-module.js`, and `post-main-fixes.js` all style overlapping host surfaces. `theme-module.js` contains multiple successive visual passes, broad high-specificity selectors, and extensive `!important`. Later files then inject more rules for the same header, recent rail, list, article, comments, and write surfaces.

This means “the last intended design” is not represented by one owner. It is an accidental result of injection order, selector specificity, inline styles, and `!important` priority.

### 2. The master-disable behavior is incorrectly coupled and mislabeled

`MobileConvenienceModule.isEnabled()` currently gates recent-post highlighting, draft recovery, and post preview through the filter panel's `masterDisabled` value. These features already have their own storage and switches, so this coupling is incorrect.

The label `모든 기능 끄기` is also inaccurate. Personal blocking is evaluated independently, and the setting logically belongs to the 글·댓글 통계/filter panel.

Required semantic result:

- Preserve the existing storage key and value shape.
- Treat it as a filter-panel disable only.
- Rename the UI to a bounded meaning such as `글·댓글 필터 끄기` or `이 필터 끄기`.
- It may disable user-statistics, ratio, headtext, PUM, guest, proxy, telecom, and blocked-UID decisions owned by that panel.
- It must not disable personal blocking, recent highlighting, preview, draft recovery, palette selection, or unrelated UI tools.
- Replace the existing Testbed expectation that encodes the old coupling.

### 3. The mirrored writer test can pass while the live native menu fails

The transformed list hides the original table and clones the writer node into a custom row. The current Testbed creates a fixture popup from a trusted Playwright click on that clone, but this does not prove that current DCInside delegated/direct event wiring accepts the same target.

Do not repair this by calling `originalAuthor.click()`, dispatching a synthetic event, or pre-appending a mock menu. Those paths can be untrusted or bypass the host lifecycle.

The first implementation gate is a bounded live probe of the exact current writer signature and post-click result. A pass requires the user's physical/trusted click on the visible writer to create the original native nickname menu.

If the host requires the original interactive node, the affected list-row architecture must be revised so the original writer remains the visible event target. No clone/synthetic fallback is pre-approved.

### 4. Native popup coverage is incomplete

The Testbed does not currently prove the dynamically created gallery-management popup, exact headtext trigger/open state, or complete list-size layer behavior.

In particular:

- `#pop_manage_report_list` is absent from the registered runtime tests.
- `#subject_morelist` is used for content discovery but not fully validated through its real sibling trigger, geometry, containment, and hit-testing.
- The fixture list-size layer omits the full 30/50/100 state.
- A child `z-index` increase is not sufficient when an ancestor creates a stacking or clipping context.

Preserve each original host popup node, contents, events, dimensions, and lifecycle. Keep it in place when reachable. Portal the original node only if the ancestor graph proves that in-place reachability is impossible; never clone it.

### 5. The PUMX default activation has a startup race

`write-defaults.js` marks `data-dcuf-pumx-default-activated="1"` before verifying that the host accepted the click. If the button exists before its host handler is attached, the click can do nothing and the marker prevents a later retry.

Required result:

- Mark completion only after an observable host state changes (`.on`, `aria-pressed`, a verified hidden field, or another exact live contract).
- Reuse existing runtime readiness/mutation infrastructure.
- Use a bounded retry window.
- Cover already-active, handler-attached-late, absent, write, and modify states.

### 6. Recent-visit navigation has become behavior ownership

`UIModule.bindRecentVisitNavigation()` intercepts recent-navigation button clicks in capture phase and calls `preventDefault`, `stopPropagation`, and `stopImmediatePropagation` before performing custom scrolling.

This may be valid only if the exact live controls are intentionally replaced and all original states are preserved. It is not merely visual styling.

Audit and test:

- exact direct-child buttons only;
- disabled/on state synchronization;
- first/last edge behavior;
- reduced-motion behavior;
- no interception of the open/more controls;
- no duplicate binding after rerender or bfcache restore.

Prefer preserving a working host handler. Own the behavior only when the host implementation cannot support the approved rail and the replacement contract is explicit.

### 7. Palette data is duplicated

The 14 palette IDs exist independently in the main theme and login surface, and some dark values differ. This creates silent drift risk.

Required result:

- Move palette identity and canonical color values to one shared source that both builders consume, or add a strict generated/static parity check.
- The login surface remains isolated: exactly one palette read, zero writes, zero menu/gallery startup, and no credential/form-value access.

### 8. Reduced-motion scope is too broad

The theme currently contains a rule equivalent to `body *`, `body *::before`, and `body *::after` under reduced motion. This can disable unrelated host animations and transitions.

Scope reduced-motion rules to DCUF-owned roots and the exact transformed host surfaces whose motion DCUF introduced.

### 9. The current guidance is sound, but the runtime violates part of it

`AGENTS.md`, `dcuf-ui-surface-maintainer`, and `dom-safety-audit` correctly require one visual owner, preserved native nodes/events, exact live-shaped fixtures, positive geometry, and hit-testing.

The current writer clone and multi-owner cascade must therefore be treated as existing implementation debt, not as evidence that the guidance permits them.

## Required ownership model

Do not solve this by adding one more “final fixes” stylesheet. Move or delete competing rules so each surface has one final owner.

| Area | Allowed responsibility | Must not own |
| --- | --- | --- |
| `bootstrap.js` | boot lock, overlay, degraded/recovery presentation only | page redesign, list/article/write styling |
| `filter-module.js` | filter logic, filter visibility, filter panel/FAB shell, minimum structural prerequisites | final header/recent/list/article/comment/write visual design |
| `theme-module.js` | palette state, tokens, palette dialog, shared DCUF-owned component tokens | repeated global host-surface correction passes |
| dedicated final surface theme or clearly isolated final sections | approved header/list/view/comments/write material and palette application | behavior, native popup reconstruction, duplicate legacy corrections |
| `post-main-fixes.js` | exact page adapters, structural normalization, native popup containment/reachability | broad global restyling already owned elsewhere |
| `convenience-module.js` | preview, recent highlight, draft recovery and their own roots/settings | filter master-disable semantics, unrelated host chrome |
| `personal-block-module.js` | personal-block UI and behavior under its own roots | host page redesign |
| `ui-module.js` | list transformation/coordination and verified interaction bridges | synthetic host popup behavior |
| `write-defaults.js` | verified default-state behavior only | CSS or unverified one-shot activation |

A new dedicated final-surface module is acceptable only if the corresponding rules are moved out of the old owners in the same change. It must not become another override layer.

## Work packages

### P0-A — Establish truthful fixtures before production fixes

Change fixtures/harness first and add failing tests. Do not edit production behavior until the relevant test fails for the observed reason.

Required fixture upgrades:

- Full logged-in and logged-out header link rails, logout, night-mode state, tooltip, wide/narrow wrapping.
- Exact `#visit_history.visit_bookmark > .newvisit_history.vst` structure and sprite child geometry.
- Exact current list writer signatures from live evidence.
- Exact `.center_box > .inner > ul + .btn_subject_more + #subject_morelist` sibling structure.
- Full 30/50/100 list-size layer.
- Click-created gallery-management popup under the real trigger path.
- Full live AI quick-registration rail: loading, file input, image/character controls, layer button, prompt, count, native close sprite, and settings popup.
- Host-hidden recent/favorite label behavior without fixture-only shortcuts.
- Short visual viewport states and competing-layer states.

False-positive stop rule: if a newly added regression passes before the production fix, the fixture/assertion is invalid and must be corrected.

### P0-B — Correct filter/convenience semantics

- Remove `masterDisabled` and `_masterDisabledSnapshot` gating from convenience feature enablement.
- Preserve each convenience switch and storage value.
- Rename the filter-panel label to its actual scope.
- Keep personal blocking independent.
- Add tests that toggle the filter master while each convenience feature remains governed only by its own setting.
- Add a static verification rule preventing future `masterDisabled` references in `convenience-module.js`.

### P0-C — Resolve the native writer interaction

1. Capture the exact live visible writer, original writer, event path, and resulting popup with the audit helper.
2. Reproduce that signature in the fixture.
3. Add a failing test that requires trigger-created native menu content and positive hit-testing.
4. Implement the smallest architecture that preserves the host contract.
5. Reject synthetic click, cloned mock popup, or pre-inserted popup solutions.

Acceptance requires the native menu to be created by the visible writer click on major/minor/mini list surfaces where applicable.

### P0-D — Repair native popup ownership and reachability

For each affected layer, record root, parent chain, clipping ancestors, stacking contexts, and the top element at visible controls.

Required layers:

- author menu;
- `#subject_morelist`;
- 30/50/100 list-size layer;
- gallery drawer and click-created `#pop_manage_report_list`;
- autocomplete;
- editor font/size/color/line-height/paragraph/table menus;
- DCCon;
- article actions/share/scrap/report/PUM;
- shortcut dialog;
- preview;
- settings, backup, block-management, manual-block, and convenience dialogs.

Acceptance requires positive-area geometry, visual-viewport containment, and `elementFromPoint` ownership for every visible action. Screenshot and z-index assertions alone are insufficient.

### P0-E — Make PUMX default activation state-based

- Delay or retry until the host handler/state contract is available.
- Set the activation marker only after verified state change.
- Preserve the original button and handler.
- Keep the custom checked drawing purely visual and tied to the verified host state.

### P1-A — Consolidate the cascade by surface

Inventory every matching rule, injection phase, specificity, and inline priority for each surface before moving CSS.

Required outcomes:

- one header/recent owner;
- one list controls/rows owner;
- one article owner;
- one comments owner;
- one write owner;
- one native-layer containment owner;
- DCUF-owned dialogs remain scoped to their own roots.

Remove or narrow superseded rules in `filter-module.js`, `theme-module.js`, and `post-main-fixes.js`. Do not target an arbitrary `!important` percentage; retain it only for a documented host inline/important conflict, visibility contract, or layer correction.

The approved composition remains selective glass:

- glass: global rails, one outer shell per major section, DCUF-owned overlays;
- flat/readable: repeated rows, comments, article paper, editor paper, and native popup interiors.

### P1-B — Correct write-page fidelity

- Preserve active recent/favorite label semantics; never force both labels visible.
- Remove only the verified leaked border/positioning conflicts.
- Keep headtexts → title → editor → AI rail → options → actions order.
- Keep toolbar controls on one horizontal non-wrapping rail with touch scrolling on narrow viewports.
- Preserve native form method/action, hidden fields, control types, submit/cancel path, editor lifecycle, and dropdowns.
- Correct the malformed PUMX checked drawing without replacing its control.

### P1-C — Audit recent-navigation behavior

- Determine whether native behavior can be retained.
- If custom behavior is required, scope capture interception to exact verified controls and encode the complete behavior contract.
- Add rerender, bfcache, edge, reduced-motion, and duplicate-binding tests.

### P1-D — Unify palette definitions

- Introduce one canonical palette data source or deterministic generated outputs.
- Verify all 14 IDs, labels, light values, and dark values for main and login surfaces.
- Preserve the existing palette storage key and allowed values.

### P2 — Maintainability and accessibility

These are non-release-blocking unless touched by a required fix:

- Add `role=list`/`role=listitem` or equivalent semantics if the custom list remains div-based.
- Replace historical comments such as “final fix” with ownership/purpose comments only where edited.
- Keep build regex transforms fail-fast; consider replacing them with explicit modules in a later refactor, not inside this UI correction unless required.
- Keep active maintenance notes compact; move only durable lessons from this work after validation.

## Static verification additions

Extend `tools/verify-repo.mjs` with deterministic contracts where practical:

- fail if `convenience-module.js` references the filter `masterDisabled` state;
- verify canonical palette parity across main and login outputs;
- define surface-owner marker comments and require each final surface marker exactly once;
- fail if broad reduced-motion selectors target all host descendants;
- require exact fixture signatures for headtext, list size, writer, recent rail, and management popup;
- require the source-runtime guard for source-work Testbed runs;
- keep generated root/dist byte equality, BOM, metadata, syntax, and SHA checks.

Static checks supplement behavior tests; they do not replace live-shaped geometry and interaction tests.

## Required validation matrix

### Routes

- `/board/lists`, `/mgallery/board/lists`, `/mini/board/lists`
- `/board/view`, `/mgallery/board/view`, `/mini/board/view`
- write and modify surfaces
- delete/password surfaces
- exact `sign.dcinside.com/login`

### States

- logged in / logged out where the host differs;
- light / dark;
- wide / narrow / short visual viewport;
- first load / rerender / delayed insertion / bfcache restore;
- closed state and every single-open layer state;
- relevant competing-layer pairs;
- filter master on/off with independent convenience and personal-block settings.

### Minimum viewport classes

Use live-relevant values, including at least:

- narrow touch: approximately 390 × 844;
- short viewport: approximately 390 × 560;
- desktop-site medium: approximately 1100 × 720;
- wide write surface: up to approximately 1400px content allowance.

Do not hardcode these values as the only supported dimensions; they are regression representatives.

## Execution and commit sequence

1. **Baseline evidence commit** — update only fixtures, audit summaries, and failing tests.
2. **Behavior commit** — filter/convenience semantics, writer/native interaction, PUMX state activation.
3. **Layer commit** — native popup containment/reachability and focused tests.
4. **Cascade commit** — move/remove competing CSS and establish final surface owners.
5. **Write and secondary surfaces commit** — write fidelity, recent navigation, palette parity, login verification.
6. **Settled runtime validation commit** — build artifacts and record guarded runtime path/SHA and selected/full test results.

Separate rules, fixtures, runtime, and generated artifacts when practical. Stage explicit paths. Do not include archives, raw audit dumps, attachments, cookies, storage dumps, credentials, or unrelated generated files.

## Validation order and invalidation rules

1. Run guidance verification after document/skill changes.
2. Build `testbed/artifacts/runtime-under-test.user.js` from source.
3. Set `DCUF_TESTBED_USERSCRIPT` to that absolute file and use `--require-runtime-under-test`.
4. Run focused tests for each work package.
5. Run the complete required mobile suite once on the final unchanged runtime.
6. Run PC verification when shared filter/storage/identity code changed.
7. Perform bounded read-only live smoke on the final runtime.
8. Record the absolute runtime path, SHA-256, selected test count, full test count, and remaining live-only limitations.

Any runtime, fixture, or harness change after a pass invalidates the affected evidence. A moved branch SHA invalidates stale Chat conclusions.

## Acceptance criteria

The brief may be marked implementation-complete only when all of the following are true:

- no P0 item remains unresolved;
- the fixture reproduces each affected live trigger and dynamically created state;
- one final visual owner exists for each surface and competing rules were removed or narrowed;
- the filter master no longer controls convenience or personal-block features;
- a trusted click on the visible writer creates the original native menu;
- every affected popup is contained, reachable, and wins hit-testing;
- PUMX activation is verified by host state, not by an attempted click marker;
- forms, storage keys/shapes, native nodes/events, and submission paths remain intact;
- focused and final guarded Testbed runs pass on the same runtime SHA;
- final live smoke does not contradict fixture assumptions;
- visual comparison matches the approved reference composition without weakening behavior, accessibility, geometry, lifecycle, or containment checks.

## User visual decisions versus objective regressions

Objective regressions; Codex should fix without requesting a new visual choice:

- native writer menu not opening;
- popup clipping/unreachability;
- filter master disabling independent features;
- PUMX state not actually activating;
- both recent/favorite labels visible;
- white circular AI overlap caused by incorrect host reset;
- malformed checked indicator;
- title decorations detached or incorrectly ordered;
- controls outside the visual viewport;
- duplicate cascade owners and stale tests.

User visual decisions are limited to material choices not already fixed by the approved reference images, such as a genuinely ambiguous spacing, tint strength, or icon treatment. Do not reopen settled composition choices merely because implementation is difficult.

## Stop and escalation conditions

Pause only the affected work package and report evidence when:

- the live root/signature differs materially from the contract;
- preserving the original interactive node conflicts with the current mirrored-list architecture;
- a portal is required but the host close/rerender lifecycle cannot yet be preserved;
- a requested visual result would require changing form behavior, storage semantics, or native popup contents;
- the final live smoke contradicts a passing fixture.

Do not silently choose a synthetic workaround.

## Explicitly out of scope

- version bump or stable promotion;
- official `Mobile`/`main` branch updates;
- PR creation or merge;
- tags, releases, homepage publishing, or canonical download replacement;
- unrelated performance or shared-core refactors;
- Ponytail branding or external code import;
- raw live audit uploads or sensitive user data.

## Codex handoff checklist

Before editing:

- confirm branch and current SHA;
- confirm this brief is `READY_FOR_IMPLEMENTATION` by explicit user approval;
- read `AGENTS.md`, both UI skills, surface contracts, and maintenance notes;
- capture the bounded live evidence required for the writer and dynamic popup gates;
- create failing live-shaped tests before production fixes.

At completion:

- report chosen owner per surface;
- list removed/narrowed competing rules;
- report preserved host contracts;
- report focused/full validation with runtime path and SHA-256;
- report any remaining live-only check;
- provide the implementation commit SHA;
- do not publish or promote without a separate request.
