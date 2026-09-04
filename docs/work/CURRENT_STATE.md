# DCUF current state

## Accepted baseline

- Development branch: `codex/mobile-development`.
- Behavior source: `cef5f71381116d2746b0319b2f8e609e8d7eae85`.
- Accepted runtime/build commit: `a653252005dd4ad6bf101cd77d40ec8ab0995ca0`.
- Mobile beta SHA-256: `A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343`.
- Mobile stable 3.5.5 SHA-256: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- PC 1.9.9 baseline SHA-256 at the behavior source: `D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212`.

## Active phase

- Phase 1: GitHub governance, semantic registry, impact routing, skills, toolchain lock, and hosted-runner workflows.
- Runtime semantic delta: none.
- Current mixed ownership is recorded in the accepted registry; UI-port debt remains explicit.
- The discarded broad UI/login redesign and dirty checkout are excluded.

## Evidence status

- Exact beta/stable normalization and repository release checks: passed.
- `cef5f71` Playwright smoke: feasibility pass only; full characterization must run on the settled locked harness.
- July live evidence is historical and may be stale.
- No live canary has been claimed for this refactor.

## Resume rule

Recheck fresh refs, HEAD, worktree status, active candidate overlay, impact receipt, fixture/harness hashes, and generated artifacts before continuing.
