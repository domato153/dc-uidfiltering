# Agent Maintenance Notes

This file records reusable debugging lessons that are likely to prevent repeat regressions. It is not a command log. Add only stable context differences, fragile host contracts, misleading partial fixes, and the regression coverage that now protects them.

## 2026-07-15 — Document-start boot and degraded recovery contract

### Context and root cause

- Current article pages use `.writing_view_box`; requiring only the legacy `.gallview_contents` kept valid pages locked until the old fixed timeout.
- The initial comment waiter contained a completion branch tied to `delay === 140` that its call path could not reach. Pending mutation records could therefore escape the last local-filter pass.
- Storage settings and personal-block data were read repeatedly on the critical path, and list controls were moved before a reversible transaction existed.

### Discarded partial fix

- Releasing the entire page after any timeout avoids a permanent blank page but can expose blocked rows, comments, related posts, and embedded lists. A longer global timeout only extends the blank interval and does not repair failed initialization.

### Stable contract

- Only list, view, and write routes use the document-start lock. `data-dcuf-boot-state` owns `locked`, `preparing`, `degraded`, and `ready`; normal release occurs exactly once after local filters and required UI commit.
- A deadline rolls list/view pages back and hides only filterable zones while keeping article text and navigation usable. Late initialization may promote `degraded` to `ready` only after filters and UI commit again.
- Boot storage uses one shared snapshot without changing GM keys, shapes, grants, or migration order. List preparation records moved nodes and inline state before mutation and restores them on failure.
- Comment stabilization flushes the shared observer, runs filter/merge/placeholder synchronization, and requires two quiet animation frames within a bounded attempt window. Body replacement rebinds the shared mutation bus without losing subscribers.

### Regression coverage

- The Testbed `boot` group records every animation frame and covers `.writing_view_box` ready release, protected-content non-exposure, one-read storage snapshots, migration write order, pending and rejected storage recovery, 0/140/420ms comments, list rollback, body replacement, duplicate-safe overlays, and iframe guards for mobile and PC artifacts.

## 2026-07-14 ? Article Google SafeFrame ad variants

### Context and root cause

- Mobile article ads can render Kakao banners, Google banners, or outstream video inside the same cross-origin Google SafeFrame.
- The stable outer contract observed live is an article-scoped iframe whose `id` or `name` is `aswift_<number>` and whose `src` path is `https://googleads.g.doubleclick.net/pagead/ads`; its layout host is `aswift_<number>_host`.
- Matching inner creative nodes such as `.cm_ad`, ActiveView, or outstream classes is insufficient because top-document CSS cannot cross the iframe boundary and creative markup varies.

### Discarded partial fix

- Adding more selectors for creative descendants would only cover the currently served artwork and would not remove the outer host's reserved height.

### Stable contract and coverage

- Classify the frame from the combined `aswift` id/name and DoubleClick pagead source, then remove the matching `_host` parent when present.
- Keep the rule scoped to article content so unrelated embedded frames survive.
- The Testbed SafeFrame regression inserts the live-shaped outer iframe, asserts that its host is removed, and asserts that an unrelated article iframe remains.
- Removing only the SafeFrame host can leave a 970x90 inline slot and its margin behind; remove the article-scoped direct owner `div:has(> ins.adsbygoogle[data-ad-client][data-ad-slot])` to collapse the full reservation.
- The residual-gap regression asserts that the owner div disappears while an ordinary incomplete `.adsbygoogle` element remains.

## 2026-07-14 ? Mobile desktop-layout right-wing ads

### Context and root cause

- A desktop-layout mobile article can receive a classless 360x840 wing container directly under `.wrap_inner`.
- The host distinguishes campaigns through scripts such as `list@right_wing_game` and `list@right_wing_hobby`; matching one campaign suffix lets later variants leak.

### Stable contract and coverage

- Match only a direct `.wrap_inner` child whose direct script source contains the stable `/dcinside/pc/list@right_wing_` prefix.
- Reuse the existing article-ad CSS and mutation-bus cleanup; do not add another observer or depend on inline geometry, image URLs, or campaign artwork.
- The Testbed regression inserts a `right_wing_hobby` container and an ordinary sibling, then asserts only the ad container is removed.

## 2026-07-14 — Desktop write cancel confirmation diverged by viewport

### Observed contexts

- This is a mobile-userscript write-page issue across viewport modes, not a change to the PC filter target.
- DCInside desktop write pages render `#leave_confirm_box` inside `form#write > .btn_box.write`. The outer cancel button only changes that existing node from `display:none` to visible.
- The host supplies absolute inline offsets such as `top:-322px` and `margin-left:-619px`. Those values are calibrated to the host's original fixed desktop action-row geometry.
- DCUF makes the action row full-width and responsive. On a desktop-width viewport the old offsets produce a visibly off-center popup. On a narrow viewport, especially desktop-site mobile mode where layout width and physical screen width differ and the container is zoomed, the same negative offsets can place the popup outside the visible screen.

Live-backed major and minor write-form captures are in `testbed/evidence/live/2026-07-12/`. The deterministic host shape lives in `testbed/fixtures/write-pages.mjs`.

### Misleading partial fix

Restoring `position:relative` on `.btn_box.write` repaired the lost containing block and made the popup visible in the initial desktop report. It did not remove the dependency on host offsets. The result remained off-center on desktop and invisible on mobile, so restoring one host positioning primitive was not a complete responsive fix.

### Stable contract

- Preserve the original `#leave_confirm_box` node, ID, and inline site handlers; do not clone or replace it.
- While the popup is still hidden during write-page initialization, move the original node to `body` and add a DCUF-owned class.
- Override the host offsets with a viewport-fixed center position, responsive maximum width, high stacking order, light/dark surfaces, and touch-sized controls.
- Disable popup animation and transition so the first visible frame is already centered; do not show at the host offset and correct it afterward.
- Match the real nesting: `.poply_whiteclose` is a child of `.pop_content.write_ly`.

### Regression coverage

The Testbed `write` group checks major desktop, minor desktop, 390px mobile, and desktop-site mobile (`980px` layout on a `412px` screen). It asserts that the original node is portaled before display, the first visible rectangle is centered, the final popup is fixed and fully inside the viewport, hit testing reaches it, controls are at least 44px, and light/dark surfaces remain opaque.

## 2026-07-14 — Mobile stable version sequence

After stable mobile `3.3.9`, the next stable release is `3.4.0`. The reviewed `3.3.10-beta` artifact is promoted by changing only its version token to `3.4.0`; do not publish a `3.3.10` stable release for this cycle.

## 2026-07-14 — Personal-block management live-add state

### Context and root cause

- Standalone quick/manual block additions save immediately and refilter, while the management panel stages deletions against the list snapshot captured when the panel opened.
- If a direct addition is made over an open management panel without refreshing that snapshot, the later management save can reconstruct storage from stale data and silently drop the new entry.

### Stable contract

- After a nested direct addition succeeds, reload all three personal-block collections into the management snapshot, preserve the existing pending-deletion sets, refresh tab counts, and rerender the active list.
- Keep UID entries in the existing `{ id, name }` shape and nickname/IP entries as strings; exact-match filtering and storage keys do not change.
- Render manually entered list values with DOM `textContent`, not interpolated HTML.

### Regression coverage

The Testbed functional check `직접 차단 입력이 닉네임·식별번호·IP를 저장하고 관리창과 동기화된다` covers immediate filtering, duplicate handling, all three stored shapes, management counts/search, and nested direct-add snapshot refresh for both mobile and PC beta artifacts.
## 2026-07-14 - Focus-comment reply composer collapse

### Context and root cause

- On live focus-comment pages, closing a reply composer can empty a top-level `reply_empty_last_li_*` placeholder while leaving the placeholder connected.
- The removed reply tree is detached before mutation-bus dispatch. Ancestor-dependent removed-node selectors therefore miss it, so the focus-card grouping pass does not clear `data-dcuf-focus-group-parent`, `data-dcuf-focus-group-reply`, or `--dcuf-focus-group-extend`.
- Treating the empty placeholder as hidden is only a partial fix: the existing grouping predicate already rejects an empty reply tree once synchronization actually runs.

### Stable contract

- Reuse the shared mutation bus and inspect its connected `childListTargets` for reply-group changes; keep the fallback observer behavior equivalent.
- Do not add a second observer. When the reply composer is removed, rerun the existing grouped-card synchronization so stale attributes and extension styles are removed.

### Regression coverage

The Testbed functional check `focus comment reply composer collapse clears merged card state` opens a detached focus reply group, empties the live-shaped placeholder, and asserts that both group markers and the parent extension style are cleared.

## 2026-07-14 - Mobile list navigation control surfaces

### Context and root cause

- Major and minor list pages expose site-owned top tabs/write controls plus bottom tabs, pagination, page move, and search elements with different desktop-oriented spacing.
- DCUF already created a bottom wrapper but omitted the original search form from that wrapper, leaving pagination and search visually disconnected. Styling the old fixed 125px/320px search columns alone does not produce a responsive card layout.

### Stable contract

- Move, do not clone, the original tabs, pagination, page-move box, search form, and search layer into DCUF-owned action, pagination, and search cards. Preserve IDs, hrefs, inline handlers, and force-refresh exclusions such as `goWrite`.
- Reuse the existing list runtime and search-layer reserve hooks; do not add an observer.
- Search controls use 44px touch targets and CSS-variable surfaces for live dark-mode changes. At 640px and below, the search input and submit control stack so the fixed personal-block menu cannot cover the submit target.
- Keep the top `.list_array_option` DOM in place and restyle it only within non-write pages.

### Regression coverage

The Testbed functional check `mobile list navigation uses integrated raised toolbar and control cards` covers major 390px mobile and minor 1280px layouts, original click handlers, one preserved search form, pagination hrefs, touch sizes, dark surfaces, and horizontal overflow. Existing smoke, gallery-door, list-replacement, and duplicate-runtime checks protect adjacent contracts.


### Live follow-up

- The live search form can contain both the site's custom `.select_box.bottom_array` and a native `select[name="search_type"]`. After creating the native-select host, never re-enable the custom select in the generic styling pass; exactly one search-type control may remain visible.
- A `.gall_listwrap` that is itself a `section` can have its list action bar as a sibling on view pages. Resolving `closest('section')` to the list wrapper hides those siblings from discovery. Search from the immediate parent and reject controls owned by another list wrapper.
- Live pagination arrow groups can be wrapper elements with absolute positioning. Size and style the wrapper's links, while resetting the wrapper itself to intrinsic flex layout; forcing the wrapper into a single 38px page button causes the next/end controls to overlap.
- Major-gallery top controls can retain stronger or more deeply nested absolute/float rules than minor-gallery controls. Reset position, inset, float, and height for nested center/right groups and nested `ul/li` tabs; style clickable `a/button` elements rather than the `li` container.
- Regression coverage includes major 390px, major 1280px, minor 1280px, and the view-page embedded list. Keep desktop action groups within about 10px of the right card edge; reserve the fixed-menu footprint only at 640px and below.
- The host `.bottom_search` can retain its own thick blue border and background after it is moved. Reset the outer wrapper to a transparent, borderless flex container and let `.inner_search` plus the submit button own the visible frame.
- The submit button also keeps the host `.sp_img.bnt_search` sprite unless its background image is reset explicitly. Preserve the original button and handlers, remove only the sprite, and draw the DCUF magnifier with pointer-transparent pseudo-elements.
- A populated page range has 19 direct controls (`first`, `previous`, 15 pages, `next`, `end`). Keep them on one flex row; use safe centering and card-local horizontal overflow on narrow screens rather than wrapping navigation onto two rows.
- Do not pair a gradient-only `background` shorthand with a later `background-image:none` on the same button. That removes the light-mode fill while preserving white text; replace the host sprite with an explicit gradient background image and solid fallback color.
- On live list pages, the real `.gall_listwrap` contains only the table while pagination, page move, bottom buttons, and search are siblings under the same `article`. An outer decorative `#top.list_wrap` also matches the list-wrap selector. Never assign a sibling control from `closest(LIST_WRAP)` alone: resolve the actual table first and use that table's closest list wrapper as the owner.
- Existing list state must reconcile missing bottom controls when the shared mutation bus reports late tabs, pagination, page-move, or search nodes. Direct `a.sp_pagingicon` controls must have host sprite backgrounds and text indentation reset, while the article-level `.view_bottom_btnbox` remains outside the embedded list card and is styled in place.

## 2026-07-15 - Mobile UID statistics cache first-paint contract

### Context and root cause

- The mobile adapter read an empty `dcinside_blocked_uids` value and skipped cache writes, so every reload treated known statistics-blocked UIDs as new and hid them only after the server response.
- A user-agent-based `isMobile()` check also made the mobile artifact take the PC cache branch under desktop-site test contexts. Target ownership must not depend on viewport or user agent.

### Stable contract

- The mobile target reads `dcinside_blocked_uids` once in the boot snapshot, keeps the existing JSON entry shape and seven-day expiry, and reevaluates cached raw statistics against current settings before reveal.
- Serialize background cache writes so concurrent UID responses cannot overwrite one another. First-seen UIDs remain post-reveal asynchronous decisions; do not withhold all safe comments while waiting for the server.
- The mobile source reports a mobile target unconditionally. The PC builder rewrites that target flag to false when extracting the shared filter module.

### Regression coverage

- The boot test records every frame for a cached UID and asserts zero visible frames, one cache read, and no UID API request.
- The functional cache test asserts multiple concurrently blocked UIDs persist in the legacy storage shape without entry loss.

## 2026-07-15 - Dynamic comment pre-paint filtering contract

### Context and root cause

- The shared mutation bus intentionally batched records to an animation frame, and the filter subscriber then batched changed items to a second animation frame. Fresh host comment DOM could therefore paint before cached statistics, personal, or guest blocking ran.
- The initial comment barrier was followed by an awaited style-readiness check, while the defined final comment preparation function was never called before `markUiReady()`. A host replacement in that gap could be exposed with the body lock removed.
- The old rerender fixture cloned already filtered inline `display:none` state and asserted only after a long settle, so it could not detect intermediate visible frames.

### Stable contract

- Reuse the central observer. Its immediate subscriber phase is reserved for small, synchronous visibility decisions on newly added comment nodes and UID/nickname/IP identity mutations; heavy UI normalization and asynchronous UID statistics remain on the batched bus.
- Flush pending mutation records and run the final local comment/merge pass immediately before `markUiReady()` with no awaited work between filtering and unlocking.
- First-seen or expired UID statistics remain post-reveal asynchronous by policy. Cached statistics, personal blocks, and other locally decidable filters must not paint when comment markup is appended or replaced.

### Regression coverage

- The boot test replaces comment DOM after the initial barrier and samples frames after `ready`.
- The functional test strips all script-owned visibility markers to emulate fresh host HTML, then samples six consecutive frames after both full-list replacement and late comment insertion for cached and personal blocks.

## 2026-07-15 - Host comment-only refresh rerender

### Context

- Current live view pages include a usable `button.btn_cmt_refresh` that refreshes only the comment DOM. The observed defect is a blocked comment painting during that rerender, not the button itself painting.
- Preserve the native refresh control. Treat its comment replacement as a live reproduction path for the dynamic comment pre-paint filtering contract above.

### Diagnostic coverage

- Keep the live-shaped button in the view fixture. The standalone live flicker probe records the button click, subsequent comment child-list replacements, and visible-to-hidden transitions for the queried identity.

### Async decision precedence

- A delayed UID-statistics request can resolve after its comment has become personally blocked. A non-blocking statistics result must never call the generic reveal path while `data-dcuf-personal-blocked="1"`; server statistics are an additional blocking reason, not an authority to undo local blocking.
- Skip new UID-statistics work for an already personally blocked item and recheck the marker when an in-flight request resolves. Ignore results for detached comment nodes.
- Regression coverage starts a delayed safe UID request, personally blocks a parent with visible replies while the request is in flight, and asserts zero visible writer frames and no comment-shell attribute removal when the response arrives.

### Comment-close overflow contract

- Live comment close replaces the close control and removes `.show` from `#focus_cmt > .comment_wrap`; it retains the wrapper at header height instead of removing the comment DOM.
- Open-state popup support sets the focus comment wrapper and comment descendants to `overflow: visible !important`. Without a closed-state override, the full comment box paints outside the collapsed wrapper and overlaps following controls.
- Scope the override to `#focus_cmt > div[id^="comment_wrap_"].comment_wrap:not(.show)`: hide its direct `.comment_box` and restore wrapper clipping. Adding `.show` must restore the existing open layout without JS, a new observer, or changes to image-comment containers.
- The view CSS is stored in a JavaScript template literal. Do not use unescaped backticks inside its CSS comments: they terminate the template and can produce a runtime `... is not a function` failure even when the generated userscript passes a superficial build step. The selected runtime tests must assert that post-main initialization remains error-free.

## 2026-07-16 - Local performance guards before observer restructuring

### Stable contracts

- Search drawer reserve updates use one delegated document/window listener set and a connected-root registry. Replacing a search form must prune detached roots, keep the listener count stable, and coalesce immediate plus 40 ms recovery updates.
- Head mutations that do not change the effective dark-mode state must not rerun article/comment theme normalization. A replaced body that lost the expected class still counts as a state repair and must be synchronized.
- The transient negative UID-statistics cache is memory-only, keeps its 30-second TTL, and is capped at 256 entries by pruning expired entries before the oldest live entries. Persisted blocked-UID keys and shapes are unrelated and must remain unchanged.
- FAB, settings, and management drag/resize paths may retain only the latest pointer position per animation frame; pointer release must flush the pending position so the final geometry is not lost.

### Regression coverage

- Replace the search form repeatedly and assert one active reserve root, four global listeners, and no increase in unique registrations.
- Mutate unrelated head nodes, then add/remove `#css-darkmode`; unchanged mutations must be skipped and the two real state transitions must synchronize.
- Fill the negative UID cache past its limit and assert the newest entry remains while expired and oldest entries are removed.
