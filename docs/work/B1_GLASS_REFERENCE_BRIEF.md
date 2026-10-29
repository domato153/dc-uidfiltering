# Glass window redesign — references before implementation

## Current instruction and status

User2026-10-29 rejects the CSS-first memo-window experiments and asks for this order: consolidate references, generate an attractive whole-window raster proposal, review it, then implement against the selected image. Status: IMAGE_PROPOSAL_READY_FOR_USER_REVIEW. No proposed image is a production golden or an approved design until selected. The6BAA runtime remains unchanged.

The rejected CSS recipes are retained only under `artifacts/b1-glass-window-trial-2026-10-29/discarded-css-spike/`,alongside the local captures. They are diagnostic history. Do not resume their layout,treat their checks as aesthetic approval,or relabel their screenshots as the requested image-generated proposal.

## Reference set and what transfers

| Source | Useful input | Limits |
| --- | --- | --- |
| [User's Dark Glassmorphism image/MD](https://designmd.app/library/dark-glassmorphism-infographic) | A coherent translucent plane, fine light-catching rim, diffuse depth, background light/shape transmitted through the shell. | A dark hero composition;its cyan primary button is substantially solid. Do not copy neon, marketing spacing, fixed cyan/purple or numeric opacity into this forum. Light mode needs its own design. |
| [ButtonGlass live variants](https://artyhoo.github.io/shadcn-glass-ui-library/?path=/story/components-core-buttonglass--variants), [AI MD guide](https://github.com/artyhoo/shadcn-glass-ui-library/blob/main/docs/AI_USAGE.md), [actual registry source](https://raw.githubusercontent.com/artyhoo/shadcn-glass-ui-library/main/public/r/button-glass.json) | Coordinated primary/secondary/quiet/selected roles, thin translucent secondary faces, documented theme-variable consumption. | Reference material/state rules;do not transplant React, new click handlers, ripple timers, looping glow/shine or the whole library. Its own accessibility claims do not certify our result. |
| [designmd general glass MD](https://designmd.app/library/glassmorphism) | Glass as a temporary floating layer;readable solid main content;fine edges and fallback thinking. | Generic alpha template with inconsistent component detail. The MD's presence is not quality evidence. |
| User-supplied Korean reconstruction of [Madia Design's AI dashboard feedback](https://www.youtube.com/watch?v=IFVKj-gBoFM),provided2026-10-29 | Information hierarchy,density,grouping,restrained effects,consistent states and reusable controls. | This is the user's reconstruction from English captions,not a full transcript or independently frame/timestamp-verified record. Use contextual principles;do not canonize its8px radius,36px button,12–16px spacing or type sizes. |
| Existing B1 and acquired native memo anatomy | Palette roles,ordinary forum backing,opaque reading/editing paper,Korean labels,native scope/swatch/register/list/sort/copy/delete/search/backup/close functions. | B1/C885 is the current accepted implementation,not an immutable authority for a new proposal. Native composition is a functionality inventory,not a layout to copy unquestioningly. |

## Selected principles from the supplied video summary

- Make content and the next action legible before adding material effects. The forum and management window are reading/operating surfaces,not marketing heroes.
- Keep the shell glass recognizable. Give primary actions a stronger but controlled tint;quiet actions and sorting must not compete with it. Avoid a glow,gradient,inner shadow and drop shadow on every control.
- Group related content;inside-group spacing must be tighter than the gaps between functional groups. Remove redundant dotted lines,nested boxes and the old textarea wrapper's dead space.
- Use a clear title/label/value/help hierarchy. Not every label is bold. Give small Korean labels enough size and contrast rather than shrinking them to increase density.
- Distinguish selected,hover,focus,disabled and destructive roles;retain non-color cues and reachable controls. Contextual example sizes are not universal touch-target rules.
- Reuse the selected material and components later. Changing appearance must preserve native nodes/events/form semantics,stored settings and UI/behavior separation.

## First image brief — one native memo-management window

Generate one side-by-side light/dark board of the same redesigned window. Show it above a plausible ordinary DCInside-style forum page,with subtle underlying row/title contours visibly transmitted through the shell. Use neutral white/charcoal and an illustrative restrained teal accent;all chromatic emphasis must remain replaceable by the existing14 theme presets during implementation. No saturated wallpaper/neon backing to fake glass.

Composition should be redesigned intentionally: concise header and close;clear gallery-scope segment;grouped memo input/color/register area;subordinate short guidance and backup link;organized memo list/count/sorting/copy/delete;compact aligned search footer. All named native functions remain present. Synthetic example rows may illustrate density and must never be treated as real saved data. Opaque fields and readable list text;glass belongs to chrome and the surrounding layer. Moderate radii,thin coherent light edge,one restrained depth treatment,quiet secondary buttons;no inflated plastic pills or a box around every subregion.

The rejected experiments failed because they mostly overlaid tint/blur on an unrefined native composition. A later widened CSS experiment also exposed panel-width and grouping defects. None is an implementation target. First judge the generated whole composition and useful details with the user;only then derive role tokens/component rules and implement the selected image. Do not use a generated raster as runtime button artwork.

## Order and validation boundary

1. This brief consolidates the references and user constraints.
2. Built-in image generation produces a new project-local light/dark proposal,with provenance and its conceptual limits recorded here.
3. User selects or revises the image. Resolve any illustrative/missing/duplicated native controls before implementation.
4. Implement through existing presentation owners;retain original nodes and palette settings. Select checks by actual change impact and compare the implementation against the selected image,whole plus relevant detail. No routine full-suite repeat.

This turn changes only design/continuity artifacts;no product build,version,metadata,storage,account,release or C-13 permission submission. C-13 remains the deferred continuation after this design decision. Guidebook discussion stays after the full UI work.

## Generated proposal v1

- File: `docs/design/b1-glass-window-image-proposal-v1-2026-10-29.png`;SHA256 `31CFA853BDBFF12EC0A62E8D20D53486474CCC3213B1DDE0BF97C4D3B3601AC3`.
- Provenance: built-in image_gen,2026-10-29. Functional-anatomy input is the acquired/current6BAA memo screenshot;B1 ordinary dark screenshot supplies surrounding identity only. Prompt combines the sources/constraints above and explicitly redesigns the old composition. No selected runtime or regression golden was replaced.
- Actual output: one1536×1024 light/dark board,shared whole-window composition. Crisp header/scope selector,input/guidance/register group,list/sorting/actions and search footer;synthetic two-row data. Glass is concentrated on the shell;paper fields and strong text remain.
- Review: viewed at whole scale. It is an image proposal,not measured CSS/contrast/geometry or proof of runtime behavior. User aesthetic decision remains pending. The image does not independently verify any video's spoken content.
- Translation obligations: keep original scope/color/register/list/sort/copy/delete/search/backup/close actions and the14 palette IDs. Restore the native select-all control;the raster's row ellipses do not authorize new menus. The shortened guide must not remove the device-local/precedence semantics. Generated row-card outlines and decorative search/icon details remain revisable. Do not reproduce raster inaccuracies as product requirements.
- Supplied video summary is sufficient for this decision. Further video retrieval is unnecessary: browser export yielded no transcript,vidIQ had0 credits,TinyFish's anonymous attempt reached a sign-in/bot check,and local Edge exposed a video frame before further computer use stopped. Do not restart tool research or infer timestamped spoken lessons from those partial observations.

## Button revision and rejected rendering artifacts

V2 used the actual ButtonGlass screenshot as an image input,not only its textual description. File `docs/design/b1-glass-window-image-proposal-v2-2026-10-29.png`,SHA256 `D101FF0142D5D6F4EBBE62E374ED9F997C4E4D80300A90AC62290C9BD388C4B9`. User identifies uneven/bumpy registration-button reflections and excessive overall haze. V2 is not selected.

Correct the material model before implementation: planar smooth button faces,one continuous quiet highlight,fine rim,no mottled/cloudy/specular lumps or inflated bevel. Blur only the scenery behind a glass plane;foreground text,borders,controls and paper reading/editing areas stay crisp. Avoid a milky/fog overlay or texture spread across the whole dialog. Keep translucency modest and intentional;the design must not depend on saturated backing. Preserve the proposal's useful grouping while fixing material. No CSS implementation follows an unselected raster.

## Latest proposal v3 — clarity correction, still unselected

File: `docs/design/b1-glass-window-image-proposal-v3-2026-10-29.png`;SHA256 `305F05C64EB1EFBB76E2A868D3B2EAF2A929636E85BDA3B1E0F18146ADF776B0`. Built-in image_gen edit of v2,2026-10-29. Same1536×1024 light/dark composition;the correction requests smooth button planes,continuous restrained highlights,and crisp foreground UI with optical blur limited to backing scenery. The actual output is visually inspected as a proposal: primary faces are smoother and text/edges clearer;exact tint/transmission/contrast is not measured or certified. User selection remains pending. Earlier v1/v2 are provenance/history,not fallback authorities. V1's translation obligations still apply,including native select-all,original guidance and no invented row menu.
