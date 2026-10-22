# B1 native header/list repair — 2026-10-23

The diagnosed batch in UI_VISUAL_REVIEW.md is repaired through the existing visual owners. Source base `e837eb62e9c0eb42db504218cc42dcf4672bc0da`; mobile3.5.5 `8606114FA2A2D7E242197A711277F375EFD626F77CEA22759D951B58A15310C2`, PC1.9.9 `5FA25756` unchanged. Exact results and input hashes belong to `verification/receipts/2026-10-23-b1-visual-repair.json`. This is a bounded repair and agent visual review, not user aesthetic approval, whole-UI acceptance, raw admission, registry promotion or release.

User feedback at handoff: the actual result still looks approximate beside Expected. This unit verifies native composition transfer, diagnosed-breakage repair and preserved behavior; typography/weight, icon consistency, spacing, button proportions and material finish have not received a systematic design-detail pass. Do not dismiss those feasible details as prototype-only or claim B1 design completion. The work was actual B1 adoption, not a throwaway arrangement-only mock; the acceptance emphasis was too narrow. Existing presentation boundaries permit further refinement. Pixel comparison locates differences but does not judge beauty. Next: review feasible detail differences before choosing another surface; no new runtime change follows from this clarification alone.

| Diagnosed problem | Final disposition |
| --- | --- |
| Disconnected header/GNB and large gallery title band | Existing native chrome uses one compact desktop grid; narrow chrome stacks predictably. Gallery title/tools share a wide row. Original links remain accessible. |
| Grey dark inactive tabs and duplicate recent arrow | Existing presenter selectors now match the actual native ancestry. Inactive tabs stay quiet; the original sprite is hidden and one indicator remains. No extra override phase. |
| Native green promotion overlaps/clips controls | The same original dismissible tip is a small themed lower-left notice. Visible bounds, pointer hit and original dismissal are checked; no replacement controller. |
| Tall/wrapped toolbar and long categories | Desktop tabs/categories/actions share one row; narrow groups use two rows, very narrow controls stack. Three category slots scroll horizontally; original overflow menu remains. Actual barca toolbar70px at980 and116px at390 versus110/258 before. |
| Blue recent selection and empty popup interior | The original popup gets soft tabs, one outer padding, content-sized list and in-flow footer. Actual one-entry popup159px. Native navigation/delete/tab/display ownership remains. |
| Dense list information | Inset opaque reading surface and11px metadata. Native combined author/statistics column remains; fields are not hidden to imitate a mock table. |

Expected contains prototype-only table headings, simulation controls and a different recent-menu structure. These are deliberately not invented in the native product. Native service links, original brand, gallery tools, menu button and actual content remain. Eight native navigation links can occupy two small lines within the desktop navigation slot. This is an explicit adaptation of B compact/B1 material and hierarchy, not pixel equality with the simulator. All14 palette IDs/settings remain; no default-color change.

## What the comparison actually contributed

The first native-cascade repair passed the focused behavior suite, but direct image comparison still exposed a blue selected-tab pseudo underline, nested padding and a native minimum-height block. Those were repaired before the final runtime. Independent review then found a fixture-only accessible `.blind` label rendered as visible text; host concealment was modeled and the affected controlled pairs regenerated. Actual public captures already concealed that label. The method therefore found defects beyond functional counts; it does not automatically judge beauty or discover every defect.

Two comparisons are retained: approved mock versus actual public Chrome155 (six design states), and defective945C3DE7 versus8606114F in separate fresh Chromium149 contexts using the same fixture (six states). The official Playwright report returns differences for all pairs, as expected from changed composition/content. `productApproved:false` is preserved; differences are manually disposed above, never turned into a new golden or a beauty score. Opened final viewer images both decoded980×900 at equal display scale. Native final light/dark/recent/narrow images and980×2306 phone-layout capture were directly inspected.

```powershell
node tools/visual-review.mjs --manifest verification/visual/b1-repaired-native-list.json --output artifacts/<new-design-report>
node testbed/run-b1-visual-capture.mjs --require-runtime-under-test --control artifacts/<exact945-control>.user.js --output artifacts/<new-paired-captures>
node tools/visual-review.mjs --manifest artifacts/<new-paired-captures>/pairs.json --output artifacts/<new-paired-report>
```

Local final evidence: `artifacts/b1-repair-2026-10-23/`; paired captures/report use `paired-accepted` / `paired-accepted-report`; design report uses `design-report`. Public anonymous barca GET/HEAD captures use a GM shim and are separate from installed Chrome155 + official Tampermonkey5.5.0 smoke startup evidence. Neither establishes authenticated/actual-phone input. The adopted phone is layout980×2306;390 is stress. Missing ignored captures require recovery or fresh correctly labeled evidence, not reuse of another runtime.

## Preservation and failure classification

Only existing presenter CSS and immutable adapter selector descriptions changed. Shell/recent builders take14/24 named slots; raw pure-boundary checks cover four builders/46 slots. Historical full-CSS checks use the exact declared B1 inverse; they do not certify current appearance. Existing architecture overlay is extended; accepted registry and event/filter/storage/network/observer owners remain.

The original full run was140/144: two obsolete visual contracts (full-width toolbar/colored divider), and two transient theme-color mismatches that passed unchanged in isolated reruns. Replace fixed theme sleeps with completed CSS-transition observation while retaining exact color/contrast assertions. A later143/144 run exposed an obsolete all-categories-in-viewport oracle; require clipped visible geometry plus scrolling and trial pointer clicks for every original category. Its narrow follow-up exposed a fixture-only open page-size layer; an independent before/closed probe reduced the action group283.6→183.6px. Model the native initially closed option state; do not hide a product defect with looser hit/overlap assertions. Preserve all original failure logs.

The immediate control/candidate comparison covers16 behavior/invariant observations and four exact settled-resource records. Transient samples retain timer/frame differences; no blanket resource normalization is claimed. The earlier published-control +8-listener failure remains historical and unwaived. Remaining article/comments/write/dialog redesign, all128 child review, whole-masthead motion and formal mixed/upper/release qualification remain separate.

Final result: one complete run passes144/144 on8606114F with the final fixture/harness; seven B1 contexts/28 palette-theme bindings, eight header-layout contexts, five toolbar-scroll contexts and four pure builders/46 slots pass. Installed Chrome/Tampermonkey smoke passes published-control3/candidate3 and independent replay. These counts cover their declared scopes and do not turn the12 expected image differences into pixel matches.
