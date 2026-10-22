# UI design references for the next visual pass

Status: `B1_SELECTED_FOR_LATER_TRIAL / SELECTION_ONLY` — user choice 2026-10-22. Product source/artifact unchanged. This current choice supersedes older pending A/B choices and next-step text below; Concept01 remains a unity/readability reference.

## Current choice: B composition + B1 Prism Glass

- **Selected by user:** B's compact header and anchored recent-visits menu, with B1's pearl/frosted-glass and restrained teal material feel. The user said to record the choice now and try B1 later; do not begin implementation during this selection-only request.
- **Durable reference:** [B1 Prism Glass](../design/b1-prism-2026-10-22.png), SHA-256 `83D73F768193FC594536448500B7DC6671653CE1CDE498606698C2FF06CDF296`. Curated generated design reference tracked in Git, not a raw audit, release asset or product screenshot. Provenance: built-in `image_gen`, 2026-10-22, with the selected B board as composition reference; original generation remains preserved locally.
- **User's judgment retained:** B1/B2 largely changed material/color, not the underlying UI silhouette. B2 was overcolored and is **not adopted**. The previous large-title-card header was also visually rejected; its technical feasibility result does not approve its appearance. Do not revive either as an active design.
- **Common language:** compact quiet navigation, a frosted elevated recent/menu/control layer, gentle edge light, restrained primary/selected accents, clear opaque reading surfaces, and shared typography/spacing/radius/material roles across list, article/comments, write, settings and native/owned popups.
- **Limits:** choosing B1 adopts a trial direction, not every raster dimension, example control/text, duplicate tab, avatar or omitted input. Preserve the real checklist, native branding/nodes/events/forms, comment/reply/image-comment states, editor tools and existing palette IDs/settings. No new moderator/account capabilities or default-color change is implied. The board does not demonstrate substantial shape freedom, actual motion, dark mode, measured phone geometry, complete feature coverage or working UI.
- **Later sequence:** only on a continuation request, make B1 header expansion/condensation, recent-menu anchoring/open-close, active-tab and pressed/focus behavior concrete in a design preview. Then implement an agreed bounded trial in existing presenters/adapters; cover affected checklist/adjacent states and light/dark at the adopted phone layout. Validate UI/function separation and actual behavior according to the change, not by running all tests for a design choice.
- **Research used:** [Raycast current UI](https://www.raycast.com/new) for layered compact controls; [Craft's 2025-09-15 glass update](https://www.craft.do/blog/craft-update-3-2-6) for selective material and cross-screen unity; [Things' official glass/control examples](https://culturedcode.com/things/blog/) for restrained light/scale feedback; [Apple material/motion principles](https://developer.apple.com/videos/play/wwdc2025/219/) for a distinct navigation/control layer; [Linear's 2026-03-12 refresh](https://linear.app/now/behind-the-latest-design-refresh) for hierarchy/compactness. These are references, not separately adopted skins or a promise of native optical refraction in a browser.
- Local comparison, optional: `artifacts/ui-overview-2026-10-17/b-glass-refinement-2026-10-22/index.html`. B2 stays an unadopted alternative; the tracked B1 image and this decision are the durable baseline.

![Selected B1 reference for a later trial](../design/b1-prism-2026-10-22.png)

## Historical Concept01 research — retained context

The following initial 2026-10-17 research/selection explains Concept01 and the original reference board. Historical prerequisites/next-step wording does not override CURRENT_STATE.md or NEXT_TASK.md.

## Selected Concept01 and execution boundary

- Local workspace copy: `artifacts/ui-overview-2026-10-17/design-references/dcuf-unified-concept-01.png`; SHA-256 `A2784372F5F0AD124BB1097096A97F5BBBACB13C6F26A1157C8FAD8E3A26B47A`. This is ignored review material, not a release asset. Preserve the original generated image; if the local copy is unavailable, recover the exact bytes from the saved conversation image and verify this digest. A missing image does not become visual approval of an arbitrary replacement.
- Provenance: built-in `image_gen`, requested by the user, generated 2026-10-17. The image shows four light-mode website panels in a2x2 board: list, article/comments, write form, management popup.
- Shared intent: neutral/off-white canvas, charcoal text, restrained teal emphasis, one Korean sans-serif hierarchy, common spacing, modest control/panel radii, thin borders, restrained shadows and consistent action states. These rules belong to one visual system across all four surfaces. Reference products contribute composition principles rather than separate skins.
- Planned use: `UI_REPLACEABILITY_VALIDATION.md` owns the actual implementation-and-measurement exercise after all prerequisites pass. Selection does not certify current code, extend publication authority, or bypass the remaining header/repair gates.
- The raster's example logo/art, sample text, control subset and dimensions are illustrative. Preserve native branding, all real features, forms/nodes/events, stored settings and measured viewport behavior. Define the dark counterpart through the same rules and validate it independently; the generated light board is not dark-mode evidence.
- Complete review scope is `UI_REVIEW_CHECKLIST.md`, not the four-panel sample. Every applicable native/owned popup, comment variant, editor menu, input state and status notification must be viewable as an indexed state in the existing comparison gallery before declaring the whole UI reviewed.

## Current visual judgment

In the corrected wide-layout screenshots, saturated blue fills the global navigation and repeats in the search border, gallery heading, categories, menu button, selected tabs and several secondary actions. This gives supporting controls too much weight. The dark management panel also contains several nested borders and repeated blue actions, while typography and spacing still change abruptly between host content and the new controls. Fixing the 15 defects is necessary, but does not by itself supply a clear new visual identity. These are design judgments, distinct from the diagnosed regressions.

## Four suitable references

| Reference and direct source | Useful part for DCUF | Adaptation and limits |
| --- | --- | --- |
| [Linear: March 2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh) | Low-chroma gray, subdued navigation, compact tabs and softer separation in a dense working interface. | Best overall reference for list/header hierarchy and dark mode. Preserve our native DCInside navigation; do not copy a desktop sidebar or tiny targets onto mobile. |
| [Readwise Reader: official product screenshots](https://readwise.io/read) and [appearance controls](https://docs.readwise.io/reader/docs/faqs/appearance) | A reading-first content area, quiet controls and typography settings for long text. | Best reference for article body and the central writing area. Retain author, comments, original editor tools, media and form behavior. An English product screenshot does not validate Korean type size/line height or our actual device layout. |
| [Radix Themes playground](https://www.radix-ui.com/themes/playground#button) and [color system](https://www.radix-ui.com/themes/docs/theme/color) | Teal accent with sage gray; solid/soft/outline/ghost action hierarchy, fields, tabs and dialogs in light/dark. | Best visual reference for settings/popups and replacing default-looking bright blue with a restrained accent. The local captures select teal/sage/medium radius using the official demo. Refer to visual roles only; no library installation or replacement of native nodes is needed. |
| [shadcn/ui Tasks: official example](https://ui.shadcn.com/examples/tasks) | Neutral list rows, subtle badges, compact filtering and a clearly stronger primary action. | Useful for block-management lists, search/filter controls and action menus. Keep forum rows readable at mobile scale; do not transplant desktop table columns, hover-only controls, or the marketing page. |

## Selected visual direction for the later trial

Combine Linear's quiet hierarchy with Readwise's reading emphasis. Use the Radix teal/sage direction for the default accent and controls; use the shadcn example to simplify settings lists. Treat this as one consistent visual language, not four unrelated skins.

- Use a neutral light canvas and a charcoal dark canvas, with strong body text. Restrict strong accent fill to the main action or selected state; secondary actions use neutral or low-chroma surfaces. Retain non-color state cues and visible focus.
- Choose row grouping, title/metadata hierarchy, line height, padding, icon treatment, border strength and modest radius together. Avoid a card around every nested control and a shadow around every row. Confirm actual Korean readability and touch geometry.
- Preserve all 14 palette IDs and stored settings. A future default-color change must be an explicit design decision, with corresponding contrast and theme checks; this reference brief changes no values.
- Show the implemented list, article, write and popup in light/dark using the same content and viewport. Concept01 establishes the selected trial direction; compare the actual coherent set and prove layout, interaction, compatibility and change locality through `UI_REPLACEABILITY_VALIDATION.md`.

## Source-image provenance

The local board at `artifacts/ui-overview-2026-10-17/design-references/index.html` is ignored review material. Its two embedded official source images are loaded from their original hosts:

- Linear article, linked “softer borders” comparison: `https://webassets.linear.app/images/ornj730p/production/67561baa677fbc429d94edd080e95aecabb6bae2-3904x2720.png?auto=format&dpr=2&q=95`
- Readwise Reader, linked inbox screenshot: `https://d34adp677peecb.cloudfront.net/static/images/reader/Hero-Screen%401x.72ad6bf1deaa.webp`

The Radix and shadcn images are browser screenshots of the above public official demos, taken on this review date. The original internet-reference board contains no AI images; the separately identified Concept01 is generated. No account content, copied product code, or external writes are part of this exploration. Reference images belong to their original creators and do not certify our product's appearance or behavior.
