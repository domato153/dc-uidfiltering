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

check(JSON.stringify(files) === JSON.stringify(['development-ci.yml', 'promotion-windows.yml', 'release-mobile.yml']), `unexpected workflow set: ${files.join(', ')}`);
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
check(development.includes('branches:\n      - codex/mobile-development'), 'development CI must target codex/mobile-development');
check(development.includes('permissions:\n  contents: read'), 'development CI default permission must be contents: read');
check(development.includes('CANDIDATE_SHA: ${{ github.event.pull_request.head.sha || github.sha }}'), 'development CI must bind pull requests to the exact head SHA');
check((development.match(/ref: \$\{\{ env\.CANDIDATE_SHA \}\}/g) || []).length === 3, 'every development job must checkout the exact candidate SHA');
check((development.match(/test "\$\(git rev-parse HEAD\)" = "\$\{EXPECTED_SHA\}"/g) || []).length === 3, 'every development job must verify the exact candidate checkout');
check(!development.includes('affected-${{ github.sha }}') && !development.includes('acceptance-${{ github.sha }}'), 'development evidence must not be named after the synthetic merge SHA');

const promotion = await readFile(path.join(workflowsDir, 'promotion-windows.yml'), 'utf8');
check(promotion.includes('runs-on: windows-2025'), 'promotion verification must run on windows-2025');
check(promotion.includes('source_sha:'), 'promotion verification requires an exact source_sha input');

const release = await readFile(path.join(workflowsDir, 'release-mobile.yml'), 'utf8');
check(release.includes('environment: mobile-release'), 'release publication must use the mobile-release environment');
check(release.includes('contents: write'), 'release publish job must explicitly request contents: write');
check(release.includes("if: inputs.publish_confirmation == 'PUBLISH'"), 'release publish job lacks explicit PUBLISH gating');
check(release.includes('persist-credentials: false'), 'release prepare checkout must not persist write credentials');
check(release.includes('WORKFLOW_REF') && release.includes('refs/heads/main'), 'release workflow must reject a non-main control plane');
check(release.includes('actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093'), 'release artifact download action pin changed');

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
