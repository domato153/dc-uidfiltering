# Memo workbench implementation and reuse plan

**Goal:** Implement the selected v7 memo composition, then reuse its validated material roles across the remaining B1 UI.
**Architecture:** Keep native settings discovery in the existing gallery-page-head adapter and presentation in its existing presenter/style slot. Reflow original nodes through CSS; no node moves, new behavior owners, storage or observers.
**Spec:** `B1_GLASS_REFERENCE_BRIEF.md`; selected image `docs/design/b1-glass-window-researched-proposal-v7-2026-10-29.png` (SHA-256 `4748D2D43A417BA56B5AF8B72CEAEA1B905077793D1D22C9A562A859B7D01B0E`). User selected implementation on2026-10-29.

## Current unit

- [x] Add a failing positive memo composition contract and retain the incumbent runtime as control.
- [x] Implement wide list-left/editor-right composition, compact underlined scope tabs, quiet reading paper and pale tinted primary with dark palette-derived ink. Stack safely on narrow/short screens.
- [x] Preserve original controls/parents/handlers, all14 palette IDs, authored memo swatches, factual guidance, native backup/picker layers and empty/populated states.
- [x] Validate affected geometry, hits, drafts, state changes, light/dark and theme colors; compare whole window and control details against v7. Record deliberate differences required by native topology.
- [x] Rebuild Mobile at current version and verify artifacts. PC remains byte-identical. Checkpoint transport/CI disposition is recorded by tools/checkpoint.mjs after exact-tree publication.

## Reuse after memo validation — requested2026-10-29

Carry the same **glass frame/header, stable reading/editing paper, quiet secondary action, pale tinted primary, soft selection, fine divider and focus** roles to other UI. Shapes and density remain surface-specific; teal is never fixed authority. The image is a material/composition reference, not permission to invent features or copy its background site branding.

1. List/header/filter/search/paging: retain scanning density and existing category overflow behavior.
2. Article and ordinary/image comments: reuse reading/action roles; image comments have no replies.
3. Write/edit/delete forms and editor menus: keep the editor opaque, exterior glass, existing native dialogs reachable.
4. Script-owned menu/settings and native popups/login: apply the validated recipes through each existing visual owner.

For each bounded family: inspect current native UI + incumbent B1 → generate/update a matching image before implementation when composition differs → implement common roles → inspect same-region whole/detail comparisons → run impact-selected checks only. Memo success does not certify other families. Extract shared tokens only for actually repeated roles; no new global override stylesheet. Discuss a concise guidebook only after the whole UI project ends, as previously requested.

## Review focus / boundaries

Long memo text, empty lists, selection/sort/search states, gallery-scope switching, picker/backup stacking and short-screen access are the likely failure modes. Fixed descendants must not acquire a filtered/transformed ancestor. Keep original guidance and field meaning even where the raster abbreviates copy. Product acceptance is limited to exercised states; live account/save branches stay UNKNOWN.

## Result and limits

Candidate039A implements this bounded memo slice. See verification/receipts/2026-10-29-b1-memo-workbench.json and tracked light/dark captures. No all-family migration or aesthetic adoption follows from these checks. The independent review identified duplicate-ID projection and same-tab false coverage;both were corrected and a nested duplicate-ID guard added.
