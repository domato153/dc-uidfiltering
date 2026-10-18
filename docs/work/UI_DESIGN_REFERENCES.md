# UI design references for the next visual pass

Status: `SELECTED_FOR_LATER_TRIAL` — unified Concept01 selected for the real-change exercise after separation and repair; not implemented. Sources checked 2026-10-17.

Initial research used real internet examples suitable for DCUF. The user then requested an image-generated unified sample and selected that sample as the concrete later trial. Finish the remaining separation and `UI_REPAIR_GATE.md` before advancing into its product visual treatment. The original reference board remains official screenshots and browser captures, distinct from the generated concept.

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
