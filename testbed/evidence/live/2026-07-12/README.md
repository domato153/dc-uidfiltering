# Live evidence captured 2026-07-12

These files are fixture provenance and regression evidence captured from DCInside with the production userscript either explicitly disabled (DOM probes and hidden baselines) or enabled (churn and hidden comparisons).

## Accepted evidence

- `major-list-probe.json`, `major-view-probe.json`: major gallery list/view DOM reports with the userscript disabled
- `minor-list-probe.json`, `minor-view-probe.json`: minor gallery list/view DOM reports with the userscript disabled
- `major-image-comment-probe.json`, `minor-image-comment-probe.json`: redacted live-backed structure for the separate article image-comment area
- `major-write-form-probe.json`, `minor-write-form-probe.json`: userscript-disabled desktop write forms, including guest fields, hidden submission contract, category/captcha differences, and Summernote-shaped editor DOM
- `native-mobile-write-form-probe.json`: corrected native mobile write-form reference with `form#writeForm`, responsive geometry, compact toolbars, and attachment/editor structure
- `major-comment-churn.json`, `minor-comment-churn.json`: userscript-enabled idle versus style-triggered DOM mutation measurements
- `minor-list-hidden-compare.json`, `minor-write-hidden-compare.json`: same-URL OFF baseline versus ON comparison; both confirm that the hidden survey row is mirrored visibly while advertisement mirrors remain hidden

The captured page text and URLs are test evidence, not fixture assertions that must remain byte-for-byte stable as DCInside content changes.

## Superseded

`superseded/` contains the first hidden-row comparisons and the first native write probe. The native probe captured `root.id` as `{}` because of a collector serialization bug; its corrected recapture is the accepted file above. Superseded files must not be used as pass/fail evidence.
