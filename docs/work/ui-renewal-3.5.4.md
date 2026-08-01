# DCUF UI renewal 3.5.4 collaboration brief

## Status

`CHAT_REVIEW_REQUIRED`

Do not modify runtime source, fixtures, generated userscripts, versions, or release state while this status is active. This branch first exposes the current snapshot, collaboration rules, and proposed UI-maintenance skill for Chat review. The user must approve a reviewed revision and change the status to `READY_FOR_IMPLEMENTATION` before script coding resumes.

## Shared baseline

- Branch: `codex/ui-renewal-3.5.4-collab`
- Review commit: name the exact GitHub commit SHA in the Chat request; never assume that the branch tip is unchanged.
- Repository: `domato153/dc-uidfiltering`
- Local `.codex/` records are execution-only and are not the GitHub handoff.
- `docs/ui-surface-contracts.md` is the compact surface contract.
- `docs/agent-maintenance-notes.md` contains durable causes and invalidated coverage.
- `Dc_UserFilter_Mobile_v3.5.3.user.js` is a behavior reference, not a visual target.

## Role split

- Chat: inspect the named commit, screenshots/evidence supplied by the user, this brief, `AGENTS.md`, and the UI skill. Confirm causes, requirements, exclusions, and missing regression gates. Do not edit runtime code.
- Codex: after user approval and `READY_FOR_IMPLEMENTATION`, translate the reviewed brief into fixtures, source changes, builds, and validation. Do not reinterpret unresolved visual decisions silently.
- User: approves the reviewed brief, resolves material design choices, performs requested live confirmation, and separately authorizes release/merge actions.

## Current snapshot warning

The historical mobile `106/106` result does not cover the live failures below. The fixtures and harness changed during the redesign and several live host signatures were simplified or mocked. Treat the branch as an implementation snapshot awaiting architectural and requirements review, not as completed UI.

## Coding backlog for later review

No item below is authorization to code while status is `CHAT_REVIEW_REQUIRED`.

### Cascade and composition

- Consolidate duplicated header/recent owners in `theme-module.js`, `post-main-fixes.js`, and older broad mobile CSS. Do not add another global override phase.
- Keep one bounded header composition while supporting the full logged-in/out link rail, logout, night mode, tooltip, wide and narrow layouts.
- Keep list-bottom paging/search/actions inside one major shell and preserve native controls and form behavior.
- Keep write toolbar controls on one non-wrapping horizontal rail with touch scrolling on narrow viewports.
- Keep list/article/write/comment surfaces consistent with the approved selective-glass composition: glass on major shells and overlays, flat readable repeated/content interiors.

### Behavior and host bridges

- Decouple the 글댓합 `모든 기능 끄기` setting from mobile convenience features. It must stop only the filter/statistics functions owned by that panel; preview, recent-post highlighting, and draft recovery retain their own settings.
- Compare the list author bridge with 3.5.3 and current live delegated events. A click on the visible writer must create the original native nickname menu; do not accept a pre-appended mock or a synthetic event that the host ignores.
- Keep title decorations adjacent to the title and order the reply count, `(펌)`, scheduled-delete clock, and other host marks according to the reviewed title contract.

### Native popup ownership

- The gallery management-history trigger inside the gallery-door presentation currently creates `#pop_manage_report_list` inside the clone/drawer. Preserve or portal the original native popup so it is viewport-contained and topmost without restyling its interior.
- Fix the exact `.btn_subject_more + #subject_morelist` contract. The arrow must occupy its own sibling track and the native layer must remain reachable above the list.
- Recheck the 30/50/100 list-size layer, gallery drawer, autocomplete, editor menus, DCCon, shortcuts, preview, and settings under competing open states and short visual viewports.

### Write-page host fidelity

- Preserve the host's active recent/favorite label semantics. Do not force both `.vst_title` and `.bookmark_title` visible; remove the leaked bottom border in the exact write-route structure.
- Model the full live AI quick-registration DOM: loading box, file input, image/character controls, layer button, prompt, count, native close sprite, and settings popup. Reset only verified host positioning conflicts and remove the erroneous white circular overlap.
- Replace the malformed custom `펌 금지` check drawing with a readable checked state while preserving the original button and toggle handler.
- Preserve native editor, form, submit/cancel, hidden fields, and toolbar/dropdown lifecycle.

## Fixture and validation prerequisites

- Reproduce exact live roots and dynamically created post-click nodes before production fixes.
- Replace the one-link header fixture with full logged-in/out link rails and night-mode states.
- Hide recent/favorite labels the way the live host does, not with fixture-only attributes.
- Use the real `.btn_subject_more` sibling structure and exact `data-nick` writer signature.
- Expand the AI rail fixture to the full live structure.
- Assert positive geometry, adjacency, viewport containment, focus, and `elementFromPoint` for every affected open layer.
- Invalidate any test pass after runtime, fixture, or harness changes; run focused tests first and the final required suite only on the settled runtime.

## Chat review questions

1. Does `AGENTS.md` clearly separate collaboration pushes from release/promotion and prevent coding before approval?
2. Does `.agents/skills/dcuf-ui-surface-maintainer/SKILL.md` correctly adapt minimal-intrusion/Ponytail-style principles to a host-restyling userscript without encouraging wrappers, clones, or specificity escalation?
3. Are any backlog items incorrectly coupled, missing a state/viewport, or phrased as a solution before the cause is proven?
4. Which items require a user visual choice, and which are objective behavior regressions?
5. Is the evidence sufficient to mark a revised brief `READY_FOR_IMPLEMENTATION`, or what single bounded live check is still necessary?

## Explicitly out of scope for this checkpoint

- Runtime, fixture, metadata, build, or generated-userscript edits beyond the existing snapshot
- Version changes, stable promotion, release artifacts, official branch updates, tags, releases, or publishing
- Ponytail branding or external code import; only the adapted maintenance principles are proposed
- Raw live audit uploads, cookies, storage dumps, credentials, nicknames, or unrelated local archives
