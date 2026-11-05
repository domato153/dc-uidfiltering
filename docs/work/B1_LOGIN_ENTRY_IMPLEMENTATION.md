# B1 login-only implementation plan

Execute inline in the existing isolated development worktree. Spec: B1_LOGIN_ENTRY_PREFLIGHT.md; user approved the draft and implementation on2026-10-28. One bounded implementation/checkpoint,not one commit per file. Existing C-07 N/A and upload deferrals remain.

**Goal:** Apply the frozen B1 login draft to original sign login nodes while keeping authentication native and gallery startup absent.

**Architecture:** Hoisted login route/adapter/presenter functions run before the Mobile gallery bootstrap. A shared pure preset/base-CSS factory and Mobile pure material-CSS factory serve the existing gallery theme and new login presenter without starting ThemeModule on sign. Adapter alone owns DOM/GM-read/media readiness; presenter has immutable selector/style inputs and no host/state operations.

**Stack:** Existing JavaScript/userscript build,Node VM tests and guarded installed-Chrome Testbed. No dependency,version,GM key/grant or authentication change.

## Constraints and review focus

- Exact HTTPS sign /login or /login/ with native query/fragment only; no member_check,recovery/join,other host or iframe activation.
- No credential/cookie/hidden-value reads in product,no submit interception,no cloning/moving controls,no body lock/filter/menu/network/document observer.
- Palette may resolve or reject after disposal: fail open and prevent late writes. Missing/changed native form stays native.
- DOM-ready and duplicate injection must mount once. Native dark stylesheet takes precedence over system fallback; theme listeners are bounded/disposable.
- Reuse14 presets and preserve existing Mobile/PC CSS exactly where unchanged. Login source/reference geometry/hits/focus/native form semantics have separate evidence.

## Tasks and checks

### 1. Current controls,RED and candidate graph

- [x] Preserve1593/EF24 controls and exact source inputs locally.
- [x] Add original-shaped login fixture and guarded test runner. Watch current runtime reject the intended metadata/entry contract.
- [x] Add the candidate login/pure-theme components,relations and contract before product edits; retain existing mixed classifications and accepted registry.

### 2. Pure theme reuse and login implementation

- [x] Add `src/shared/theme-primitives.js`: hoisted frozen presets and original base CSS. Existing ThemeModule consumes it without value/CSS drift.
- [x] Add `src/targets/mobile/theme-material-values.js`: hoisted original material role CSS; existing target theme consumes it unchanged.
- [x] Add login presenter/host adapter. Presenter receives immutable native selector bindings and returns CSS; adapter validates original native form,reads only existing palette,owns ready/theme/duplicate/disposal and preserves every native control/handler/value.
- [x] Wire Mobile metadata and early branch with existing target capability guard,plus manifest/build inputs. PC gets shared primitives only.
- [x] Run GREEN and exact original/new pure theme CSS/preset comparisons; no golden refresh for unintended differences.

### 3. Settled runtime verification and rendered comparison

- [x] Guarded synthetic sign contexts cover routes,readiness,duplicates,faults,late disposal,media/native theme,14 palettes,original identity/Enter/checkbox and positive geometry/hits/focus.
- [x] Compare same-size light/dark source output to independent frozen targets; review whole/detail and retain intentional or unresolved differences.
- [x] Rebuild affected targets at existing versions. Select actual affected bootstrap/theme/forms coverage; exact preserved CSS/preset comparisons and the focused fresh-context PC palette consumer bound the pure extraction.
- [x] Reuse the known installed Chrome/Tampermonkey route for exact login metadata/query/hash execution without authentication; classify any environmental gap honestly.

### 4. Review,continuity and checkpoint

- [x] Fresh read-only final review; fix material findings and rerun only affected checks.
- [x] Record exact runtime/reference/receipt identities,current remaining gaps and one next task. Exact-path checkpoint is prepared; publication/CI disposition belongs to tools/checkpoint.mjs and is not pre-certified by this document.

Rulings/results are appended here or in the final receipt; ignored controls/raw captures stay under artifacts/b1-login-implementation-2026-10-28/. Scoped source implementation and verification are complete; formal all-UI admission and final user aesthetic adoption remain separate.

## Settled result

Mobile3.5.5 F87E31ED06E223E066913F5BC0063A8DA38009067BCA57E83CC9FB8CF64D47CB; PC1.9.9 8915F36E5B8887DC58EF9F932E39CCA28CCE1AC1020FD96460CCD10C08913581. Original nodes/parents,action/method/handlers and existing synthetic text/password values survive initial and duplicate mounting. Native Enter and save-code checkbox work. Missing form/style failure stays native; late resolve/reject and pre-ready disposal leave no login style/root state. Ready/media/pageshow listeners restore; timers/frames return to the existing harness baseline,not a fabricated zero. Product never reads credentials/hidden values/cookies or submits authentication.

The login contract passes48 observations: six layout/theme contexts,28 palette/theme contexts,five unsupported routes,seven readiness/fault/theme contexts and two delayed-disposal outcomes. Layout includes980×900,adopted980×2306 proxy and390×560 stress. Every layout has seven positive original-control hits,visible keyboard focus and no horizontal excess. Actual scale,DPR,engine127 and touch/password-manager integration are not reproduced.

Pure theme extraction retains exact Mobile target CSS,full mounted Mobile/PC CSS,14 preset records and normalization against preserved1593/EF24. The existing source metadata test covers4 positive/7 negative routes. Actual installed Chrome156.0.8078.48 with fresh-profile official pinned Tampermonkey5.5.0 installs the exactF87E bytes through public Utilities UI. Five exact login/query/hash forms execute; four unsupported auth/recovery/join/foreign-origin documents remain untouched. Chrome resolves the HTTP attempt to the exact HTTPS login document,where execution is correct; direct HTTP extension applicability is N/A in that run and remains covered by the separate source negative. This is extension execution on public native-shaped replay,without GM shim/script injection,not live authentication. Profile/vendor copy and owned Chrome are closed/removed.

The160 Mobile tests completed once with no failures before the user's scoped-testing correction. Host compatibility finishes11/11; its initial10/11 was an oracle-path failure after moving preset authority,corrected to read the new source plus verify its presenter consumer. The remaining PC check is only the directly affected palette registration,1/1; no PC full suite or unrelated filter differential was added. D-55/AGENTS/VERIFICATION_EFFICIENCY now require actual dependency impact selection,not automatic full execution of conservative fallback. No160-test rerun for subsequent docs/oracle-only changes.

Four selected whole/detail image comparisons show differences and are image-bound REVIEWED,productApproved=false. Light composition and control details retain the draft. Reference's15px classic scrollbar shifts its centering7.5px; do not manufacture a width defect. Dark uses canonical current B1 paper/rim/sheen rather than the proposal's older hardcoded brighter glare; this is explicit family reconciliation,not exact pixel fidelity or final aesthetic approval. The ordinary login page has no fabricated modal backing. A separate neutral optical probe transmits14 light/10 dark RGB levels through the actual card while fields remain unchanged(0); normal captures remain beside this labeled diagnostic. Viewer light/dark images all decode980×900 and load only the selected pair.

Read-only independent review found no product blocker. Its synthetic prefilled-value and delayed-rejection/pre-ready-disposal/resource gaps were added to the focused final contract. One Chrome job at a time and4GiB floor were retained; observed free RAM stayed above12GiB at sampled boundaries. CUA tab binding was unavailable in this turn; working CLI Chrome/TM execution is separately proven.

Receipt: verification/receipts/2026-10-28-b1-login-implementation.json. Raw controls/captures/reports stay ignored. Accepted registry remains unchanged; candidate map adds login/pure-theme ownership honestly and preserves existing mixed debt. No version,GM grant/key,authentication or official release change.

## Remaining boundary

Real account submission,conditional CAPTCHA/auth errors,password-manager integration,native dark-script variants and actual phone remain unqualified. Whole-UI/header admission and named unobserved child states remain open; the next bounded action is to reconcile existing B1 coverage and inspect only genuine gaps. C-07 image replies remain N/A; four separate editor upload documents remain user-accepted deferrals. Do not repeat already-covered families or run unrelated product suites.

Checkpoint follow-up: original public fixture indentation/trailing spaces failed Git whitespace checks. Only invisible fixture whitespace was normalized; the focused48 login observations were rerun and light/dark PNG bytes remain identical,so the existing image comparisons and unrelated159 Mobile registrations are reused. Actual-extension replay was refreshed. Its requested-HTTP oracle initially failed because it did not read the final URL; observation proved an exact HTTPS resolution. The corrected oracle strictly validates requested/final URL and distinguishes N/A direct HTTP from valid HTTPS execution. No product/source artifact changed and no full browser suite was repeated.

Exact-tree verification follow-up: the new login marker/checkpoint is now registered in the closed surface schema. Source-extract VM checks load the actual hoisted material/include dependencies; they retain the existing ownership digests and negative assertions. The governance owner-removal negative now selects a non-policy owner explicitly instead of assuming decision index1,so the mandatory-policy guard cannot mask that test. D-54/D-55 use the existing decision-field schema. These are directly affected verifier/document consumers,with no product artifact or full-browser rerun.
