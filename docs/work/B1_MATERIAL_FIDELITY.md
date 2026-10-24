# B1 integrated material pass

The selected B compact/B1 reference remains authoritative. This pass refines the cool pearl/charcoal canvas, translucent chrome, fine rim and spread shadow together. The user then identified unfinished toolbar detail and weaker header glass; B1_VISUAL_REVIEW_GAP.md owns the review-system correction and remaining work. Read mode governs the list; controls remain Operate. This candidate is not visually complete.

## Causes and implementation

- The native layout wrapper already paints the page, but the old dark `#container` rule covered that background with opaque `#121212`. Clear that container in its existing early CSS owner; retain article content surfaces and fallback body styling.
- Header-only glass variables and separate toolbar/menu materials drifted apart. Define mobile-only B1 material roles in the existing target theme builder, consumed by existing shell, list and recent-menu presenters. No new style phase, selector slot or adapter responsibility.
- Use the selected prototype's neutral canvas values (`#f1f5f5`, dark `#171e21`) and dark reading paper (`#20292c`), not sampled screenshot pixels. Accent haze, selected controls, ink and borders still consume existing palette semantics. Shared theme source, fourteen palette IDs/settings and PC output stay unchanged.
- Reading rows stay opaque. Header/toolbar use one glass, rim and shadow family; the recent layer uses nearly opaque paper for readable overlapping content. Its native dark inner `.pop_content` painted black despite the correct outer material: clear it in the existing popup wrapper rule, without another priority override.
- The nested/self header had a later transparent-root rule obscuring its own canvas. Keep one backdrop variable and explicitly paint the self layout; remove the redundant dark transparent-root declaration. Cover native siblings and nested light/dark.

## Additional startup defect found by verification

The recommendation compatibility checks failed on all three article routes. Independent replay on immediate control079ED46D and first material candidate992614B8 found the same critical startup error, not a CSS sizing regression or timing-only failure.

`syncUtility` compared `state.utility?.list` with an undefined list when the entire `.area_links` cluster was absent. Both evaluated undefined, so it entered the reuse branch and read `state.utility.button`. This aborted main initialization before the article owner connected. Require an existing utility record before reusing it. The original adapter still owns discovery, native popover and disposal; no new presentation logic. Add an absence/repeated-refresh regression and run the original compatibility assertions unchanged.

The intended behavior delta is narrowly this startup recovery. Do not call the unit CSS-only or silently waive the preexisting exception. A first incorrectly modeled absence test removed only the UL, then failed in its own cleanup; the corrected whole-cluster case reproduced the actual null/undefined dereference before the one-line product fix.

## Review and qualification

Select H-01/H-02 and L-01/L-02/L-05–L-09, adjacent native utility absence and related X theme/viewport/focus/open states. Use980×2306 as the adopted phone-layout proxy;390 is stress. Article/write/comment redesign remains later; their functional checks do not approve their appearance.

Use installed unmodified Impeccable polish and the existing whole/detail comparison loop. The default Playwright threshold0.2 can classify subtle material changes as PIXEL_MATCH despite differing image hashes. That is engine tolerance, not exact pixel identity or a beauty score; retain actual captures and manual hue/rim/shadow observations. Do not silently tune the engine to manufacture a failure/pass.

The first144-test run on992614B8 was142/144: two visual assertions still expected the old90%-raised toolbar and old neutral paper. Update only those declared material roles to B1 glass/paper; preserve palette, geometry, accessibility and functional assertions. Final runtime/checks and visual dispositions are bound in the receipt linked from CURRENT_STATE.md.

B1_IMPECCABLE_POLISH.md remains the historical079ED46D trial. This pass does not qualify raw/mixed/upper/release admission or measured Impeccable efficiency. User aesthetic preference is separate from this bounded implementation and fidelity review.
