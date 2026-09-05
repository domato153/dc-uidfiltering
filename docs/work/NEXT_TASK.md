# Next bounded task

Close Phase 2, then begin shared filter and personal-block UI separation without visual redesign:

1. Push the exact-head workflow correction at `28cc9c9` plus this continuity update to PR #3. Require artifact names, impact receipt `head`, CI manifest `sourceHead`, and checked-out `HEAD` to equal the latest PR head rather than a synthetic merge SHA.
2. Run a fresh-context independent `gpt-5.6-sol max` upper-layer audit against that latest PR head. The previous attempt produced one confirmed wrong-head finding but no final report, so it is not an audit pass.
3. Merge Phase 2 only after exact-head policy/affected/full acceptance and the completed audit have no material finding. Windows promotion remains a separate pre-promotion gate.
4. Preserve exact per-target results and lineage. The observed palette receipts are the semantic evidence; the older status-only receipts remain stale historical records.
5. Map GM/storage/filter side effects versus filter-settings and personal-block rendering/event ownership in a new candidate overlay.
6. Move state/effects into application handlers and leave presentation on immutable snapshots and typed intents; preserve every GM key and stored shape.
7. Replace the PC string-marker extraction rail with explicit shared filter/personal-block UI module inputs; keep all mobile host CSS out of PC.
8. Require mobile and PC acceptance plus the first exact-artifact manual canary before accepting the shared-UI separation.

Do not redesign visuals, alter filtering decisions, change storage/network contracts, or publish a release in this step.
