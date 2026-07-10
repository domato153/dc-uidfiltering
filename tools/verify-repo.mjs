import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedMode = process.argv[2] || 'all';
const validModes = new Set(['guidance', 'release', 'all']);
const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

function normalizeNewlines(text) {
    return text.replace(/\r\n/g, '\n');
}

function parseSkillFrontmatter(text, skillName) {
    const normalized = normalizeNewlines(text);
    const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    check(Boolean(match), `${skillName}: missing or malformed YAML frontmatter`);
    if (!match) return {};

    const fields = {};
    for (const line of match[1].split('\n')) {
        if (!line.trim()) continue;
        const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        check(Boolean(field), `${skillName}: malformed frontmatter line: ${line}`);
        if (field) fields[field[1]] = field[2].trim();
    }
    return fields;
}

async function verifyGuidance() {
    const agentsPath = path.join(rootDir, 'AGENTS.md');
    const skillsDir = path.join(rootDir, '.agents', 'skills');
    const agentsText = await readFile(agentsPath, 'utf8');
    const expectedSkills = ['dcuf-release', 'dom-safety-audit', 'metadata-safety'];
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const actualSkills = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    check(agentsText.length <= 3500, `AGENTS.md is ${agentsText.length} characters; limit is 3500`);
    check(JSON.stringify(actualSkills) === JSON.stringify(expectedSkills),
        `active skills are [${actualSkills.join(', ')}]; expected [${expectedSkills.join(', ')}]`);

    let totalSkillChars = 0;
    for (const skillName of actualSkills) {
        const skillDir = path.join(skillsDir, skillName);
        const skillPath = path.join(skillDir, 'SKILL.md');
        const openaiPath = path.join(skillDir, 'agents', 'openai.yaml');
        const skillText = await readFile(skillPath, 'utf8');
        totalSkillChars += skillText.length;

        const fields = parseSkillFrontmatter(skillText, skillName);
        const fieldNames = Object.keys(fields).sort();
        check(JSON.stringify(fieldNames) === JSON.stringify(['description', 'name']),
            `${skillName}: frontmatter fields must be exactly name and description`);
        check(fields.name === skillName, `${skillName}: frontmatter name is ${fields.name || '(missing)'}`);
        check(Boolean(fields.description), `${skillName}: description is empty`);
        check((fields.description || '').length <= 400,
            `${skillName}: description is ${(fields.description || '').length} characters; limit is 400`);
        check(!/Pair With|Reporting Notes/.test(skillText),
            `${skillName}: obsolete chaining or reporting template remains`);
        check(await exists(openaiPath), `${skillName}: agents/openai.yaml is missing`);

        if (await exists(openaiPath)) {
            const openaiText = await readFile(openaiPath, 'utf8');
            check(openaiText.includes(`$${skillName}`), `${skillName}: default_prompt must mention $${skillName}`);
        }
    }

    check(totalSkillChars <= 7000, `SKILL.md total is ${totalSkillChars} characters; limit is 7000`);
    check(await exists(path.join(skillsDir, 'dcuf-release', 'references', 'manual-smoke.md')),
        'dcuf-release: references/manual-smoke.md is missing');

    console.log('Guidance metrics');
    console.log(` - AGENTS.md: ${agentsText.length}/3500 characters`);
    console.log(` - active skills: ${actualSkills.length}/3`);
    console.log(` - SKILL.md total: ${totalSkillChars}/7000 characters`);
}

function parseBuildVersion(buildText, buildPath) {
    const match = buildText.match(/const VERSION = ['"]([^'"]+)['"];?/);
    check(Boolean(match), `${buildPath}: unable to read VERSION`);
    return match?.[1];
}

async function verifyReleaseTarget(target) {
    const buildPath = path.join(rootDir, target.buildFile);
    const buildText = await readFile(buildPath, 'utf8');
    const version = parseBuildVersion(buildText, target.buildFile);
    if (!version) return;

    const outputName = target.outputName(version);
    const rootPath = path.join(rootDir, outputName);
    const distPath = path.join(rootDir, 'dist', outputName);
    check(await exists(rootPath), `${target.name}: root output is missing: ${outputName}`);
    check(await exists(distPath), `${target.name}: dist output is missing: dist/${outputName}`);
    if (!(await exists(rootPath)) || !(await exists(distPath))) return;

    const [rootBytes, distBytes] = await Promise.all([readFile(rootPath), readFile(distPath)]);
    const rootHash = createHash('sha256').update(rootBytes).digest('hex').toUpperCase();
    const distHash = createHash('sha256').update(distBytes).digest('hex').toUpperCase();
    const text = rootBytes.toString('utf8');
    const metadataVersion = text.match(/^\/\/ @version\s+([^\r\n]+)$/m)?.[1]?.trim();
    const hasBom = rootBytes.length >= 3
        && rootBytes[0] === 0xef
        && rootBytes[1] === 0xbb
        && rootBytes[2] === 0xbf;

    check(rootBytes.equals(distBytes), `${target.name}: root and dist bytes differ`);
    check(rootHash === distHash, `${target.name}: root and dist SHA-256 differ`);
    check(hasBom, `${target.name}: UTF-8 BOM is missing`);
    check(metadataVersion === version,
        `${target.name}: @version is ${metadataVersion || '(missing)'}; expected ${version}`);
    check(!text.includes('__VERSION__'), `${target.name}: unresolved __VERSION__ token remains`);
    check(text.includes(`v${version}`), `${target.name}: versioned init text v${version} is missing`);
    check(/DEBUG_ENABLED:\s*false/.test(text), `${target.name}: DEBUG_ENABLED is not false`);

    const syntax = spawnSync(process.execPath, ['--check', rootPath], { encoding: 'utf8' });
    check(syntax.status === 0,
        `${target.name}: node --check failed${syntax.stderr ? `: ${syntax.stderr.trim()}` : ''}`);

    console.log(`${target.name} release`);
    console.log(` - version: ${version}`);
    console.log(` - output: ${outputName}`);
    console.log(` - SHA-256: ${rootHash}`);
}

async function verifyRelease() {
    const targets = [
        {
            name: 'mobile',
            buildFile: 'tools/build-userscript.mjs',
            outputName: (version) => `Dc_UserFilter_Mobile_v${version}.user.js`
        },
        {
            name: 'pc',
            buildFile: 'tools/build-pc-filter-userscript.mjs',
            outputName: (version) => `dcinside_user_filter_v${version}.user.js`
        }
    ];

    for (const target of targets) await verifyReleaseTarget(target);
}

async function main() {
    if (!validModes.has(requestedMode)) {
        console.error('Usage: node tools/verify-repo.mjs [guidance|release|all]');
        process.exitCode = 2;
        return;
    }

    try {
        if (requestedMode === 'guidance' || requestedMode === 'all') await verifyGuidance();
        if (requestedMode === 'release' || requestedMode === 'all') await verifyRelease();
    } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
    }

    if (failures.length) {
        console.error('\nVerification failed:');
        for (const failure of failures) console.error(` - ${failure}`);
        process.exitCode = 1;
        return;
    }

    console.log('\nVerification passed.');
}

await main();
