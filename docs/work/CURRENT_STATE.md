# DCUF current situation

## Current execution

- Active plan: Mobile 3.5.7 is published. The development candidate adds native popup coverage, two-axis pointer preview, and the native list size repair. The PC candidate shares the quick-block and settings dismissal repairs.
- Workspace path: `.` (private prompt supplies exact worktree). Preserve debug.log unread/unstaged.
- Active stage: `stable-closeout`;next action `post-release-artifact-inventory`.
- Source state: Source checkpoint base HEAD `cd14084d3384ba678ea2f56b07c32e80e2b2ccd7` on `codex/ui-port-boundary`. Published refs and hashes are bound by the 3.5.7 publication receipt.
- Candidate fingerprint: `23fe12e9d391a16b200cb95c59658f9e0457894e6b13a99e0b92aa9d921bbc4b`
- Current stage receipt: `verification/receipts/2026-11-10-stable-357-publication.json` SHA-256 `A8936B33B8E617A20063301277C8E72B6DFC5A6D0E2195F6F698AEFD618A99F8`.
- Current artifact: Development Mobile 3.5.7 67817D880601E6574DB336CBD24F6124540F5FADEE152324CBF5FDAC528CD2B8 and PC 2.0.0 B2E128D6AAD2A820CC440F4B3F8E5EC8E15BFAF369D92CB3F37321A15AAB6B28. The publication receipt identifies the separately published bytes.
- Current scoped checks: Guarded Mobile and PC builds passed quick-block and settings-shortcut coverage. The scoped Mobile checks cover pointer preview, native comment pickers including reduced motion, article action fixtures and the narrow general-gallery rank window. Public comic_new6 on Chrome 157 with the injected Mobile build and GM shim verified opening and closing the original door/info/rank and actual rank paging at 980 and 390px, plus textcon entry. Two older drawer tests hit the same header interception before opening on the previous and current candidates. The public author click reached the native POST lookup, which was blocked by the probe. No account or live vote was submitted.
- Reviewable proposal: Adopted site/index/README and real examples are official. Nickname-fixed writer image is published on main/Mobile and Pages;public hash matches. Latest filename/version policy preserves single-digit components1.9.9→2.0.0.
- Local-only state: `LOCAL_ONLY_EVIDENCE`. artifacts/mobile-357-published has official receipt and public readback; testbed/artifacts/stable-357-canary binds startup evidence.
- Accepted baseline: Actual adopted memo/current v7 detail,pale paired-ink dark buttons,theme accents,inline services/categories and list-only unified plate/original scroll direction. Writer two independent media/HTML and font/link rows;phone nickname uses2 columns/readonly44px reserve. PC keeps native host layout.
- Last current audit: UNKNOWN for formal candidate acceptance. The earlier official publication remains independently verified.
- Blockers: No open publication task.
- Pending live checks: Popup animation timing and preview tracking in the installed user environment remain to be confirmed.

```dcuf-current-artifacts
{"schemaVersion":1,"mobile":{"sha256":"67817D880601E6574DB336CBD24F6124540F5FADEE152324CBF5FDAC528CD2B8"},"pc":{"sha256":"B2E128D6AAD2A820CC440F4B3F8E5EC8E15BFAF369D92CB3F37321A15AAB6B28"}}
```

## Pending real-use feedback —2026-11-03

Historical diagnosis below initiated this batch. The user subsequently authorized implementation of every item plus compact shared headers and reply-thread boundaries;ARTICLE_COMMENT_POPUP_REPAIRS.md owns current status. The old hold and unchanged-runtime statements are superseded.

- ADOPTED/implemented,pending final review:compact two-row article header on one very pale theme-tinted surface. Group title/headtext,then author/date and existing scrap/stats. Put the single separator below the complete metadata row;share the body's left baseline and remove stacked native/new top spacing. Long titles wrap;do not freeze a height or add factual content/actions.
- REPAIRED in current candidate,scoped checks:reply nickname moves right. Native reply_info > addbox is not projected as the content stack;its floated800px body displaces the inline author. Native-shaped replay placed body atx91 and author atx913.
- REPAIRED in current candidate,scoped checks:reply textarea stays927px inside a1343px input box because native small-form CSS remains. Previous checks proved containment only,not filling available width. Treat host visual fixed width as replaceable presentation,not an immutable behavior contract.
- ADOPTED/implemented:FAB should use the same pale common-button material as the other current controls. The previous dark-tint/white-ink exception is superseded for the next design;the current candidate uses common pale primary material.
- REPAIRED in current candidate,scoped checks:original900px article content starts at its container's left;development auto inline margins center it318px inward. Restore container positioning while preserving the author's explicit text/image alignment.
- REPAIRED in current candidate,scoped checks:comment last-row border plus native paging top border produce two lines;new row/date stacking,padding and footer spacing overexpand short/image-text comments. Keep one purposeful separator and content-sized height;do not shrink authored sticker art to mask spacing.
- REPAIRED in current candidate,scoped checks:category overflow popup is detached from its moved arrow;related-gallery popup is detached from its trigger. Qualify original popup containing block/anchor,scroll and wide-page changes together.
- REPAIRED in current candidate,scoped checks:comment nickname menu first exposes/flashes the native window and then appears far from its clicked author. Trace native opening coordinates and first-paint/owner timing;do not silently hide it or add a new portal/observer before diagnosis.


## Draft-complete checkpoint — 2026-10-21

- User-requested milestone: **초안 완성 / draft complete**, immediately before the actual UI replacement pilot. Code baseline: `b89f3ae26bb216ad39f1202fcb1c0cc738b3348b`; Mobile478A and PC C14D are the historical milestone artifacts; the broader repair artifact was1677; current follow-up identity is recorded above.
- Completed scope: Initial UI/function source separation, including the header closeout, and the diagnosed UI defect repairs within the recorded evidence scopes. `verification/receipts/2026-10-21-header-source-separation.json` and the progress routes below retain their actual checks and limits.
- Historical milestone: the four bounded header pilot scenarios and the first Concept01 prototype are now closed in their own receipts. Continue only from the current next action; all-child visual completion, six mixed criteria and raw admission remain separate.
- Resume via INDEX → CURRENT/NEXT; this historical draft milestone does not supply another task.

## Meaningful progress retained

These are scoped recorded results with explicit runtime identities. The composition row is478A coverage; palette3BC9 and older FD58 rows retain their historical scopes. Reuse only while direct runtime/oracle/fixture/harness/toolchain inputs are unchanged; global proof/continuity identities need their own qualification.

| Adopted result | Evidence route and limits |
| --- | --- |
| Real header layout trial implemented; native controls remain in place. | HEADER_LAYOUT_REDESIGN.md/current receipt: final144 mobile,8 layout,5 scroll,10 public images and actual-extension4+4. Larger title card costs height; all-child visuals remain separate. |
| Concept01 prototype and direction-aware original toolbar implemented. | CONCEPT01_TRIAL.md/current receipt: final144 mobile,26 PC,5 scroll contexts and actual-extension candidate4; separate readiness/palette prerequisites. Remaining child visuals are not approved. |
| Comment outer frame removed; four header replacement scenarios demonstrated on9889. | HEADER_REPLACEABILITY_PILOT.md + current receipt:12 comment contexts/30 fresh variant contexts, unchanged non-presenter bytes/native input/storage/resources,−80px negative and exact restore. Build-time header scope only. |
| Reported native UI batch and centered paging repaired. | UI_LIVE_REGRESSION_REPAIR.md:1677 broad repair (mobile144,203 focused checks, four semantic comparisons,16 image pairs, actual TM startup4+4);08BC paging follow-up (14/266). Each receipt keeps its own runtime scope. |
| UI/function source separation, including header, closed. | HEADER_SEPARATION_CLOSEOUT.md:38 boundaries, generated CSS/pure factories and body/layout checks;478A source evidence. Six mixed visual criteria/51 priorities remain, with no registry promotion. |
| Historical exact header qualification retains contrary evidence. | HEADER_STAGE_ADMISSION.md / HEADER_EXIT_QUALIFICATION.md / HEADER_CASCADE_FINALIZATION.md adjudicate only their478A raw palette failure. Their false-completion controls and live limits remain historical; no certificate for9889 follows. |
| Native header layout/palette repairs and phase ownership retained. | HEADER_COMPOSITION_REPAIR.md / HEADER_PALETTE_BATCH.md:3BC9→478A scoped CSS changes and preservation/native evidence;980 primary and390 stress stay distinct. No old inherited defect or blocker is silently revived. |
| Earlier15 integrated defects repaired within their scope. | UI_ALL_REPAIRS.md:FD58 mobile143, PC26, host11; published-control semantic comparisons and77 image pairs. These are historical fixture/state scopes, not all128 child states. |
| Early resets and typea applicability are retained for causal reasons. | HEADER_EARLY_RESET_ADMISSION.md rejects removal (142/143); HEADER_TYPEA_APPLICABILITY.md retains tested native context/unsupported paths. Frozen ledgers and phase contracts remain; do not delete them based only on source purity. |
| Actual extension testing works through an isolated reproducible route. | docs/live-site-canary.md: installed Chrome + official pinned TM5.5.0, fresh profiles and replay/cleanup. Parent successful runs are exact-runtime scopes. A missing public comment container is not a global capability/POST blocker. |
| Complete review inventory and chosen unified design remain routed. | UI_REVIEW_CHECKLIST.md has128 children/11 families. UI_DESIGN_REFERENCES.md binds Concept01; UI_REPLACEABILITY_VALIDATION.md governs its integrated trial. The bounded header pilot and first Concept01 prototype are complete; all-child visual approval is not. |
| User phone environment measured and adopted. | PHONE_VIEWPORT_PROFILE.md retains screen412/layout980/scale0.420684/DPR2.625 and proxy/input gaps.390/412 layout is stress. Remeasure only for changed device/settings, contrary evidence or a specific unresolved need. |
| Continuity/checkpoint cost is bounded. | VERIFICATION_EFFICIENCY.md + docs/checkpoint-workflow.md: exact continuity-only diffs use four document checks; unknown/runtime/mixed changes keep all repository validation. Checkpoint/CI scope is not product acceptance. |

## Resume discipline

Read INDEX → CURRENT/NEXT, fresh root/branch/HEAD/status and continuity inspector. Retrieve detail only for the action. VERIFICATION_EFFICIENCY.md owns proportional checks and the short do-not-revive record; historical proposals never become active by age or repetition. Checkpoint CI proves its own narrow scope, not product acceptance.
