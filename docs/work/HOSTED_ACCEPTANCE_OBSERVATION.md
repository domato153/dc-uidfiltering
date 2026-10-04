# Hosted acceptance observation: exact cda1087 candidate

This is a durable factual projection, not a PASS receipt, failure diagnosis, or permission. The original run remains failed. Observe a newer run separately rather than overwriting this source/result binding.

## Identity and scope

- Source HEAD: `cda1087c819c6006d7340761a72bd37336acbd44`.
- [Acceptance run 37151893820](https://github.com/domato153/dc-uidfiltering/actions/runs/37151893820), [full-acceptance job 111288386195](https://github.com/domato153/dc-uidfiltering/actions/runs/37151893820/job/111288386195): FAILURE; finished 2026-10-04 05:45 KST.
- Acceptance artifact: ID `11285180134`, name `acceptance-cda1087c819c6006d7340761a72bd37336acbd44`. This is synthetic Chromium/Testbed coverage, not an actual-extension/live-site run.
- Mobile root/dist/guard: `689A66DFBA738CC3325BE85CD3E1EA53E4AE3089A3454CAF5CC69BC657D3E0DD`; PC root/dist: `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`. Browser `149.0.7827.55`; Node 22.17.0, pnpm 10.33.1, Playwright 1.61.1.
- Separate [push checkpoint 37151891312](https://github.com/domato153/dc-uidfiltering/actions/runs/37151891312): SUCCESS for this source. Policy/affected jobs also succeeded; none changes full acceptance to PASS.

## Observed failure, not inferred cause

Exactly one acceptance command failed: `mobile-observed-palette`, exit 1, equivalent false. The 22 observations per side contain 3 semantic differences and 14 raw differences. All semantic differences are `settled-resources`: index 5 / failureMode none, 12 / write, 18 / read.

In each, control subscribers are `filter-universal-observer`, `ui-list-runtime`, `header-drawer`, `list-memo-popup`. Candidate adds `header-shell-style`, `gallery-page-head-style`, `header-gnb-style`, `header-recent-visit-navigation` between the first two and last two. Listeners are 188 control versus 170 candidate. Both sides have 0 timers/frames/intervals/task queues/pending mutations, 5 active observers, false pending mutation RAF/timer, filterPassKinds `["observed-items"]`, and no errors.

The current observer permits non-increasing numeric resource counts but requires the remaining projection, including subscriber arrays, to match. Thus lower listeners do not themselves cause this comparator failure; they are still a behavioral/lifecycle attribution question. Aggregate equality/reduction alone cannot establish retained native listeners, safe cleanup, or a product regression.

Maintenance notes record a historical C84/32BA list-route four-owner classification. `tools/classify-palette-owner-split.mjs` hardcodes that historical pair; the hosted control is A030 at `cef5f71381116d2746b0319b2f8e609e8d7eae85`, and candidate is 689A. Do not bypass its exact-byte/binding checks or promote its old conclusion. Current classification remains UNKNOWN pending exact-pair positive event/focus/storage/network and owner disposal/reconnect/duplicate-connect evidence plus negative controls. The six historical C84 view timer fields and old popup timeout remain independently UNKNOWN.

## Positive results and limits

The other 16 acceptance commands exited 0, including recent-title/GNB, list/article/comments/native-form comparisons, mobile full suite 137/137, host compatibility 11/11, PC palette and PC functional 14/14, both builds, guard restoration, and repository checks. PC 14/14 hosted is not the prior local full 25/25. Policy reported 124 rejected mutations, 26 valid controls, and 27 governance groups passing.

List/article/comments/native-form comparisons have 0 semantic failures and respectively 16/22/36/25 invariant improvements. The separate baseline editor diagnostic retained 0 pass / 1 fail ("Android-filtered font menu must be restored") as continue-on-error; it is not an additional candidate acceptance failure. Positive commands do not erase the failed palette gate or close header/34-ID/live/upper assurance.

## Raw evidence, verification, and recovery

Same-host ignored download root: `artifacts/handoff-hosted-cda1087/`. Never stage raw downloads. Raw SHA-256 identities:

- `artifacts/acceptance-result.json`: `ff39fdae5fe856a359bb631efd02cc6b8f49f3a15ece9107c1d072e0ab064478`.
- `artifacts/ci-manifest.json`: `53cd13beb576b0c31bde3963150a8d457699c1c7be5738a0ef0b7521edfe5149`.
- `artifacts/acceptance-observed-mobile-palette.json`: `4928777d1b41b3c3a538c13844e7021b670b3ad3ed85b323f2a5e9dbc2a4ed1c`.
- Side reports: `testbed/artifacts/acceptance-observed-mobile-palette.json.control.json` and `.candidate.json`. Embedded observation digests are control `232FA17966B94C39476A3790828E1958364B589CDA8DB5A1011AC11C5B529328`, candidate `CD7BDFE58036A17869B4F8D8BA77A7EA63A449308A0F543027DE91ECA03D8B6F`; these are observation-array hashes, not side-file byte hashes.

Palette observer digest: `B26315F882E0FA307712AD8B828147B6DFB31560E4D653486AAF6DFDD48FFDE9`. Evidence binding: sourceInputs `f06ae5000594c87795ca2169411f1b75a3329841fd62956d687b1ae654c87723`, harness `98df71cc6033f89cd417036d6dd3175cef8d6a6f8d3c41436d7474216c750b09`, fixtures `f7d8cfa2e3f9c4f94a2e97735b9ad58b96880fe3af8407933a80645fa3047bc2`, proofSystem `7ff08e44d9a8387c5d8b49f0ca097560a3adaf4cecccf126d2818d10b50d5bc3`. Compare current relevant dependencies rather than requiring every later documentation-only HEAD to equal cda.

If files disappear, re-download the named original run artifact while available and verify these hashes. If unavailable, preserve this factual failure projection but keep raw-dependent adjudication UNKNOWN; collect a newly bound observation for a new claim, never regenerate the old execution trace. Historical local control/replay archives have their own recovery limits in NEXT_TASK.
