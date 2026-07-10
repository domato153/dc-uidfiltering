---
name: dcuf-release
description: Build, version, promote, or verify DCUF mobile and PC release artifacts. Use only when the user explicitly requests a build, beta, release, stable promotion, version change, or release-artifact verification. Do not trigger for ordinary source edits or analysis.
---

# DCUF Release

## Release workflow

1. Determine the affected target from the requested change. Mobile-only UI work does not require a PC build; shared filtering, storage, identity extraction, and cross-target inputs normally require both.
2. Honor an explicit version or stable/beta instruction. If a release is requested without a version, bump the affected target by `0.0.1` and use `<next>-beta`; reuse that beta through the review cycle and remove `-beta` only after confirmation.
3. Change the version source in the affected build script, never in generated userscripts.
4. Build mobile with `node tools/build-userscript.mjs` and PC with `node tools/build-pc-filter-userscript.mjs` as applicable.
5. Run `node tools/verify-repo.mjs release`. Stop on any BOM, version, token, syntax, debug-default, or root/dist mismatch.
6. During beta or review, push only a `codex/*` checkpoint when requested. For a confirmed stable release, create a clean worktree from `origin/Mobile` for mobile or `origin/main` for PC, replace only `Dc_UserFilter_Mobile.user.js` or `dcinside_user_filter.user.js`, preserve other files and remote history, and push without force. Never merge the source branch wholesale into an official branch.
7. Read [manual-smoke.md](references/manual-smoke.md) only when UI, observers, initialization, storage behavior, or filter decisions changed.
8. Report generated files, automated results, manual checks actually performed, skipped checks, and remaining risk. Never imply an unperformed live check passed.
