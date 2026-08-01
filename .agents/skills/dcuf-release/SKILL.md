---
name: dcuf-release
description: Build, version, promote, or verify DCUF mobile and PC release artifacts. Use only when the user explicitly requests a build, beta, release, stable promotion, version change, or release-artifact verification. Do not trigger for ordinary source edits or analysis.
---

# DCUF Release

## Release workflow

1. Determine the affected target from the requested change. Mobile-only UI work does not require a PC build; shared filtering, storage, identity extraction, and cross-target inputs normally require both.
2. Honor an explicit version or stable/beta instruction. First determine whether an active beta review cycle already exists in the version source or current generated artifacts. If it does, rebuild every fix in that cycle with the exact same `<version>-beta`; a request such as “continue,” “fix it,” or “build the beta again” never bumps the number. After live confirmation, promote that same number by removing only `-beta`. Start `<next>-beta` with a `0.0.1` bump only when beginning a genuinely new review cycle from a stable version or when the user explicitly requests a new version.
3. Change the version source in the affected build script, never in generated userscripts.
4. Build mobile with `node tools/build-userscript.mjs` and PC with `node tools/build-pc-filter-userscript.mjs` as applicable.
5. For every new mobile beta, run the narrowest deterministic Testbed `--group`/`--filter` set covering every changed surface. Do not run unrelated groups; use the full suite only when impact cannot be isolated or the user explicitly requests it. A confirmed stable promotion may reuse the recorded beta result and skip Testbed when the runtime source is unchanged, the only artifact change is removing the version suffix, and live beta use has been confirmed. Record that skip basis. Otherwise test the stable artifact normally. Stop and report on failure, and never weaken an assertion to publish. Run `node testbed/run-bfcache.mjs` only for lifecycle or bfcache changes.
6. Run `node tools/verify-repo.mjs release`. Stop on any BOM, version, token, syntax, debug-default, root/dist, or testbed mismatch.
7. During beta or review, push only a `codex/*` checkpoint when requested. For a confirmed stable release, create a clean worktree from `origin/Mobile` for mobile or `origin/main` for PC, replace only `Dc_UserFilter_Mobile.user.js` or `dcinside_user_filter.user.js`, preserve other files and remote history, and push without force. Update the released target version in both `main:README.md` and the homepage label in `main:index.html`, then verify the canonical download reports that version. Never merge the source branch wholesale into an official branch.
8. Read [manual-smoke.md](references/manual-smoke.md) only when UI, observers, initialization, storage behavior, or filter decisions changed.
9. Report generated files, testbed and repository verification results, manual checks actually performed, skipped checks, and remaining risk. Never imply an unperformed live check passed.
