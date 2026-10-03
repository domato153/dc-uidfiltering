# Working-branch checkpoints

`AGENTS.md` owns standing user authorization. `verification/checkpoint-policy.json` only checks its target and safety constraints; tools, tests and CI cannot create permission. Run commands from the actual development Git root. Do not switch/merge/rebase/force or publish official branches, tags, PRs, releases or live runs.

After a bounded, self-contained unit, review the exact diff and sensitive-data risk, update continuity only where necessary, and select a JSON array of explicit relative file paths in an ignored local file. Include relevant code, tests, contracts and documentation together. Do not stage raw reports, controls, credentials, local archives or unrelated artifacts. Generated outputs belong only when the source/build procedure requires them.

```powershell
node tools/checkpoint.mjs inspect
git ls-remote origin refs/heads/codex/ui-port-boundary
node tools/checkpoint.mjs publish --paths-file artifacts/checkpoint-paths.json --message "checkpoint: bounded result" --expected-remote <fresh-40-character-remote-SHA>
```

The publisher rejects wrong root/branch/remote/upstream, preexisting staged changes, dirty unselected validation inputs and remote drift. It validates the staged tree using `verify-repo all`, confirms the tree/worktree/HEAD have not moved, commits that tree and pushes that exact commit without force. Normal Git hooks still run; any hook tree/worktree mutation stops publication. Narrow affected product tests must be run before this command when runtime changes; repository validation is not a substitute for them. A file's absence/unsafe path stops the unit rather than causing an implicit directory sweep.

If validation fails before commit, intentional selected paths remain staged. Inspect the failure and index. Only when those exact paths are known to belong to this failed attempt, unstage those paths with `git restore --staged -- <explicit-own-paths>`, preserve working files, fix and revalidate. Never clear another person's staged work or reset the worktree.

The ignored `artifacts/checkpoints/<commit>.json` records local validation, exact tree/commit, remote observation and later CI identity. It is a diagnostic execution record, not cryptographic attestation or a product acceptance receipt. A committed checkpoint does not contain its own future commit SHA. Missing receipts require fresh validation/reconstruction, never guessed success.

For a failed transport, retain the commit and resume it without another commit:

```powershell
node tools/checkpoint.mjs resume --commit <same-commit> --expected-remote <original-expected-remote>
node tools/checkpoint.mjs verify-ci --commit <same-commit>
```

`COMMITTED_PENDING_PUSH` means publication is unconfirmed. `REMOTE_SYNCED_CI_PENDING` requires an observed identical remote SHA. `CI_VERIFIED_CHECKPOINT` additionally requires the exact commit's successful push run and `working-checkpoint` job; failed/pending/skipped or different-SHA runs do not qualify. Remote drift requires investigation, not overwrite. After completing a unit, report commit SHA, remote result and CI pending/failure/success separately; this standing cadence is not an unattended daemon.

Push CI is a cheap deterministic governance/build checkpoint. PR/manual acceptance remains separate. Manual desktop live-site execution and trusted-main release approval are unchanged and are never automatically dispatched by a checkpoint. Header/feature/live/upper product claims remain UNKNOWN until their own evidence closes.
