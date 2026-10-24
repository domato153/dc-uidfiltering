# Concept01 visual and scroll trial

2026-10-22. The user approved the researched design. Base: checkpoint023e01d/mobile9889 and PC C14D. Working-branch implementation only; no release or whole-UI certification.

## Design and boundaries

- Shared neutral light / charcoal dark surfaces, Korean type hierarchy, restrained accent, modest radii and quiet borders across header, list, article/comments, forms and management. Preserve all14 palette IDs/values and saved choices. Teal is the reference preview, not a forced storage/default change.
- Large header scrolls naturally; only the original list toolbar gains direction-aware reveal. Preserve width, ancestry and native controls. Accumulate directional travel, ignore jitter and out-of-range overscroll; fully reveal on upward intent and hide on downward intent after its original position passes.
- Input/focus, keyboard navigation, pointer interaction and native toolbar popups hold the toolbar visible. Resize/restoration resets direction history. No auto-hide for comment or editor tools. Reduced motion settles immediately.
- Existing list adapter owns state, measurement and bounded event lifecycle; existing presenter owns appearance and200ms initial transition. This explicit behavior addition is separate from presenter-only visual replacement. No GM/network/filter change, new observer/library/build input or global correction phase.

## Research decision

- SELECTED: [Motion official example](https://motion.dev/examples/react-scroll-hide-header) and [Headroom v0.12.0 source](https://github.com/WickyNilliams/headroom.js/tree/v0.12.0/src): direction/state separation, tolerance, freeze and cleanup. Headroom is an older algorithm reference. Adapt cumulative travel; do not copy fixed150/140px geometry or per-frame-only tolerance.
- NOT ADOPTED: [Aceternity example](https://ui.aceternity.com/components/resizable-navbar) and its [registry code](https://ui.aceternity.com/registry/resizable-navbar.json):40% width,800px minimum and separate React navigation do not transfer to long native categories. Reference the restrained surface only.
- DEFERRED: [Mantine continuous reveal](https://mantine.dev/hooks/use-headroom/): half-exposed controls/native popup anchoring add complexity without a demonstrated benefit here.
- Limits: [NN/g,2021](https://www.nngroup.com/articles/sticky-headers/) notes upward scrolling may mean rereading; keep navigation small and motion restrained. Follow [W3C reduced-motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Prior in-memory traces are design evidence, not rendered/phone acceptance.

## Execution

1. Freeze controls; register the adapter contract. Focused failing scroll contract then implementation: jitter/slow reverse, focus/popups, resize, native identity and dispose/reconnect.
2. Apply visual rules through existing presenters; measure visual-only file locality separately. Review representative header/list/article/comments/write/dialog states in light/dark, adopted980 layout and narrow stress.
3. Run affected guarded contracts and final mobile/PC coverage for shared visual tokens; select actual Chrome/Tampermonkey observations. Preserve phone scale/engine and live-route limits. Representative panels do not certify all128 child states.
4. Deliver separate-identity installer and before/after preview, record exact scoped results and one next task, then checkpoint the authorized working branch.

## Implementation findings

- CSS sticky was ineffective under the inherited root overflow contract. The same original toolbar now uses measured fixed positioning with one empty aria-hidden flow spacer; no native node is moved or cloned. Activate both flow changes before reading layout to prevent a measured70px scroll-anchoring jump. Top-flow stacking stays at2; only floating states use1003, preserving original gallery popups.
- The old production readiness owner required16px corners and a shadow. This is a real UI/function coupling prerequisite, separately moved to pure article/comment presenter policies consuming a frozen measured snapshot. The adapter retains measurement, debug and recovery. Flat surfaces are valid; missing owners, content geometry drift, transparent broken surfaces and missing input borders still fail. The existing failure fixture now removes the header background rather than validly removing its shadow.
- All14 stored palette identities remain unchanged. Accent ink is a separate readable text role, while primary fills remain accent-strong with white labels. Shared settings presentation changes affect PC-owned dialogs as well.
- Approved obsolete visual assertions change to flat surfaces/soft selected tabs/current radii. Native node, handler, form, focus, containment and lifecycle assertions remain. Historical header hashes remain unchanged after an exact declared CSS inverse; this is a scoped historical comparison, not raw current visual equality or formal admission.
- Representative trial coverage is separate from all128 child-state visual approval. Current source and evidence identities/results are recorded in the trial receipt and CURRENT_STATE.md.

Vision review exposed a second prerequisite: the mobile legacy palette rail still overrode shared modern dialog colors with ID/important selectors (PC had no such rail). Retire those exact DCUF-owned IDs through the existing retirement pipeline, leaving the shared SettingsPresenter as their final visual owner. Native host and boot palette rails remain separate; the mixed component is not promoted.

The existing acceptance profile now routes the focused Concept01 scroll contract after the mobile guard build. It is retained for future behavior/UI changes; ordinary local edits still select proportionate scopes.
