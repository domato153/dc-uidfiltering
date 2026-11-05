# B1 login entry preflight — 2026-10-28

Status: **PREFLIGHT_READY / PRODUCT_UNCHANGED**. Operate extension of the adopted B1 family,not a replacement visual world. Source base `484e0900e47b8576cf5203a7a559811fba63ffca`; current Mobile1593C0F7 and PC EF24D41D remain unchanged. This bounded task produces the original anatomy,independent proposal and entry/ownership plan before runtime edits.

## Original and current evidence

Opened the public `https://sign.dcinside.com/login` without authentication. It redirects to `/login?s_url=https://www.dcinside.com/`. Original document has no viewport meta. The original browser layout readback was1280×720; the authoritative same-layout original/proposal captures are explicit980×900 PNG. No credential,hidden value,cookie or account state was read; the local public anatomy omits all input values,scripts,iframes and advertisement contents.

- Root: `#top.width868.login_wrap`; `.dcheader.bg > .dchead > h1.dclogo` contains the native home wordmark and login link. Main: `#container > .content.login` contains `.con_box.login_page.kap_codewrap`,with `.login_inputbox > .inner > form` and separate `.ban_box`. Footer: `.dcfoot > .info_policy` and `.copyright`.
- Native form: POST `https://sign.dcinside.com/login/member_check`,`onsubmit="return login_submit();"`. Hidden names: `ci_t,s_url,tieup,url,ssl`. Visible controls: `#id[name=user_id][type=text][maxlength=20]`, `#pw[name=pw][type=password][maxlength=40]`, original submit button and `#checksaveid[name=checksaveid]`. Both visible text/password fields have no autocomplete attribute; preserve that fact rather than adding a password-page normalization.
- Keep native security indicator,save-code option,find-code/find-password/join links and public policy links. Do not replace authentication,serialize credentials,change hidden/return values or intercept submit. Separate join/recovery documents are not included by a login-page skin.
- Current development metadata has only the three gall board matches. A minimal isolated VM executing the exact1593 artifact at the sign login URL reaches `other` and performs no style,timer,observer,GM,menu or network operation beyond the existing page-context attribute. This is an entry probe,not browser/authentication qualification.
- Preserved published-stable3.5.5 snapshot `testbed/artifacts/baseline-mobile-stable.user.js`,SHA256 `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`,also has no sign metadata. It is an exact preserved comparison source,not a claim about a freshly downloaded latest release.

## Independent proposal

Recipe: `docs/design/b1-login-proposal-2026-10-28.css`,excluded from production build. Images:

- Light: `docs/design/b1-login-proposal-light-2026-10-28.png`,SHA256 `0A3A0981B90BEF65909B6F0F34B4CA3143FAAEC422D48736E845A3CAC9E41B6A`.
- Dark: `docs/design/b1-login-proposal-dark-2026-10-28.png`,SHA256 `2F4EDE282109402C5AF3FFAAF8EF9091ECEB7B9653DB368ED457256EBC4D21C4`.
- Region: **compact native wordmark header,translucent login-card exterior,opaque original fields and C885 primary action**.

Derived from the current B1 normal-page glass family and simple button roles,using representative teal. The native hidden legend supplies the visible login heading; no invented product copy,header navigation,settings controls or extra authentication fields. The separate advertising pane is visually omitted. Native security ON sprite remains recognizable. Inputs remain opaque paper; glass belongs to the header/card exterior. Login is a page,not a modal: no scrim or background content is invented to exaggerate transmission. Synthetic dark is a theme proposal,not an observed native dark login document.

The source-shaped local reconstruction has no login script or meaningful hidden values and prevents all form submission. It is an independent draft,not implemented-product evidence,an approved golden or final user aesthetic adoption. The family reference remains `b1-glass-ordinary-target-light-2026-10-27.png`/95B99AE7; these login images are the provisional derived comparison targets for the following implementation.

Batch inspection caught native white wordmark/link rules,`legend.blind` visibility,hidden custom-checkbox face/spacing,dark copyright ink and868px footer-child widths. The recipe corrects their actual native cascade and retains zero authored important declarations. Six proposal-only contexts (light/dark at980×900,980×2306 and390×560) now have no horizontal excess and positive hits on all seven rendered form/input/recovery controls. The980×2306 context is the adopted phone layout proxy;390 is stress. This does not qualify live handlers,full accessibility or actual device scale/input. The viewer loads its two themes/four image instances (three unique images) without broken images.

## Entry approach

**Selected plan:** one login-only Mobile adapter and pure presenter,selected before the gallery boot lock and initialization. Reuse the existing14 palette values/base material through the smallest pure factory extraction; do not start `ThemeModule`,the settings UiPort/store or gallery filtering on sign. Functions used before the early return must be hoisted/self-contained: later const modules are in their temporal dead zone or never initialized. Presentation consumes a frozen palette/theme snapshot; only the adapter reads the existing palette key. It never reads input values.

The official [Tampermonkey metadata documentation](https://www.tampermonkey.net/documentation.php?locale=en&q=include) supports anchored regular-expression includes and warns about imprecise wildcard includes. Candidate minimal scope is `@include /^https:\/\/sign\.dcinside\.com\/login\/?(?:\?[^#]*)?$/`,plus an independent runtime check of HTTPS,exact hostname and `/login` or `/login/`. It excludes `/login/member_check`,recovery/join and other hosts. Query redirects remain native. The exact directive's query/hash behavior still needs the known installed Tampermonkey5.5 route; a JavaScript matcher table is not that extension proof. No new grant,require,run timing,storage key or general sign-domain match.

Rejected: adding metadata alone (current bootstrap still returns other),running the gallery boot on sign (unneeded body lock/filter/menus/observers),copying palette/material literals into a second product owner,or a separately installed login script with divergent settings. Official match-pattern syntax alone does not prove this userscript's execution/initialization behavior; local/native evidence remains necessary.

## Next bounded implementation

1. Before source/build ownership changes,create a candidate overlay for the login adapter/presenter and minimal pure theme input. Inspect actual accepted components and preserve existing mixed classifications; no direct accepted-registry edits or broad theme rewrite.
2. Add the exact Mobile-only metadata and early login branch. Other origins/routes retain existing behavior. Mount no body lock,boot overlay,filter/menu/network/document observer. Use at most one once-only DOM-ready entry,duplicate guard and original native readiness; missing/changed login roots fail open to the untouched site.
3. Keep existing palette key/default/14 IDs. Pure shared theme extraction must preserve gallery and PC CSS/values. Login theme uses native dark state when present; the system-theme fallback on sign must be explicit and tested,without reading authentication cookies or adding a saved setting.
4. Apply the proposal through the dedicated owner to the original nodes,including actual native background/logo/legend/checkbox/footer cascade. Preserve types,names,hidden fields,parents,handlers,form destination,security state and password-manager behavior. Leave conditional CAPTCHA/error additions native until observed/modeled; no invented controls or actual credentials/submit.
5. Add source-shaped positive geometry/label/hit/focus and synthetic native-form witnesses,exact-route/unsupported-route/duplicate/DOM-ready/failure checks,light/dark and all14 palette bindings. Compare original/preserved stable/current boundaries in fresh contexts. Run relevant bootstrap/theme/form tests,PC checks if shared values change,and the required settled-runtime coverage once; do not inherit prior107 or8-test counts as new login coverage.
6. Render current product against these independent light/dark targets at the same viewport. Inspect whole/detail and record concrete intentional differences; no self-generated pixel equality as approval. Qualify the precise actual Chrome/Tampermonkey login entry separately,without authentication. Update current/checklist/receipt and checkpoint only the development branch.

## Recovery and limits

Local evidence: `artifacts/b1-login-preflight-2026-10-28/`; user viewer: `http://127.0.0.1:10067/login-preflight/index.html`. Public original CSS was bundled from reset.css,login.css,common.css and popup.css. Ignore the first truncated deep-tree extraction and initial draft failures; the final sanitized JSON is complete and the raw failed images/checks remain local. Missing ignored files are recoverable by public read-only inspection and the tracked anatomy/recipe,not grounds to reopen completed P4 work.

Receipt: `verification/receipts/2026-10-28-b1-login-preflight.json`; CURRENT_STATE.md binds its digest. No source/build/metadata/accepted registry,release version,user settings or actual authentication changed. C-07 image replies remain N/A. Four separate editor upload documents remain user-accepted deferrals.
