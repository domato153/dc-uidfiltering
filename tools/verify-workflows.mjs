import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = path.join(rootDir, '.github', 'workflows');
const files = (await readdir(workflowsDir)).filter((name) => name.endsWith('.yml')).sort();
const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

check(JSON.stringify(files) === JSON.stringify(['development-ci.yml', 'live-site-canary.yml', 'promotion-windows.yml', 'release-mobile.yml']), `unexpected workflow set: ${files.join(', ')}`);
for (const file of files) {
    const text = await readFile(path.join(workflowsDir, file), 'utf8');
    check(!/pull_request_target\s*:/.test(text), `${file}: pull_request_target is forbidden`);
    for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
        const use = match[1];
        check(/^actions\/[a-z0-9-]+@[0-9a-f]{40}$/.test(use), `${file}: action is not GitHub-owned and pinned to a full SHA: ${use}`);
    }
    check(text.includes('NODE_VERSION: 22.17.0'), `${file}: Node version is not pinned`);
    check(text.includes('PNPM_VERSION: 10.33.1'), `${file}: pnpm version is not pinned`);
}

const development = await readFile(path.join(workflowsDir, 'development-ci.yml'), 'utf8');
check(development.includes('ubuntu-24.04'), 'development CI must run on ubuntu-24.04');
check(development.includes('push:\n    branches:\n      - codex/ui-port-boundary'), 'checkpoint push must target only the designated branch');
check(development.includes('pull_request:\n    branches:\n      - codex/mobile-development\n      - codex/ui-port-boundary'), 'PR acceptance targets must retain the old target and current working branch');
check(development.includes("name: working-checkpoint\n    if: github.event_name == 'push'") && development.includes('node tools/verify-checkpoint-ci.mjs'), 'push CI must qualify checkpoint only');
check((development.match(/if: github.event_name != 'push'/g) || []).length === 3, 'all full acceptance jobs must remain separate from push checkpoints');
check(development.includes('path: artifacts/checkpoint-ci.json'), 'checkpoint uploads must stay narrowly scoped');
check(development.includes('permissions:\n  contents: read'), 'development CI default permission must be contents: read');
check(development.includes('CANDIDATE_SHA: ${{ github.event.pull_request.head.sha || github.sha }}'), 'development CI must bind pull requests to the exact head SHA');
check((development.match(/ref: \$\{\{ env\.CANDIDATE_SHA \}\}/g) || []).length === 4, 'every development job must checkout the exact candidate SHA');
check((development.match(/test "\$\(git rev-parse HEAD\)" = "\$\{EXPECTED_SHA\}"/g) || []).length === 4, 'every development job must verify the exact candidate checkout');
check(!development.includes('affected-${{ github.sha }}') && !development.includes('acceptance-${{ github.sha }}'), 'development evidence must not be named after the synthetic merge SHA');
check(development.includes('node tools/run-gates.mjs artifacts/impact.json artifacts/policy-result.json --only policy'), 'development policy job must execute the declared policy profile');
check(development.includes('name: policy-${{ env.CANDIDATE_SHA }}'), 'policy evidence must be named after the exact candidate SHA');
check(development.includes('DCUF_WRITE_LAYOUT_REPORT: testbed/artifacts/baseline-editor-layout.json'), 'baseline editor geometry must use a non-overwritten evidence path');

const promotion = await readFile(path.join(workflowsDir, 'promotion-windows.yml'), 'utf8');
check(promotion.includes('runs-on: windows-2025'), 'promotion verification must run on windows-2025');
check(promotion.includes('source_sha:'), 'promotion verification requires an exact source_sha input');

const live = await readFile(path.join(workflowsDir, 'live-site-canary.yml'), 'utf8');
check(live.includes('workflow_dispatch:') && !/^  (?:push|pull_request|schedule):/m.test(live), 'live site is manual-only, not a network-dependent deterministic gate');
check(live.includes('runs-on: ubuntu-24.04') && live.includes('timeout-minutes: 20'), 'live canary requires a bounded hosted runner');
check(live.includes('permissions:\n  contents: read') && !live.includes('contents: write') && !live.includes('secrets.'), 'live canary must not publish or receive secrets');
check(live.includes('persist-credentials: false') && live.includes('ref: ${{ env.CANDIDATE_SHA }}'), 'live canary checkout must be exact and credential-free');
check(live.includes('test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}"') && live.includes('^[0-9a-f]{40}$'), 'live canary requires exact SHA validation');
check(live.includes('node tools/prepare-live-extension.mjs') && !live.includes('--discover'), 'live extension package must be explicitly pinned');
check(live.includes('xvfb-run -a node testbed/run-live-site-canary.mjs') && live.includes('--headed'), 'live canary must run the actual full desktop browser');
check(!live.includes('continue-on-error:'), 'live failures cannot be hidden as success');
check(live.includes('testbed/artifacts/live-site-canary/*.png') && !live.includes('testbed/artifacts/**'), 'live evidence upload must exclude profiles, extension payloads, and raw stores');

const release = await readFile(path.join(workflowsDir, 'release-mobile.yml'), 'utf8');
check(release.includes('environment: mobile-release'), 'release publication must use the mobile-release environment');
check(release.includes('contents: write'), 'release publish job must explicitly request contents: write');
check(release.includes("if: inputs.publish_confirmation == 'PUBLISH'"), 'release publish job lacks explicit PUBLISH gating');
check(release.includes('persist-credentials: false'), 'release prepare checkout must not persist write credentials');
check(release.includes('WORKFLOW_REF') && release.includes('refs/heads/main'), 'release workflow must reject a non-main control plane');
check(release.includes('actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093'), 'release artifact download action pin changed');

const gates = JSON.parse(await readFile(path.join(rootDir, 'verification/gates.json'), 'utf8'));
for (const [profile, buildId, output] of [
    ['acceptance', 'mobile-build', 'testbed/artifacts/acceptance-header-recent-title-contract.json'],
    ['promotion-windows', 'mobile-build-runtime', 'testbed/artifacts/windows-header-recent-title-contract.json'],
]) {
    const commands = gates.profiles?.[profile]?.commands || [];
    const index = commands.findIndex(({ id }) => id === 'header-recent-title-contract');
    const mobileBuildIndex = commands.findIndex(({ id }) => id === buildId);
    const pcBuildIndex = commands.findIndex(({ id }) => id === 'pc-build-runtime');
    check(index >= 0 && commands.filter(({ id }) => id === 'header-recent-title-contract').length === 1,
        `${profile}: exactly one recent-title contract gate is required`);
    check(mobileBuildIndex >= 0 && pcBuildIndex >= 0 && index === mobileBuildIndex + 1 && index < pcBuildIndex,
        `${profile}: recent-title contract must run immediately after the mobile guard build, before PC replaces it`);
    check(commands[index]?.command === 'node' && JSON.stringify(commands[index]?.args)
        === JSON.stringify(['testbed/run-header-cascade-audit.mjs', '--recent-title-contract', '--gnb-reset-contract', '--require-runtime-under-test', '--output', output]),
    `${profile}: recent-title/GNB gate modes, runtime guard, and separate report path must be preserved`);
}

const packages = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const testbed = JSON.parse(await readFile(path.join(rootDir, 'testbed', 'package.json'), 'utf8'));
check(packages.packageManager === 'pnpm@10.33.1', 'root packageManager is not pinned');
check(packages.engines?.node === '22.17.0', 'root Node engine is not pinned');
check(packages.devDependencies?.acorn === '8.18.0', 'Acorn is not pinned to 8.18.0');
check(testbed.devDependencies?.playwright === '1.61.1', 'Playwright is not pinned to 1.61.1');

if (failures.length) {
    console.error('Workflow verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Workflow verification passed: ${files.length} workflows use pinned GitHub-owned actions and least-privilege gates.`);
}
