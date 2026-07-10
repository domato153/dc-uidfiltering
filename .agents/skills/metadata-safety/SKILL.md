---
name: metadata-safety
description: Tampermonkey metadata and GM API safety review for this DCInside mobile/PC split userscript. Use when changing @match, @include, @exclude, @grant, @run-at, @require, adding new GM_* APIs or dependencies, changing storage keys or run scope, or checking backward compatibility for persisted settings across mobile, PC, or shared builds.
---

# Metadata Safety

## Overview
Review metadata, granted capabilities, and persistent behavior before accepting changes. Treat run scope, execution timing, and storage compatibility as first-class safety concerns.

## Core Rules
- Review the metadata block before approving any change that can alter where or when the script runs.
- Require a reason before adding a new GM API, external dependency, or broader match pattern.
- Preserve storage compatibility by default.
- If storage schema or semantics must change, require a migration path or compatibility fallback.
- Treat `@run-at document-start` as a stability contract unless there is a strong reason to move it.
- Do not broaden `@match`, `@grant`, `@run-at`, or storage scope as a performance shortcut without a specific reason.

## Checklist
1. Check `@match`, `@include`, and `@exclude` scope.
2. Check `@grant` entries for missing, unused, or newly expanded capabilities.
3. Check `@run-at` and any timing-sensitive assumptions around hidden body, boot overlay, and initialization.
4. Check `@require` or external assets for trust, stability, and offline failure risk.
5. Check GM storage usage for key reuse, data shape compatibility, and fallback behavior.
6. Check whether a change could silently affect pages beyond list, article, comments, write page, or popup flows.

## Compatibility Notes
- Prefer additive behavior over replacing existing semantics.
- Keep old keys readable when possible.
- If a migration is one-way, back up or preserve the previous value when practical.
- Call out any change that can alter persisted user settings, popup state, or filter behavior after reload.

## Reporting Notes
Include the relevant parts of this structure in the final response without forcing empty sections:
- Finding: the metadata, GM API, or storage issue.
- Risk level: high, medium, or low.
- Recommended change: what to do.
- Compatibility concern: affected users, pages, or saved data.
- Migration note: required fallback or migration, if any.

## Do Not Use For
- Pure DOM selector or CSS reviews with no metadata or persistence impact.
- Cosmetic edits that cannot affect Tampermonkey scope, timing, or storage behavior.
