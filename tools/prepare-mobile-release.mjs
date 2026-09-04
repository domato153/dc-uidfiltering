import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(rootDir, process.argv[2] || 'artifacts/release-preparation');
const required = [
    'SOURCE_SHA',
    'EXPECTED_VERSION',
    'EXPECTED_DEV_HEAD',
    'EXPECTED_MAIN_HEAD',
    'EXPECTED_MOBILE_HEAD',
    'TESTED_ARTIFACT_SHA256',
    'CANARY_RESULT',
    'CANARY_SCOPE',
    'RELEASE_NOTES',
    'PUBLISH_CONFIRMATION',
];
const failures = [];

for (const name of required) if (!process.env[name]?.trim()) failures.push(`missing ${name}`);
for (const name of ['SOURCE_SHA', 'EXPECTED_DEV_HEAD', 'EXPECTED_MAIN_HEAD', 'EXPECTED_MOBILE_HEAD']) {
    if (process.env[name] && !/^[0-9a-f]{40}$/.test(process.env[name])) failures.push(`${name} must be a full lowercase commit SHA`);
}
if (process.env.EXPECTED_VERSION && !/^\d+\.\d+\.\d+$/.test(process.env.EXPECTED_VERSION)) failures.push('EXPECTED_VERSION must be a stable semantic version');
if (process.env.TESTED_ARTIFACT_SHA256 && !/^[0-9A-F]{64}$/.test(process.env.TESTED_ARTIFACT_SHA256)) failures.push('TESTED_ARTIFACT_SHA256 must be uppercase SHA-256');
if (!['DRY_RUN', 'PUBLISH'].includes(process.env.PUBLISH_CONFIRMATION)) failures.push('PUBLISH_CONFIRMATION must be DRY_RUN or PUBLISH');
if (process.env.PUBLISH_CONFIRMATION === 'PUBLISH' && process.env.CANARY_RESULT !== 'PASS') failures.push('publication requires CANARY_RESULT=PASS');
if ((process.env.RELEASE_NOTES || '').trim().length < 10) failures.push('RELEASE_NOTES must contain meaningful patch notes');

function git(args) {
    const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8' });
    if (result.status !== 0) failures.push(result.stderr.trim() || `git ${args.join(' ')} failed`);
    return result.stdout.trim();
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

const actualHead = git(['rev-parse', 'HEAD']);
if (actualHead !== process.env.SOURCE_SHA) failures.push(`checked out source ${actualHead} != ${process.env.SOURCE_SHA}`);
if (process.env.SOURCE_SHA !== process.env.EXPECTED_DEV_HEAD) failures.push('SOURCE_SHA must equal EXPECTED_DEV_HEAD');
const remoteDev = git(['ls-remote', 'origin', 'refs/heads/codex/mobile-development']).split(/\s+/)[0];
if (remoteDev !== process.env.EXPECTED_DEV_HEAD) failures.push(`remote development head ${remoteDev || '(missing)'} != expected ${process.env.EXPECTED_DEV_HEAD}`);

const targets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8')).targets;
if (targets.mobile.version !== process.env.EXPECTED_VERSION) failures.push(`configured mobile version ${targets.mobile.version} != ${process.env.EXPECTED_VERSION}`);
const artifactName = targets.mobile.outputPattern.replace('{version}', targets.mobile.version);
const artifactPath = path.join(rootDir, artifactName);
let artifactBytes = null;
try {
    artifactBytes = await readFile(artifactPath);
} catch {
    failures.push(`missing built artifact ${artifactName}`);
}
const artifactSha256 = artifactBytes ? digest(artifactBytes) : null;
if (artifactSha256 !== process.env.TESTED_ARTIFACT_SHA256) failures.push(`built artifact ${artifactSha256 || '(missing)'} != canary artifact ${process.env.TESTED_ARTIFACT_SHA256}`);
const metadataVersion = artifactBytes?.toString('utf8').match(/^\/\/ @version\s+([^\r\n]+)$/m)?.[1]?.trim();
if (metadataVersion !== process.env.EXPECTED_VERSION) failures.push(`artifact @version ${metadataVersion || '(missing)'} != ${process.env.EXPECTED_VERSION}`);

if (failures.length) {
    console.error('Release preparation failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
}

await mkdir(outputDir, { recursive: true });
const sourceTimestamp = git(['show', '-s', '--format=%cI', 'HEAD']);
const manifest = {
    schemaVersion: 1,
    repository: process.env.GITHUB_REPOSITORY || 'domato153/dc-uidfiltering',
    sourceSha: process.env.SOURCE_SHA,
    sourceTimestamp,
    expectedVersion: process.env.EXPECTED_VERSION,
    expectedHeads: {
        development: process.env.EXPECTED_DEV_HEAD,
        main: process.env.EXPECTED_MAIN_HEAD,
        mobile: process.env.EXPECTED_MOBILE_HEAD,
    },
    artifact: { name: artifactName, bytes: artifactBytes.length, sha256: artifactSha256 },
    canary: {
        result: process.env.CANARY_RESULT,
        scope: process.env.CANARY_SCOPE.trim(),
        artifactSha256: process.env.TESTED_ARTIFACT_SHA256,
    },
    publishConfirmation: process.env.PUBLISH_CONFIRMATION,
};
await Promise.all([
    writeFile(path.join(outputDir, artifactName), artifactBytes),
    writeFile(path.join(outputDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(path.join(outputDir, 'SHA256SUMS.txt'), `${artifactSha256}  ${artifactName}\n`, 'utf8'),
    writeFile(path.join(outputDir, 'RELEASE_NOTES.md'), `${process.env.RELEASE_NOTES.trim()}\n`, 'utf8'),
]);
console.log(`Prepared ${artifactName} ${artifactSha256} from ${manifest.sourceSha} (${manifest.publishConfirmation}).`);
