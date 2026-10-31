# Development-only native gaejuk suppression

User scope: block the DCInside nuisance mascot in the current development implementation; preserve published/stable, authored dog photos, image comments and DCCon.

Primary research: the maintained [gallery filter](https://github.com/hooray804/adguard-gallery-filter/blob/main/filter.txt) uses `gall.dcinside.com###gaejukimg`. Anonymous public article6778319 also contains a body-level `DIV#gaejukimg`. Its native script changes moveimg_off to moveimg and appends a separate transparent full-window `.click-blocker` after the mascot. Merely hiding its picture would leave that click obstruction. Public writer inspection found neither target.

The existing mobile core ad stylesheet owns two exact body selectors: `body > #gaejukimg` and `body > #gaejukimg ~ div.click-blocker`. It hides both without removing native nodes/listeners. Existing eager CSS covers initial and late nodes/state changes; no observer, timer, network interception, global-function patch or metadata expansion is added. PC uses its separate module. Native effect styles remain untouched; this is not an entire anti-adblock engine.

The focused contract covers major list/view, minor list and mini view across light/dark and master-disabled states. It exercises initial, toggled and reinserted markup, positive hit-testing and actual local clicks, decoded authored dog/DCCon media, and a visible nested unrelated class. Before-rule failure and after-rule results are retained locally. This source-fixture evidence does not certify real-device/extension use or future native markup changes. Final current runtime and checks are bound by the common-control receipt and CURRENT_STATE.md.
