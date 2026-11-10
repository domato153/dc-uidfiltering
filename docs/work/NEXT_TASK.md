# Next: user review of Mobile 3.5.8

- Task ID: `stable-closeout`
- Bounded slice: `mobile-358-user-review`
- Objective: Wait for user confirmation after testing `Dc_UserFilter_Mobile_v3.5.8.user.js`.
- Why next: The earlier stable workflow was cancelled before publication. The user requested a local test of the list and article scroll fix first.
- Scope: Keep the corrected candidate and its notes locally; preserve the verified Mobile 3.5.7 public baseline.
- Expected transition: After confirmation, fresh-check the source, release scope, refs, artifact hash and validation, then continue the stable workflow for the corrected candidate.
- Stop/replan: Do not dispatch or publish before the user confirms.

```dcuf-next-action
{"id":"mobile-358-user-review","stageId":"stable-closeout","requiredDependencies":[{"id":"governing-policy","path":"AGENTS.md","mode":"LIVE","sha256":null},{"id":"current-authorization","path":"docs/work/CURRENT_STATE.md","mode":"LIVE","sha256":null},{"id":"publication-receipt","path":"verification/receipts/2026-11-10-stable-357-publication.json","mode":"FROZEN","sha256":"a8936b33b8e617a20063301277c8e72b6dfc5a6d0e2195f6f698aefd618a99f8"}],"requiredDecisions":["local-review-first"],"decisions":[{"id":"local-review-first","status":"ADOPTED","source":"docs/work/CURRENT_STATE.md","boundary":"Stable publication waits for the user's confirmation of the corrected local build."}],"hazards":[{"id":"stale-release-evidence","effect":"Earlier extension and workflow evidence names the pre-fix artifact; rebind publication validation to the corrected artifact.","status":"ACTIVE"}],"localEvidence":[],"qualificationScope":"CONTINUITY_ONLY","workSuccessCertified":false}
```
