---
name: dcuf-release
description: Build, version, promote, or verify DCUF mobile and PC release artifacts. Use only when the user explicitly requests a build, beta, release, stable promotion, version change, or release-artifact verification. Do not trigger for ordinary source edits or analysis.
---

# DCUF Release

## Release workflow

1. Determine the affected target from the requested change. Mobile-only UI work does not require a PC build; shared filtering, storage, identity extraction, and cross-target inputs normally require both.
2. Honor an explicit version or stable/beta instruction. First determine whether an active beta review cycle already exists in the version source or current generated artifacts. If it does, rebuild every fix in that cycle with the exact same `<version>-beta`; a request such as “continue,” “fix it,” or “build the beta again” never bumps the number. After live confirmation, promote that same number by removing only `-beta`. Start `<next>-beta` with a `0.0.1` bump only when beginning a genuinely new review cycle from a stable version or when the user explicitly requests a new version.
3. Change the version only in `build/targets.json`, never in generated userscripts or target-specific build code.
4. Build mobile with `node tools/build-userscript.mjs` and PC with `node tools/build-pc-filter-userscript.mjs` as applicable.
5. For every new mobile beta, run the narrowest deterministic Testbed `--group`/`--filter` set covering every changed surface. Do not run unrelated groups; use the full suite only when impact cannot be isolated or the user explicitly requests it. A confirmed stable promotion may reuse the recorded beta result and skip Testbed when the runtime source is unchanged, the only artifact change is removing the version suffix, and live beta use has been confirmed. Record that skip basis. Otherwise test the stable artifact normally. Stop and report on failure, and never weaken an assertion to publish. Run `node testbed/run-bfcache.mjs` only for lifecycle or bfcache changes.
6. Run `node tools/verify-repo.mjs release`. Stop on any BOM, version, token, syntax, debug-default, root/dist, or testbed mismatch.
7. Development is accepted through the protected `codex/mobile-development` branch. A stable publication uses only the trusted default-branch manual workflow: bind the exact source/artifact SHA, require the `mobile-release` environment approval, stage a draft Release and temporary refs, compare expected heads, upload the userscript and checksum file, then verify the canonical asset and patch notes. Never merge the source branch wholesale into an official branch or report success with a missing/mismatched asset.
8. Read [manual-smoke.md](references/manual-smoke.md) only when UI, observers, initialization, storage behavior, or filter decisions changed.
9. A dry run may build and verify without publication. Actual dispatch, environment approval, tag, official-ref update, or Release publication still requires the user's explicit release request.
10. Report generated files, testbed and repository verification results, manual checks actually performed, skipped checks, and remaining risk. Never imply an unperformed live check passed.
