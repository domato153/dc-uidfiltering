---
name: metadata-safety
description: Review DCUF Tampermonkey metadata, GM capabilities, execution scope, and persisted-data compatibility. Use only when changing @match/@include/@exclude, @grant, @run-at, @require, GM_* APIs, storage keys, stored data shapes, migrations, or shared mobile/PC setting semantics. Do not trigger for ordinary DOM, CSS, logic, or release-only changes.
---

# Metadata Safety

1. Compare metadata scope and timing before and after the proposed change.
2. Require a concrete need for broader matches, new grants, external requirements, or changed run timing.
3. Preserve storage keys and readable legacy shapes. When semantics must change, add a migration or compatibility fallback and keep failure behavior safe.
4. Treat `@run-at document-start` and early hidden-body/overlay behavior as a compatibility contract.
5. Check whether shared settings or identity parsing alter both mobile and PC filtering.
6. Report the changed capability or schema, affected users/targets, migration behavior, and any irreversible risk.
