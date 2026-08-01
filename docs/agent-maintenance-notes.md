# Agent Maintenance Notes

This is the active, compact maintenance index. It records reusable causes and contracts, not commands or a chronological diary. Closed detail is preserved in [`archive/agent-maintenance-notes-history-2026-07.md`](archive/agent-maintenance-notes-history-2026-07.md).

## Size and update policy

- Update an existing topic before adding another section. Merge follow-ups into their owning contract and remove superseded wording.
- Keep only unresolved decisions, fragile live signatures, discarded fixes likely to recur, and the regression gate that protects them.
- Omit routine successes, transient measurements, screenshots already represented by executable assertions, and sensitive data.
- When this active file approaches roughly 150 lines, move closed historical sections to a dated archive and retain a one-line link here.

## 2026-07-29 — Reference-driven UI correction workflow

- The three approved list/article/write images define appearance. `3.5.3` is only a behavior reference for popup, event, preview, and form lifecycle.
- Maintain the compact live-root map in `ui-surface-contracts.md`; a full DOM database becomes stale and cannot explain cascade ownership.
- Before editing, compare the live root tag/parent chain with the fixture, trace every matching injected phase and specificity, and assign one final visual owner per surface.
- Add a failing positive contract before the fix: rendered width/height, writer containment, title-mark adjacency, blank-space click ownership, popup `elementFromPoint`, or material role. Zero-area success is invalid.
- Hidden originals and mirrors coexist. Tests must choose a rendered positive-area instance without weakening the positive geometry contract.
- Wait for the owning runtime class/subscriber before synthetic interaction. Measure the actual state transition; throttled `requestAnimationFrame` can misreport a layer already positioned.
- For lifecycle closure, wait until timers and frames return to the pre-test baseline. Do not hide a real leak with a fixed sleep or call a bounded cleanup timer a leak.
- Source-work Testbed runs must inject `testbed/artifacts/runtime-under-test.user.js` with the runtime guard and report its absolute path/SHA. Screenshot capture is evidence, never visual approval.
- A fixture must reproduce exact interactive signatures, not visual stand-ins. The recent rail needs `#visit_history > .newvisit_history.vst` and the real sprite child; author/headtext/drawer tests must click the real-shaped trigger and observe the popup created by that interaction.

## Selective glass and palette hierarchy

- Use real blur only on global chrome and DCUF-owned overlays. Lists, comments, article paper, and editor paper use one outer shell with flat readable inner surfaces.
- Palette changes subtly tint major glass shells. Active controls may be stronger, but repeated rows must not become blurred, rounded, elevated cards.
- Preserve all 14 palette IDs and the stored palette value contract. ON/OFF and selected states remain distinguishable by geometry/luminance as well as hue.
- Keep one final style owner per surface; an appended later style tag can still lose to an earlier higher-specificity `!important` selector.

## Native popup ownership and stacking

- DCInside-owned author, autocomplete, list-size, relation/rank, editor, DCCon, share/scrap/report/Pum, and alert popups keep their original node, handlers, contents, dimensions, scrolling, and internal style.
- A maximum child z-index is not proof. `backdrop-filter`, transform, opacity/isolation, or a positioned ancestor with z-index can trap fixed descendants. Inspect the complete ancestor stack and hit-test visible controls.
- `.note-toolbar { z-index:3 }` trapped fixed editor dropdowns behind `.page_head`; remove the ancestor stack rather than redesigning or cloning the menu.
- `#hot_rank_pop2` must portal the original node to `body` because its host ancestor is hidden. Never clone it.
- Delayed editor menus use only a bounded interaction-owned retry window and the existing mutation infrastructure; do not add another page-wide observer.
- Native popup coverage must include dynamically inserted post-click state. The drawer can create `#pop_manage_report_list` inside its presentation clone even when the initial clone contains no `.pop_wrap`.
- Calling `.click()` on a hidden/original writer is not equivalent to the host's delegated pointer target. Match the live `data-nick` signature and assert that the native menu is actually created.

## Live geometry contracts

- The header recent rail lives at `#visit_history.visit_bookmark > .newvisit_history.vst`; its `.btn_open > .sp_img.icon_listmore` must have a positive, fully visible hit area. A glyph-only fixture misses sprite clipping.
- List writers are predominantly `.author > .gall_writer[data-nick]`; do not assume `user_name`. Wide list rows are flat rails; the title link owns text only, and `(펌)`/other title decorations remain adjacent.
- Live list headtexts are `.list_array_option .center_box .inner > ul + .btn_subject_more + #subject_morelist`. The native headtext/30/50/100 layers and gallery drawer must win `elementFromPoint`.
- The live article root is `#container > article > div.view_content_wrap`. It is one rounded outer shell with flat header/body; reading ancestors have no blur.
- Image-comment shells follow the readable comment rail, never the source image width. Remove obsolete inline constraints through the existing rerun path.
- The live write form keeps headtexts → title → editor → AI rail → options → actions. It may expand to 1400px; preserve official nodes, fields, handlers, submit/cancel, toolbar overflow, and desktop-site scaling.
- Delete/password cards must neutralize host absolute button positioning before using grid. Authenticated delete stays in normal flow after the page head.

## Storage, login, and convenience

- Preserve GM keys and shapes. List scroll restoration is retired by ignoring stale `listRestore` data without rewriting the stored object; recent-post highlighting remains independent.
- `sign.dcinside.com/login` is an isolated CSS surface. It may read the existing palette ID once, performs no writes/menu/gallery startup, and never reads credential/form values.
- Reapply the already-read login palette after `DOMContentLoaded` because the parser may replace an attribute set at document start.
- Preserve official form methods/actions/hidden fields/button types and never cancel the first host submit to synthesize another.

## Current validation anchor

- Mobile source-test runtime SHA-256: `C5BA186D5E34FD168FEEA19827C4947216E4902DDE92E862B6CAD40E5B916C41`; full Testbed `106/106`.
- PC `1.9.9` SHA-256: `DA631A656BB919696B5936F89DF88EAD432DD95445AD99F5007CED478F4DC926`; full Testbed `106/106`.
- Read-only live smoke invalidated coverage for the recent sprite/wrapper, current author trigger, exact headtext trigger, dynamically created drawer-management popup, narrow list-size state, and short convenience viewport. Treat `106/106` as historical until those fixtures and contracts pass on the next final runtime.
- No state-changing form or credential was used in live checks.
