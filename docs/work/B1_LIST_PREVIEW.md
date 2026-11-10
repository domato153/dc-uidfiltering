# B1 list interaction preview

Current disposition: user approved this preview and requested actual application. B1_PRODUCT_TRIAL.md owns the resulting native product trial. Historical preview-only limits below still describe this isolated artifact, not current product state.

Status: `VIEWABLE_DESIGN_PREVIEW / VISUAL_FEEDBACK_PENDING`, 2026-10-22. The user approved trying the proposed list-page preview after choosing B composition + B1 material. This advances the earlier selection-only request; it does not approve the resulting appearance or activate a product redesign.

## Bounded result

- One viewable list page: compact glass masthead, recent-visits menu, gallery title, category/All/Concept/Notice toolbar, native-shaped post table, page-size choice, paging and search.
- Below the scroll threshold, navigation stays visible. Scrolling down moves the masthead away and leaves the list toolbar; scrolling up returns the masthead. Open recent/category menus keep their navigation pose during browser focus/scroll-into-view. Escape restores trigger focus and outside input closes the menu.
- Long category lists collapse complete entries rather than clipping partial text. The selected overflow entry stays visible without moving/reordering the original list. A dedicated ResizeObserver measures only this local fixture container; it is not a new production observer.
- B1 pearl/teal material, shared radii/type/action roles, opaque reading surface and more opaque popover content. Light/dark and reduced-motion treatments share this stylesheet.
- A viewer offers980×900,1160×900,390px stress and a phone-scale presentation. The latter keeps the iframe's actual980×2306 layout and scales it by the measured0.420684278011322; it is a visual proxy, not exact-device emulation.

## Code and reproduction

- `design-prototypes/b1-list/presentation.css`: the preview's sole visual owner, separate from its fixture/controller. No product CSS is mounted underneath it.
- `design-prototypes/b1-list/host-preview.mjs`: explicit local interaction simulation and DOM adapter. It consumes the existing `testbed/fixtures/pages.mjs` minor-list shape and `testbed/public/fixture-client.js` callbacks. Synthetic titles/names and extra categories are examples, not real user content.
- `design-prototypes/b1-list/index.html`: parent viewer; theme messages are same-origin and scoped to its own iframe.
- `node tools/build-b1-list-preview.mjs`: regenerates the ignored `artifacts/ui-overview-2026-10-17/b1-list/` viewing files. Source files above are tracked; generated HTML/captures/logs are not.
- `node tools/serve-b1-list-preview.mjs`: serves only five allowlisted preview assets on127.0.0.1:10062. It does not expose the worktree/artifacts directory; CSP prohibits connections and form submission. The process must remain running while the viewer is used.
- `node testbed/run-b1-list-preview.mjs`: focused local browser checks. Use the existing Playwright browser cache or explicit `DCUF_BROWSER_PATH` as documented by Testbed; do not install another dependency merely because a sandbox has a different cache location.

## Preservation and limits

No `src/`, build target, registry, userscript, stored setting, GM key, filter rule or PC artifact changes. This preview is excluded from both product build inputs and has no second userscript runtime. No architectural-owner promotion follows. The fixture's deliberate hostile inline/CSS baseline is removed locally so it does not compete with the preview stylesheet; this removal is not a production strategy.

Menu toggles, theme, sample search, page-size and numeric page selection work locally. Real navigation, login, filtering, write/submission, author menus, every popup and the remaining article/comments/editor surfaces are not connected or qualified. The selected raster and this preview are not a complete feature specification. Original fixture control nodes/parents/inline handlers are checked in their prepared preview state; this is not live-site preservation proof.

Affected review subset: H-01/H-02/H-03/H-04; L-01/L-02/L-05–L-09 and corresponding theme, width, focus, open/close and reduced-motion states. This does not close those product checklist rows or all128 children. Current product evidence keeps the unchanged478EF59F runtime scope.

Next after visual feedback: refine this exact composition or agree a bounded product trial through the existing presenters/adapters. Preserve actual recent-history semantics, all native categories/menu states,14 palette settings and the measured phone reference. Do not copy this fixture simulator into application/UiPort ownership.

## Focused verification

- Chromium149.0.7827.55:8 local contexts —980×900 light/dark,980×2306 light/dark,1280×900 light,390×900 light/dark stress,980×900 reduced motion — plus a separate phone-scale viewer readback. All completed without page errors.
- Checked positive-area/clamped/pointer-reachable recent menus; Escape/focus/outside close; original prepared-fixture handler call counts and node parents; whole-item category overflow and selected visibility; sample search;30-row choice; numeric next/previous; scroll header/toolbar adjacency; reduced-motion opt-out. These are preview results, not production acceptance.
- Initial unstyled fixture failed the compact-header check at703px. During development, a focus-triggered scroll could close an open menu and reduced-motion specificity left the header animation active. The current preview keeps the open-menu navigation pose and uses equal-specificity motion overrides; the focused final matrix covers both. A narrow outside-click test was corrected to click an actually uncovered point rather than a heading behind the open popover.
- Generated validation.json binds the current prototype, builder/server, test and fixture SHA-256 inputs. Representative light/dark, open-menu, scroll and viewer captures are regenerated beside it. No full product/Testbed or actual-extension run is claimed for this isolated preview.
