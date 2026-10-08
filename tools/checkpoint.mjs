import { readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateCheckpointPolicy, validateCheckpointFiles, assertCheckpointContext, publishCheckpoint, pushCheckpoint, observeCheckpointCI } from './checkpoint-core.mjs';

const toolRoot = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const git = args => {
    if (['add','commit','push'].includes(args[0])) {
        // Re-read the destination at every mutation boundary, including after validation/hooks.
        const readGit=readArgs=>{const checked=spawnSync('git',readArgs,{cwd:toolRoot,encoding:'utf8',shell:false});assert.equal(checked.status,0);return checked.stdout.trim();};
        assertCheckpointContext({cwd:realpathSync(process.cwd()),toolRoot,gitRoot:realpathSync(readGit(['rev-parse','--show-toplevel'])),branch:readGit(['branch','--show-current']),remote:readGit(['remote','get-url','origin']),upstream:readGit(['rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}'])},policy);
        const freshPolicy=readFileSync(path.join(toolRoot,'verification/checkpoint-policy.json'),'utf8').replace(/\r\n/g,'\n');
        assert.equal(createHash('sha256').update(freshPolicy).digest('hex'),policySha256,'policy changed during checkpoint');
    }
    const result = spawnSync('git', args, { cwd: toolRoot, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${(args[0]==='diff'?result.stdout:'')}${result.stderr.trim()}`);
    return result.stdout;
};
const policyBytes = readFileSync(path.join(toolRoot, 'verification/checkpoint-policy.json'));
const policy = validateCheckpointPolicy(JSON.parse(policyBytes));
const policySha256 = createHash('sha256').update(policyBytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
const context = {
    cwd: realpathSync(process.cwd()), toolRoot,
    gitRoot: realpathSync(git(['rev-parse', '--show-toplevel']).trim()),
    branch: git(['branch', '--show-current']).trim(),
    remote: git(['remote', 'get-url', 'origin']).trim(),
    upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).trim(),
};
assertCheckpointContext(context, policy);
const args = process.argv.slice(2);
const command = args.shift() || 'inspect';
const options = {};
while (args.length) {
    const key = args.shift();
    assert.ok(['--paths-file', '--message', '--expected-remote', '--commit'].includes(key) && args.length && !Object.hasOwn(options, key), 'unknown/duplicate/missing option');
    options[key] = args.shift();
}
const receiptPath = commit => {
    assert.match(commit, /^[a-f0-9]{40}$/);
    return path.join(toolRoot, 'artifacts/checkpoints', `${commit}.json`);
};
const save = receipt => {
    mkdirSync(path.dirname(receiptPath(receipt.commit)), { recursive: true });
    writeFileSync(receiptPath(receipt.commit), `${JSON.stringify(receipt, null, 2)}\n`);
};
const remoteHead = async () => {
    const output = git(['ls-remote', 'origin', `refs/heads/${policy.branch}`]).trim();
    const [sha, ref] = output.split(/\s+/);
    assert.match(sha || '', /^[a-f0-9]{40}$/);
    assert.equal(ref, `refs/heads/${policy.branch}`);
    return sha;
};
const verifyFiles = () => {
    assert.equal(git(['diff', '--name-only']).trim(), '', 'all tracked validation inputs must equal the staged tree');
    const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).filter(file => file !== 'debug.log');
    assert.equal(untracked.length, 0, `unselected untracked validation inputs: ${untracked.join(', ')}`);
};
const checkBoundary = () => {
    assertCheckpointContext({cwd:realpathSync(process.cwd()),toolRoot,gitRoot:realpathSync(git(['rev-parse','--show-toplevel']).trim()),branch:git(['branch','--show-current']).trim(),remote:git(['remote','get-url','origin']).trim(),upstream:git(['rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}']).trim()},policy);
    verifyFiles();
    assert.equal(createHash('sha256').update(readFileSync(path.join(toolRoot,'verification/checkpoint-policy.json'),'utf8').replace(/\r\n/g,'\n')).digest('hex'),policySha256,'policy changed during checkpoint');
};
if (command === 'inspect') {
    assert.equal(Object.keys(options).length, 0);
    console.log(JSON.stringify({ root: toolRoot, branch: context.branch, head: git(['rev-parse', 'HEAD']).trim(), policySha256, scope: 'CHECKPOINT_ONLY', workSuccessCertified: false }, null, 2));
} else if (command === 'publish') {
    assert.deepEqual(Object.keys(options).sort(), ['--expected-remote', '--message', '--paths-file']);
    const paths = JSON.parse(readFileSync(path.resolve(process.cwd(), options['--paths-file']), 'utf8'));
    validateCheckpointFiles(paths, relative => {
        const absolute = path.join(toolRoot, relative);
        let ancestor = path.dirname(absolute);
        while (ancestor !== toolRoot) {
            if (existsSync(ancestor)) assert.ok(!lstatSync(ancestor).isSymbolicLink(), 'symlink/junction ancestor forbidden');
            ancestor = path.dirname(ancestor);
        }
        if (existsSync(absolute)) {
            const entry=lstatSync(absolute);
            return {file:entry.isFile(),symlink:entry.isSymbolicLink()};
        }
        return {deletedTrackedFile:/^(100644|100755) /.test(git(['ls-files','--stage','--',relative]))};
    });
    const receipt = await publishCheckpoint({ git, remoteHead, checkBoundary, save, paths, message: options['--message'], expectedRemote: options['--expected-remote'], policySha256,
        validate: async () => {
            verifyFiles();
            git(['diff', '--cached', '--check']);
            const result = spawnSync(process.execPath, policy.localValidation.slice(1), { cwd: toolRoot, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 });
            process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
            assert.equal(result.status, 0, 'checkpoint validation failed; intentional paths remain staged');
            verifyFiles();
        },
    });
    console.log(JSON.stringify(receipt, null, 2));
    if (receipt.status === 'COMMITTED_PENDING_PUSH') process.exitCode = 2;
} else if (command === 'resume') {
    assert.deepEqual(Object.keys(options).sort(), ['--commit', '--expected-remote']);
    const receipt = JSON.parse(readFileSync(receiptPath(options['--commit']), 'utf8'));
    assert.equal(receipt.commit, options['--commit']);
    assert.equal(receipt.expectedRemote, options['--expected-remote']);
    assert.equal(receipt.policySha256, policySha256, 'policy changed after validation');
    assert.equal(receipt.validation, 'LOCAL_VALIDATED');
    verifyFiles();
    const resumed=await pushCheckpoint({ git, remoteHead, checkBoundary, save, receipt });
    console.log(JSON.stringify(resumed, null, 2));
    if (resumed.status === 'COMMITTED_PENDING_PUSH') process.exitCode = 2;
} else if (command === 'verify-ci') {
    assert.deepEqual(Object.keys(options), ['--commit']);
    const receipt = JSON.parse(readFileSync(receiptPath(options['--commit']), 'utf8'));
    assert.equal(receipt.commit, options['--commit']);
    assert.equal(receipt.policySha256, policySha256, 'CI receipt policy drift');
    assert.equal(receipt.validation, 'LOCAL_VALIDATED');
    checkBoundary();
    assert.equal(git(['rev-parse','HEAD']).trim(),receipt.commit,'CI verification requires the same current checkpoint');
    const api = route => {
        const result = spawnSync('gh', ['api', route], { cwd: toolRoot, encoding: 'utf8', shell: false });
        if (result.status !== 0) throw new Error('GitHub CI read failed; status remains pending');
        return JSON.parse(result.stdout);
    };
    const runs = api(`repos/${policy.repository}/actions/runs?head_sha=${receipt.commit}&event=push&per_page=100`).workflow_runs;
    const run = runs.filter(item => item.name === policy.workflowName).sort((a, b) => b.id - a.id)[0];
    const jobs=run ? api(`repos/${policy.repository}/actions/runs/${run.id}/jobs?per_page=100`).jobs : [];
    receipt.observedRemote=await remoteHead();
    checkBoundary();
    assert.equal(git(['rev-parse','HEAD']).trim(),receipt.commit,'HEAD moved during CI verification');
    receipt.ci = observeCheckpointCI(run, jobs, receipt.commit, receipt.observedRemote);
    receipt.status = receipt.ci.status;
    await save(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    if (receipt.status === 'REMOTE_SYNCED_CI_PENDING') process.exitCode = 2;
} else throw new Error('Use inspect, publish, resume or verify-ci. No release/dispatch operation exists.');
