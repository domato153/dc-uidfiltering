# B1 content and glass-control implementation plan

> Agent execution: use superpowers:executing-plans inline; no per-task delegation. The existing managed worktree is the isolated workspace.

Goal: extend the adopted B1 list to a coherent article/comments/image-comments first trial, with real comment pickers and visibly related existing recent/FAB controls.

Architecture: keep native nodes/forms/events and adapter lifecycle. Existing article/comment presenters own reading/control CSS; the comment adapter projects native picker parts reversibly. Existing mobile theme/recent owners supply floating glass. The shared menu presenter consumes optional mobile material variables with its exact existing PC fallbacks; build/check both targets. Authentication is unchanged.

Tech stack: existing vanilla JS/CSS and guarded Testbed/Playwright; no new dependencies.

Spec: B1_UI_EXPANSION_PREFLIGHT.md. Source base6b2dba0; control Mobile BCB96852. Scope A-01~12/C-01~18 (actually exercised children only), H-03 and P-01/02, related X states. Unopened account-gated action branches and later P2–P5 remain pending.

## Constraints and review focus

- Preserve14 palettes, actual media colors, native40/44px targets, node parents/forms/handlers and phone layout980;390 is stress.
- Preserve borderless outer comments, first-comment/reply top-rule fixes and reply sibling separation. Reduce repeated card shadows, not original content.
- Picker fields must not inherit the main composer textarea geometry; swatch colors/media content remain native. Shared picker roots are styled only inside the active comment context.
- Glass must show readable backing, rim/sheen and offset shadow in actual open states; blur values alone do not certify appearance. The existing96%-paper popup is a control, not an immutable material requirement.
- User clarification: backdrop colors/shapes must visibly transmit through the popup. Start floating paper at78% light/84% dark (before sheen), preserve opaque input/preview surfaces, and inspect a labeled two-color backing alongside real content. These are trial values, not a universal legibility guarantee or final composited opacity.
- Recent popup tabs and list/footer, FAB button itself and expanded drawer remain material-review targets even though previously implemented. Tab/delete/open behavior and FAB movement/size persist.
- Dynamic insertion/reopen, short viewport clipping, keyboard focus, dark/14-color binding, reduced-motion and PC isolation are failure conditions to check.

## Tasks

- [x] Freeze unchanged BCB control; reproduce missing picker roles/material and affected geometry on native-shaped Testbed states.
- [x] Update surface contract/candidate intent. Add reversible picker-part observations to the existing comment adapter; no new observers, handlers or runtime owner.
- [x] Refine existing article/comment declarations and mobile glass roles/recent/FAB controls in their sole owners. Keep existing adopted list button and reading list unchanged.
- [x] Build guarded/current-version Mobile; run affected positive contracts, semantic article/comment control comparisons and final impact-required coverage once on the settled runtime. Inspect actual public/native states separately from fixture passes.
- [x] Capture aligned before/current plus chosen B1 context and readable full components; use existing visual comparator with concrete findings, refine/recompare and provide a local viewer. Record unresolved children honestly, update continuity and checkpoint exact files.

Ruling: comment textcon/DCCon roots were observed inside the original `.dccon_guidebox`/composer, so reuse its comment transaction and mutation subscriber. Do not invent a body portal or new input in folded image comments. Live image-comment count/content is transient, never a fixture assertion.

Ruling: theme-host-style's old FAB ID declarations are retired before injection. Keep them historical; the real shared menu presenter consumes mobile-only variables instead. This shared source change requires PC fallback comparison/build/tests. The first rendered test also exposed an opaque native picker panel covering the glass: reproduce it and scope the active picker panel rule to its semantic root/kind, with no new priority.

## Result and next bounded task

First implementation is reviewable, not visually adopted. Mobile5E114697 and PC61C53976 are rebuilt at unchanged3.5.5/1.9.9 versions. The native picker panel no longer paints opaque white over the glass; native media fit the viewport, fields are separated from composer credentials, and actual FAB/drawer material is supplied through the real shared presenter with unchanged PC fallbacks. No new observer/portal/storage/UiPort behavior owner.

Final Mobile broad run:144 passed/1 failed on the same5E114697 runtime. The remaining assertion expected the old generic dark composer surface instead of the declared B1 paper; its corrected positive contract passed separately. The original palette actions/search checks had independently failed on frozen BCB too; their painted-face/settled-state assertions now preserve actual native hits/behavior. No unsuccessful full run is relabeled as a clean145-test run. The final native-fidelity picker fixture also passes separately in5 viewport/theme contexts. PC26 pass plus4 control/candidate menu material/geometry comparisons. Immediate article22/comment36 behavior observations match BCB; all candidate invariants true, subscriber/observer/listener identities retained, sampled transient resources never exceed control. This is not published raw/mixed/upper qualification.

The generic fixture intentionally opened an adversarial fake action popup and lacked native0x0 hidden helper text. Fresh public6778319 also showed no native comment-li bottom border; remove the unrelated synthetic rule only in this B1 specimen. Re-capture both sides and recheck the affected picker contract. Do not repair product CSS to hide a fixture defect.

User requested reference-first work for windows without a selected design. UI_VISUAL_REVIEW.md now routes original → separate B1 proposal → implementation. docs/design/b1-popups-proposal-2026-10-24.md preserves the generated light/dark recent/textcon/DCCon board and excluded fictional details. Current trial predates that proposal and cannot serve as its own expected target.

Working viewer: artifacts/b1-detail-2026-10-23/content/index.html,16 before/current pairs plus separate proposal. Six picker/backdrop pairs have image-bound dispositions in artifacts/b1-content-2026-10-24/glass-review-manifest.json; official comparison reports DIFFERENCES_REQUIRE_REVIEW/referenceFidelity UNVERIFIED, productApproved false. Ten remaining captures are review aids, not formal fidelity passes. Visible transmitted backing is demonstrated by the labeled two-color probe; white-on-white or a blur property alone is insufficient.

Next: review the new popup-family proposal and polish this P1 trial against its accepted parts, starting title/field/action grouping and real native children. Do not skip to P2–P5 or call all article actions/menus complete. Actual extension/device/authenticated and unopened child checks remain pending; native anatomy observation is not candidate extension proof. Frozen BCB list remains the adopted visual baseline.

Follow-up: B1_POPUP_POLISH.md owns the84AE8033 recent/textcon/DCCon refinement and eight new reviewed pairs. This earlier trial/receipt retains its original split coverage and UNVERIFIED judgement; do not rewrite it as the new result.
