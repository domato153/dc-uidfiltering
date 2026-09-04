# DCUF current state

## Accepted baseline

- Development branch: `codex/mobile-development`.
- Behavior source: `cef5f71381116d2746b0319b2f8e609e8d7eae85`.
- Accepted characterization commit: `b3e247f78d67bca4ad46bf7b35e7dd07c008cf3d`.
- Mobile beta SHA-256: `A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343`.
- Mobile stable 3.5.5 SHA-256: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- PC 1.9.9 baseline SHA-256 at the behavior source: `D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212`.

## Accepted characterization

- Phase 1 governance, registry, impact routing, skills, locked toolchain, and hosted-runner workflows are committed.
- Mobile guarded runtime `BB9A847B5FBB76CADC87D7CA6BFC97AB639D77E4BC2E1C9C4F11B53425FCB296`: 96/96 full and 11/11 host compatibility passed.
- PC guarded runtime `5852A579F00D83E3C166B78B09B4843E11AE2A19E1BBAD48F8CC94DB28636104`: 13/13 target-applicable functional tests passed.
- Wrong-head, stale-harness, and wrong-artifact mutations were rejected.
- One narrow pre-existing contract repair is declared: Chromium parser replacement can remove the provisional document-start lock; bootstrap now restores it before paint and disconnects its repair observer at terminal state.

## Active phase

- Phase 2: introduce `UiPort`, immutable snapshots, typed intents, disposable UI scopes, and a legacy adapter before moving owners.
- Current mixed ownership is recorded in the accepted registry; UI-port debt remains explicit.
- The discarded broad UI/login redesign and dirty checkout are excluded.

## Evidence status

- Exact beta/stable normalization and repository release checks: passed.
- Characterization receipt: `verification/receipts/2026-09-05-characterization.json`.
- July live evidence is historical and may be stale.
- No live canary has been claimed for this refactor.

## Resume rule

Recheck fresh refs, HEAD, worktree status, active candidate overlay, impact receipt, fixture/harness hashes, and generated artifacts before continuing.
