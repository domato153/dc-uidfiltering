# DCUF mobile UI surface contracts

This is the compact visual map for the three approved reference compositions. It records stable ownership and executable expectations, not a DOM dump. Recheck live structure when DCInside changes.

## Composition rules

- Use glass only for the global header rails, one outer shell per major page section, and DCUF-owned overlays. Repeated list/comment rows and editor/article interiors stay flat and readable.
- Palette changes subtly tint every major glass shell. Accent controls remain stronger; site-owned popup interiors remain native.
- Keep one final visual owner per surface. Earlier phase rules must be removed or narrowed instead of being covered by another `!important` layer.
- Preserve original forms, handlers, storage, filter results, popup nodes, and submission paths.

## Surface map

| Surface | Live root / owner | Required result | Regression gate |
| --- | --- | --- | --- |
| Header | `.dcheader.typea > .dchead`, `.gnb_bar`, `#visit_history.visit_bookmark > .newvisit_history.vst` | One bounded outer composition with three contiguous rails; readable logo/search/top links; subtle palette tint; `.btn_open > .sp_img.icon_listmore` fully visible | Wide/narrow/devtools geometry, minimum readable logo/text, exact recent wrapper/icon bounds, no overflow |
| Gallery head | `header > .page_head.clear`; only direct utility doors are styled | One tinted outer shell; rectangular doors; native popup descendants untouched | Direct-child selector test and popup hit-test |
| List controls | `.list_array_option`; live headtexts are `.center_box > .inner > ul + button.btn_subject_more + #subject_morelist` | One control shell; one-row headtexts; native headtext and 30/50/100 layers paint above the list | Trigger-open state, exact popup signature, and `elementFromPoint` on every visible option at wide and narrow viewports |
| List rows | `.custom-mobile-list > .custom-post-item`; live writers are predominantly `.author > .gall_writer[data-nick]` | Flat divided rows; author remains readable/clickable; title marks such as `(펌)` stay adjacent; blank title-column space is not a link | Positive author width, click-created native menu, decoration distance, and blank-space hit-test |
| Article | live `#container > article > div.view_content_wrap` | One visible rounded outer shell; flat header/body inside; readable body scale; no content blur | Fixture must use the live tag/parent; visible corner continuity and typography bounds |
| Comments | `#focus_cmt`, `.comment_box`, `.cmt_write_box` | One section shell; flat content-driven rows; compact writer; nickname/meta/actions visible | Row/composer bounds, DCCon 100/150px containment, reply indentation and hit-testing |
| Image comments | `.view_comment.image_comment` | Follow the readable comment rail, never the source-image width | Narrow-source-image fixture plus composer/row geometry |
| Write | live `article#write_wrap > form.dcuf-write-form`; authenticated order is headtexts → title → editor → AI rail → options → actions | One tinted form shell; fields, editor, AI rail and actions form one composition; editor paper stays flat | Live-shaped direct children, wide toolbar wrap, rail geometry, narrow overflow, native submit/cancel |
| Login | exact `sign.dcinside.com/login` module | Same selected palette with isolated login CSS; only the palette key may be read | Native POST/fields unchanged; one allowed GM read, zero writes/menus/gallery runtime |
| Gallery drawer | `.dcuf-header-drawer__body`; management may create `#pop_manage_report_list.pop_wrap` after click | Drawer stays below DCUF modal overlays; site-owned management popup remains original/native, viewport-contained, and reachable | Click the real management trigger, then assert node ownership, visual-viewport bounds, and `elementFromPoint` |
| DCUF dialogs | settings, shortcut, management, preview, menu, convenience | Shared direct-block material and explicit relative layer ownership; fixed panels fit the visual viewport and keep action rows reachable | Wide/narrow/short containment, scroll lock, focus, last-action hit-test, and competing-layer `elementFromPoint` |

## Layer and fixture rules

- A popup is valid only when a point inside each visible control resolves to that popup or its descendant.
- Promote, de-filter, or remove the z-index from the popup's containing shell when an ancestor creates a stacking context; increasing only the child's `z-index` is insufficient.
- Nested DCUF dialogs must paint above their opener panel and overlay. Site-owned popups retain their original node, event handlers, dimensions, and internal styling.
- The headtext/list-size layers, drawer-created gallery management, shortcut-change dialog, author menu, editor menus, DCCon, article actions, alerts, convenience settings, and preview competition require trigger-driven stacking coverage.
- A drawer clone that contains no popup before interaction is not sufficient: click every host trigger that can dynamically create a popup and inspect the resulting owner chain.
- When hidden originals and visible mirrors coexist, geometry tests must select a rendered positive-area instance and still enforce positive writer/control bounds.
- Interaction tests must wait for the surface owner/subscriber to be installed. Lifecycle tests wait for timers and frames to return to their pre-test baseline rather than relying on a fixed sleep.
- `Dc_UserFilter_Mobile_v3.5.3.user.js` is a behavior reference for working popup/event/preview flows only. It is not a header, color, spacing, or geometry target.

## Evidence and change sequence

1. Assign each reference-image region a role from the surface map.
2. Record the live root/parent signature and compare it with the fixture.
3. Add a failing positive contract for geometry, adjacency, visibility, popup hit-testing, or material role.
4. Trace all matching injected phases and choose one final style owner before editing.
5. Run focused tests against `testbed/artifacts/runtime-under-test.user.js` with the runtime guard; record the printed path and SHA.
6. Capture light/dark and wide/narrow evidence, then compare it manually with the reference. A capture-only PASS is not approval.
7. If runtime, fixture, or harness changes after a pass, invalidate and rerun the affected coverage; run the full suites once after the final broad revision.

Keep durable signatures and contracts here, transient live measurements in `.codex/live-findings.md`, and only reusable causes or discarded fixes in maintenance notes.
## P0 correction contract

- The original live list writer node remains in valid table ancestry. A mobile mirror may use a valid nested table and an outer list-table host, but it must preserve the writer's direct listener and the host table's delegated event path; no direct `span` child or synthetic writer stand-in is valid.
