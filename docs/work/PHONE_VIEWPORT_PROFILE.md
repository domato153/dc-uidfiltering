# Observed phone viewport and reproducible layout proxy

Observed 2026-10-18; source checkpoint base `d4b164fbe60a122a65121b6c864cc43fe7fe5fca`. Status: `OBSERVED_PHONE_VALUES / PASS_LAYOUT_PROXY`; exact-device and whole-UI admission remain UNKNOWN. No production source, runtime, version, native site, normal browser profile or stored setting changed.

The user supplied the output of the delayed `dcuf-viewport-v2` console probe. The probe measures after the developer tools/keyboard can be closed, then exports a local JSON. It does not collect cookies, account data, page text or full URLs. The original input is preserved locally as `artifacts/phone-calibration-2026-10-18/input-original.json`, raw SHA-256 `FD9FD10E0D06033F7E112A21B8B9A0882DACC1C646E3A3960C8B4111CF9A6443`. Its `topFrame` is true; exact route/script identity and document compatibility mode were not included. Do not invent these missing fields.

## Actual readings

All sizes below are browser-reported CSS pixels, not physical screenshot dimensions.

| Field | Observed value |
| --- | --- |
| Screen | 412 × 1006 |
| `innerWidth` / `innerHeight` | 980 × 2306 |
| Root `clientWidth` / `clientHeight` | 980 × 2002 |
| Visual viewport | 979.8095092773438 × 2306.4462890625 |
| Visual viewport scale | 0.420684278011322 |
| Visual offsets | 0, 0 |
| DPR | 2.625 |
| Maximum touch points | 5 |
| `(pointer: coarse)` / `(hover: hover)` | true / true |
| Root/body CSS zoom | 1 / 1 |
| Root/body text-size-adjust | auto / auto |
| Viewport meta | width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes |
| Reported UA | Desktop Linux x86_64, Chrome127.0.0.0 |

This supersedes the earlier *unmeasured* phone width/scale limit:390 is not the normal-use layout assumption; the observed layout width is980 and the screen width is412. Retain390/412 layout captures only as responsive stress. The old980 × 2100 / screen412 × 915 / scale1 gallery is still an older proxy, not a capture of this measured condition. One reading does not certify every route, pinch/rotation/keyboard state or OS/browser font behavior.

## Tested layout-proxy recipe

Local `layout-profile.json` and `profile-validation.json` under the same artifact directory bind the measured input and tested recipe. Browser: Chromium149.0.7827.55. UA spoofing to127 does not replace its engine. The context is fresh and isolated.

```js
const browser = await chromium.launch({
  headless: true,
  args: ['--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=2,availableHoverTypes=2,maxTouchPoints=5,forceTouchEventFeatureDetectionForInspector=true']
});
const context = await browser.newContext({
  viewport: { width: 980, height: 2306 },
  screen: { width: 412, height: 1006 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: false,
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
});
```

`hasTouch:false` is intentional in this recipe: Playwright's usual touch override changes the observed combination to touch1/hoverfalse. Native renderer settings preserve touch5/coarse true/hover true without replacing JavaScript getters or media-query APIs. Existing Playwright `page.touchscreen` helpers must not be used with this context flag. A separate CDP `Input.dispatchTouchEvent` start/end on the controlled fixture produced a trusted pointerdown with `pointerType:touch` and a trusted click. This is a bounded event-delivery check, not DCInside functional or actual-extension evidence.

The controlled fixture matches screen, inner dimensions, root width, DPR, touch count, coarse/hover media, meta, root/body zoom/text-adjust and UA. Its standards-mode root height is2306. No host DOM, meta, candidate CSS, prototype or browser readback getter was modified to manufacture a match.

## Contrary evidence and remaining fidelity

- Native viewport/page-scale/visible-size/crop combinations and renderer viewport flags did not produce the phone's0.420684 visual scale in this browser. The validated wide layout proxy still reports scale1. Store the actual phone scale as a rendering reference, never relabel the proxy as exact zoom reproduction. Screenshot/output scaling alone is not a native visual-viewport match.
- The phone's clientHeight2002 differs from innerHeight2306. The probe omitted compatibility mode and relevant root/body geometry; the cause is UNKNOWN. A separate quirks-mode fixture shows root client height can follow content, so do not automatically blame browser chrome or hardcode a304px toolbar.
- Browser engine127 versus149, OS fonts, keyboard/browser bars, and all actual extension states remain separate. No real-site or extension execution was added by this calibration.
- Native browser settings are exploratory and must be reread after launch; silent flag/command acceptance is not evidence. The rejected variants remain in local `variants.json`, `blink-variants.json`, `native-window-variants.json`, `mobile-style-variants.json`, `native-scale-variants.json`, and `wide-input-variants.json`.

The method uses current [CDP Emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/) and [Chromium renderer settings](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/frame/settings.json5). Their local transfer is the measured readback and trusted-event receipt; API documentation alone does not certify this phone. Continue affected visual inspection with the calibrated980 layout and retain explicit scale/height/engine differences. Do not rerun unchanged functional suites just for this observation, or promote old proxy screenshots to actual-phone evidence.
