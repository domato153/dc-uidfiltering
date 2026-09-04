import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const controlDir = path.resolve(process.env.CONTROL_DIR || 'control');
const mobileDir = path.resolve(process.env.MOBILE_DIR || 'mobile');
const stagingDir = path.resolve(process.env.STAGING_DIR || 'release-preparation');
const manifest = JSON.parse(await readFile(path.join(stagingDir, 'release-manifest.json'), 'utf8'));
const notes = (await readFile(path.join(stagingDir, 'RELEASE_NOTES.md'), 'utf8')).trim();
const artifactPath = path.join(stagingDir, manifest.artifact.name);
const checksumPath = path.join(stagingDir, 'SHA256SUMS.txt');
const repository = manifest.repository;
const version = manifest.expectedVersion;
const tag = `mobile-v${version}`;
const stageMain = `release-staging/mobile-v${version}-main`;
const stageMobile = `release-staging/mobile-v${version}-mobile`;

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        encoding: options.binary ? null : 'utf8',
        env: options.env || process.env,
        maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
        const error = options.binary ? result.stderr?.toString('utf8') : result.stderr;
        throw new Error(error?.trim() || `${command} ${args.join(' ')} failed`);
    }
    return options.binary ? result.stdout : result.stdout.trim();
}

function git(cwd, args, options = {}) {
    return run('git', args, { cwd, ...options });
}

function remoteHead(branch) {
    return git(controlDir, ['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s+/)[0] || null;
}

function replaceExactlyOnce(text, pattern, replacement, label) {
    const matches = text.match(pattern);
    if (!matches || matches.length !== 1) throw new Error(`${label}: expected exactly one version marker`);
    return text.replace(pattern, replacement);
}

async function validateInputs() {
    if (manifest.schemaVersion !== 1) throw new Error('unsupported release manifest schema');
    if (manifest.publishConfirmation !== 'PUBLISH') throw new Error('trusted publish job requires PUBLISH confirmation');
    if (manifest.canary?.result !== 'PASS') throw new Error('trusted publish job requires a PASS canary');
    if (manifest.canary?.artifactSha256 !== manifest.artifact.sha256) throw new Error('canary artifact does not match release artifact');
    if (!/^[0-9a-f]{40}$/.test(manifest.sourceSha)) throw new Error('source SHA is not exact');
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('release version is not stable semver');
    if (!notes) throw new Error('release notes are empty');
    const artifactBytes = await readFile(artifactPath);
    if (artifactBytes.length !== manifest.artifact.bytes || digest(artifactBytes) !== manifest.artifact.sha256) throw new Error('staged artifact size or digest mismatch');
    const checksum = (await readFile(checksumPath, 'utf8')).trim();
    if (checksum !== `${manifest.artifact.sha256}  ${manifest.artifact.name}`) throw new Error('checksum file mismatch');
    const metadataVersion = artifactBytes.toString('utf8').match(/^\/\/ @version\s+([^\r\n]+)$/m)?.[1]?.trim();
    if (metadataVersion !== version) throw new Error(`artifact @version ${metadataVersion || '(missing)'} != ${version}`);
    if (git(controlDir, ['rev-parse', 'HEAD']) !== manifest.expectedHeads.main) throw new Error('checked out main head mismatch');
    if (git(mobileDir, ['rev-parse', 'HEAD']) !== manifest.expectedHeads.mobile) throw new Error('checked out Mobile head mismatch');
    if (remoteHead('main') !== manifest.expectedHeads.main) throw new Error('remote main moved before staging');
    if (remoteHead('Mobile') !== manifest.expectedHeads.mobile) throw new Error('remote Mobile moved before staging');
    if (remoteHead('codex/mobile-development') !== manifest.expectedHeads.development) throw new Error('remote development head moved before staging');
}

function commitIfNeeded(cwd, message, paths) {
    git(cwd, ['config', 'user.name', 'github-actions[bot]']);
    git(cwd, ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    git(cwd, ['add', '--', ...paths]);
    const quiet = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
    if (quiet.status === 0) return git(cwd, ['rev-parse', 'HEAD']);
    const fixedEnv = { ...process.env, GIT_AUTHOR_DATE: manifest.sourceTimestamp, GIT_COMMITTER_DATE: manifest.sourceTimestamp };
    git(cwd, ['commit', '-m', message], { env: fixedEnv });
    return git(cwd, ['rev-parse', 'HEAD']);
}

async function stageTrees() {
    const mainReadmePath = path.join(controlDir, 'README.md');
    const mainIndexPath = path.join(controlDir, 'index.html');
    const currentReadme = await readFile(mainReadmePath, 'utf8');
    const currentIndex = await readFile(mainIndexPath, 'utf8');
    const nextReadme = replaceExactlyOnce(currentReadme, /Mobile-\d+\.\d+\.\d+(?:--beta)?-/g, `Mobile-${version}-`, 'README badge');
    const nextIndex = replaceExactlyOnce(currentIndex, /MOBILE\s+\d+\.\d+\.\d+(?:-beta)?\s+·\s+PC/g, `MOBILE ${version} · PC`, 'index version label');
    await writeFile(mainReadmePath, nextReadme, 'utf8');
    await writeFile(mainIndexPath, nextIndex, 'utf8');

    const pcPath = path.join(controlDir, 'dcinside_user_filter.user.js');
    const pcBefore = digest(await readFile(pcPath));
    const mainCommit = commitIfNeeded(controlDir, `docs: update mobile version to ${version}`, ['README.md', 'index.html']);
    const pcAfter = digest(await readFile(pcPath));
    if (pcBefore !== pcAfter) throw new Error('PC canonical userscript changed during mobile staging');

    await cp(artifactPath, path.join(mobileDir, 'Dc_UserFilter_Mobile.user.js'));
    await cp(mainReadmePath, path.join(mobileDir, 'README.md'));
    await cp(path.join(controlDir, 'assets'), path.join(mobileDir, 'assets'), { recursive: true, force: true });
    const mobileCommit = commitIfNeeded(mobileDir, `release: mobile ${version}`, ['Dc_UserFilter_Mobile.user.js', 'README.md', 'assets']);
    return { mainCommit, mobileCommit, pcSha256: pcAfter };
}

function pushStageRef(cwd, commit, branch) {
    const existing = git(cwd, ['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s+/)[0] || null;
    if (existing && existing !== commit) throw new Error(`staging ref ${branch} exists at another commit`);
    if (!existing) git(cwd, ['push', 'origin', `${commit}:refs/heads/${branch}`]);
}

function ensureDraftRelease(mobileCommit) {
    const view = spawnSync('gh', ['release', 'view', tag, '--repo', repository, '--json', 'isDraft,assets'], { encoding: 'utf8' });
    if (view.status === 0) {
        const existing = JSON.parse(view.stdout);
        if (!existing.isDraft) throw new Error(`release ${tag} is already published`);
        return;
    }
    run('gh', [
        'release', 'create', tag,
        '--repo', repository,
        '--target', mobileCommit,
        '--title', `모바일 ${version}`,
        '--notes-file', path.join(stagingDir, 'RELEASE_NOTES.md'),
        '--draft',
        artifactPath,
        checksumPath,
    ]);
}

async function verifyReleaseAssets(expectDraft) {
    const view = JSON.parse(run('gh', ['release', 'view', tag, '--repo', repository, '--json', 'isDraft,assets']));
    if (view.isDraft !== expectDraft) throw new Error(`release draft state ${view.isDraft} != ${expectDraft}`);
    const names = new Set(view.assets.map((asset) => asset.name));
    for (const name of [manifest.artifact.name, 'SHA256SUMS.txt']) if (!names.has(name)) throw new Error(`release asset is missing: ${name}`);
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'dcuf-release-verify-'));
    try {
        run('gh', ['release', 'download', tag, '--repo', repository, '--pattern', manifest.artifact.name, '--dir', temporary]);
        const downloaded = await readFile(path.join(temporary, manifest.artifact.name));
        if (downloaded.length !== manifest.artifact.bytes || digest(downloaded) !== manifest.artifact.sha256) throw new Error('downloaded release asset digest mismatch');
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
}

function pushOfficial(cwd, commit, branch, expectedHead) {
    const current = remoteHead(branch);
    if (current === commit) return;
    if (current !== expectedHead) throw new Error(`remote ${branch} moved from ${expectedHead} to ${current}`);
    git(cwd, ['push', 'origin', `${commit}:refs/heads/${branch}`]);
    if (remoteHead(branch) !== commit) throw new Error(`remote ${branch} did not reach staged commit`);
}

await validateInputs();
const staged = await stageTrees();
pushStageRef(controlDir, staged.mainCommit, stageMain);
pushStageRef(mobileDir, staged.mobileCommit, stageMobile);
ensureDraftRelease(staged.mobileCommit);
await verifyReleaseAssets(true);
pushOfficial(mobileDir, staged.mobileCommit, 'Mobile', manifest.expectedHeads.mobile);
pushOfficial(controlDir, staged.mainCommit, 'main', manifest.expectedHeads.main);
run('gh', ['release', 'edit', tag, '--repo', repository, '--draft=false']);
await verifyReleaseAssets(false);

const canonicalBytes = run('gh', [
    'api',
    '-H', 'Accept: application/vnd.github.raw+json',
    `repos/${repository}/contents/Dc_UserFilter_Mobile.user.js?ref=Mobile`,
], { binary: true });
if (canonicalBytes.length !== manifest.artifact.bytes || digest(canonicalBytes) !== manifest.artifact.sha256) throw new Error('canonical Mobile artifact digest mismatch after publication');
const tagHead = git(controlDir, ['ls-remote', 'origin', `refs/tags/${tag}`]).split(/\s+/)[0];
if (tagHead !== staged.mobileCommit) throw new Error(`tag ${tag} does not point to the Mobile release commit`);

for (const branch of [stageMain, stageMobile]) {
    const existing = git(controlDir, ['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s+/)[0] || null;
    if (existing) git(controlDir, ['push', 'origin', '--delete', branch]);
}
const publicationReceipt = {
    status: 'published',
    version,
    sourceSha: manifest.sourceSha,
    artifactSha256: manifest.artifact.sha256,
    mainCommit: staged.mainCommit,
    mobileCommit: staged.mobileCommit,
    tag,
    pcSha256: staged.pcSha256,
};
if (process.env.PUBLISH_RECEIPT_PATH) {
    await writeFile(path.resolve(process.env.PUBLISH_RECEIPT_PATH), `${JSON.stringify(publicationReceipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(publicationReceipt, null, 2));
