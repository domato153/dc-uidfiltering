# B1 integrated UI gap reconciliation — 2026-10-28

Follow-up2026-10-29: B1_NATIVE_AUTHOR_FINISH.md/8AC7 closes the acquired native menu/memo/picker scope; actual account/comment permission and other named children remain separate. Earlier native-author acquisition blockers below are historical.

Follow-up: B1_PREVIEW_DRAFT_FINISH.md/06CA closes the two confirmed roots below and the user-added recommendation-card spacing. This F87E audit remains historical diagnosis/native-child inventory; its preview/draft next-task text is superseded by CURRENT/NEXT.

Status: **GAPS_IDENTIFIED**, not whole-UI completion. Source base `4819044c0912cd37ccf57f659be731f063d79f43`; Mobile3.5.5 `F87E31ED06E223E066913F5BC0063A8DA38009067BCA57E83CC9FB8CF64D47CB`, PC1.9.9 `8915F36E5B8887DC58EF9F932E39CCA28CCE1AC1020FD96460CCD10C08913581`. Product source, artifacts, metadata, versions and accepted architecture are unchanged by this audit.

## Result and evidence boundary

The existing128 checklist IDs remain the inventory. Old blanket “미캡처” cells were reconciled with the actual family briefs/receipts; a scoped result does not complete every child in its parent row. Two current roots have confirmed B1 omissions: post preview and draft feedback. Native interiors that were never observed remain UNKNOWN, not inferred defects or invented tasks.

Only these suspect roots were rendered again: preview content with a decoded640×240 synthetic image and draft conflict with existing synthetic form content, each in light/dark. Four fresh source-injected contexts used the unchanged guarded F87E runtime. Visible original controls had positive bounds/hits; preview close worked and the draft did not overwrite existing content. This is not a new full functional/lifecycle pass, an actual-extension replay, a new design proposal or aesthetic approval.

Environment: installed Chrome; screen412×1006/layout980×2306, touch enabled, scale1/DPR1 **layout proxy**. Adopted phone scale0.420684/DPR2.625 and actual-device/input differences remain separate. One browser job at a time; no full product suite, build or authentication attempt.

## Confirmed implementation gaps

| Root / checklist | Expected → current observation | Bounded correction boundary |
| --- | --- | --- |
| `#dcuf-post-preview` / V-02–V-05 | Floating chrome should consume the B1 shell/rim/control family, keeping reading/media paper opaque. Current shell/header are opaque old gradients; no backdrop filter. Dark teal **원문 열기 rendered label contrast1.59:1**, below the existing4.5 label floor. Close is an older text X; its aria-label and36px hit remain present. | Separate its presentation CSS from `convenience-host-adapter.js`, then finish chrome/link/close using current B1/C885 roles. Preserve native link target, sanitizer, cache/fetch ownership, anchor/sheet geometry, gestures, scroll and late-response handling. Do not glass the article body. |
| `#dcuf-draft-banner` / V-06–V-08 | Feedback should share B1 material, theme-aware controls and small close. Current dark banner retains hardcoded white recovery/delete buttons and a boxed text X without an aria-label. Recovery/delete are about47×32; close about31×31. | Move only presentation out of the same mixed CSS block. Keep draft storage, conflict choice, auto-restore, submission marker, callbacks and scope disposal in the draft owner. Add the close label without changing its action. Exercise affected messages/actions, not every writer child. |

Root cause: `convenience-host-adapter.js::ensureStyles` still owns these two presentation blocks. Later B1 scopes covered convenience **settings** via the shared presenter, but not the preview/draft roots. “Owned panels finished” was too broad a retrieval shortcut. No observed failure justifies a new global CSS phase, storage owner, observer or full mixed-file rewrite.

The contrast probe uses the existing rendered-label sampler on the current dark teal link (550 sampled pixels), not an opaque-token substitute. Other palettes/states were not measured here. V-03–V-05/V-06/V-08 inherit the same root/control omission from source; their every failure/loading/message branch was not newly captured.

## Scoped work to reuse

These are retrieval/evidence scopes, not fresh all-family passes. Use each original receipt's runtime, fixtures and limits. Later pure material extraction has exact CSS/preset parity evidence in the login receipt; do not expire an unchanged visual consumer merely because unrelated login registration or the global artifact hash changed.

| Family / IDs | Existing route and retained scope | Still outside that scope |
| --- | --- | --- |
| Header/list / H,L,V-01 | B1_LIST_COHESION.md, B1_CONTROL_MATERIAL.md, UI_LIVE_REGRESSION_REPAIR.md: compact header, recent menu, list/card/toolbar, native overflow drawer, paging/search/action material and reported native repairs. | Author/memo interiors; every empty/error/dynamic/account combination. |
| Article/comments / A,C | B1_CONTENT_TRIAL.md, B1_POPUP_POLISH.md, B1_IMAGE_COMMENTS.md: paper content, ordinary/reply anatomy, textcon/DCCon roots, image fold→full/composer, small delete/clear actions. | Native picker subpages, permission/password children, every loading/error/media subtype. C-07 image replies are N/A. |
| Article actions / A-07–12 | B1_ARTICLE_ACTION_POPUPS.md: share, real-best, guest scrap/report/PUM roots and named modeled children. | Account scrap iframe/folders/results, conditional CAPTCHA, PUM history/headtext/results and actual submissions. Native PUM structure was acquired; earlier replay limits are not a global Chrome blocker. |
| Gallery/search / H-05–10,L-08 | B1_GALLERY_SEARCH_POPUPS.md: eight roots, ranking paging, guide reachability, closed-parent popup and search/history/suggestions. | Settings subpages/auto-image/account children and unspecified native branches. |
| Password/write / W | B1_PASSWORD_PAGES.md, B1_FORM_HEADER_REUSE.md, B1_WRITE_EDITOR_SHELL.md, B1_EDITOR_MENUS.md: password pages/shared header, writer shell and six in-document menu families. | Actual nested Summernote color/list/table/link/modal feedback; attachment/AI interiors and permission/error branches. Four external upload documents remain DEFERRED_USER_ACCEPTED. |
| DCUF panels / S,P | B1_GLASS_TRANSMISSION.md, B1_OWNED_CONDITIONAL_FINISH.md, B1_OWNED_INPUT_CHILDREN.md:12 root/entry families, ordinary-page transmission, named conditional and input/backup/shortcut/headtext/size states; PC fallback scopes retained. | OS clipboard/export/file-picker/read-failure and unobserved key/data variants. These do not imply another shell redesign. Preview/draft are the two distinct omissions above. |
| Login / H-01 | B1_LOGIN_ENTRY_IMPLEMENTATION.md: isolated original-node entry,48 source observations,10 actual-TM native-replay routes,4 design pairs and exact theme extraction. | Real authentication, conditional account errors/CAPTCHA/password-manager and actual phone. |

## Unobserved children, not confirmed defects

Prioritize an implicated child when its family changes or a concrete mismatch is reported. This inventory does not create a mandatory all-child testing campaign before the next local change.

- **Native author/menu/memo** (L-03,A-02,C-12) and permission/password children (C-13): generic comment popup shell/legacy memo geometry exist; list/article interior styling has no specific B1 evidence. Fresh anonymous original-site author clicks reached `POST /api/gallog_user_layer/gallog_content_reple/`; the GET/HEAD-only audit intercepted it before transmission. No body/token read, no menu opened, no candidate injection. Original article/list had51/52 visible authors. Exact native read acquisition is outstanding; this is not a product failure, auto-review rejection or global test capability blocker. Existing relation-list POST approval does not extend to this endpoint.
- **Gallery settings descendants** (H-10): root coverage does not certify each native settings/account tab or child window.
- **Editor interiors** (W-05–14/16): six parent menu scopes do not certify every native palette/list/table selection, link modal, external DCCon, attachment/AI result or permission branch. No upload/generation is attempted merely to inspect presentation. The four deferred `/upload/image`, `/upload/movie`, `/upload/youtube`, `/upload/media` documents stay deferred.
- **Article conditional/account and comment states** (A-04–12,C-04/05/11–18): retain named media/ordinary/reply/image evidence; original image viewer, account scrap/PUM/CAPTCHA and all sort/empty/error/media variants remain unqualified where not observed. Do not multiply ordinary replies into image comments.
- **Platform/account qualification** (N,X): browser/OS dialogs and file/permission surfaces are not web-CSS redesign tasks. Real account/device/extension-state and formal upper/header admission are separate evidence boundaries, not dozens of newly discovered CSS defects.

## Next bounded implementation

**Preview + draft presentation separation/B1 finish**, beginning with current native-shaped anatomy and an independent current-theme proposal. The normal-page reference `docs/design/b1-glass-ordinary-target-light-2026-10-27.png` (95B99AE7…) supplies material context only; it is not a same-composition preview/draft target. Freeze a tailored proposal before judging implementation against it. Keep simple C885 buttons, moderate ordinary-page glass and opaque reading/fields.

Inspect the actual visual owner/build dependencies, declare the narrow candidate overlay if adding/moving responsibilities, then separate only these styles. Preserve existing host state/events/geometry. Select preview/draft functional, relevant material/contrast/containment/hit and adjacent writer/header checks by actual diff. No unrelated login/PC/filter/full-suite rerun. Full header/whole-UI acceptance remains UNKNOWN.

## Evidence and recovery

Tracked receipt: `verification/receipts/2026-10-28-b1-integrated-ui-gaps.json`. Local diagnostics: `artifacts/b1-integrated-gaps-2026-10-28/` (`current-observations.json`, `preview-contrast.json`, four final current PNGs and scripts). Optional local viewer: `/integrated-gaps/index.html` on the existing comparison server. These are **current diagnostics**, not proposals/goldens.

Initial mock preview lacked the parser's native parent; initial draft capture intersected a Testbed-only toolbar. Those fixture errors are preserved under `initial-fixture-*`, corrected separately and excluded from product findings. The final preview uses the recognized parent/decoded media; only the fixture-owned toolbar is hidden and every visible product control is hit-tested.

If local captures are unavailable, rebuild the exact source-base F87E control in isolation and recreate only the two native-shaped synthetic states through existing owners; retain synthetic data and exact runtime binding. Do not replace these controls with an arbitrary published release or recapture all128 IDs. A new runtime/fixture/material dependency change invalidates only its dependent current findings/evidence.
