import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedMode = process.argv[2] || 'all';
const validModes = new Set(['guidance', 'release', 'all']);
const failures = [];
const AGENTS_CHAR_LIMIT = 9000;
const SKILLS_CHAR_LIMIT = 24000;
const BOARD_MATCHES = [
    'https://gall.dcinside.com/board/*',
    'https://gall.dcinside.com/mgallery/board/*',
    'https://gall.dcinside.com/mini/board/*'
];

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
    const expectedSkills = [
        'dcuf-evidence-adversarial-selection',
        'dcuf-long-work-continuity',
        'dcuf-release',
        'dcuf-semantic-architecture',
        'dcuf-semantic-preservation',
        'dcuf-ui-surface-maintainer',
        'dom-safety-audit',
        'metadata-safety'
    ];
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const actualSkills = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    check(agentsText.length <= AGENTS_CHAR_LIMIT,
        `AGENTS.md is ${agentsText.length} characters; limit is ${AGENTS_CHAR_LIMIT}`);
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

    check(totalSkillChars <= SKILLS_CHAR_LIMIT,
        `SKILL.md total is ${totalSkillChars} characters; limit is ${SKILLS_CHAR_LIMIT}`);
    check(await exists(path.join(skillsDir, 'dcuf-release', 'references', 'manual-smoke.md')),
        'dcuf-release: references/manual-smoke.md is missing');

    const governanceInvariants = [
        ['protected_development_branch', /codex\/mobile-development[\s\S]*protected accepted development branch/i],
        ['fresh_remote_authority', /verify the origin URL and live `refs\/heads\/<branch>`/i],
        ['semantic_registry_authority', /architecture\/registry\.json[\s\S]*semantic\/layer authority/i],
        ['candidate_promotion', /candidate overlay[\s\S]*deterministic promotion/i],
        ['impact_graph', /merge-base paths[\s\S]*downstream registry relations/i],
        ['evidence_invalidation', /SUT[\s\S]*oracle dependency[\s\S]*fixture[\s\S]*harness[\s\S]*toolchain[\s\S]*route/i],
        ['skill_not_authority', /Skill selection[\s\S]*never grant[\s\S]*release authority/i],
        ['release_asset_truth', /attached userscript and checksum[\s\S]*Never[\s\S]*asset is missing or mismatched/i]
    ];
    governanceInvariants.forEach(([name, pattern]) => {
        check(pattern.test(agentsText), `governance invariant ${name}: AGENTS.md is missing the required contract`);
    });

    for (const [label, script] of [
        ['architecture', 'tools/architecture-registry.mjs'],
        ['skills', 'tools/verify-skills.mjs'],
        ['UI boundaries', 'tools/verify-ui-boundaries.mjs'],
        ['workflows', 'tools/verify-workflows.mjs']
    ]) {
        const result = spawnSync(process.execPath, [script, ...(label === 'architecture' ? ['validate'] : [])], {
            cwd: rootDir,
            encoding: 'utf8'
        });
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        check(result.status === 0, `${label} verification failed`);
    }

    console.log('Guidance metrics');
    console.log(` - AGENTS.md: ${agentsText.length}/${AGENTS_CHAR_LIMIT} characters`);
    console.log(` - active skills: ${actualSkills.length}/${expectedSkills.length}`);
    console.log(` - SKILL.md total: ${totalSkillChars}/${SKILLS_CHAR_LIMIT} characters`);
}

async function readBuildTargets() {
    const manifestPath = path.join(rootDir, 'build', 'targets.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    check(manifest.schemaVersion === 1, 'build/targets.json: schemaVersion must be 1');
    check(Boolean(manifest.targets?.mobile), 'build/targets.json: mobile target is missing');
    check(Boolean(manifest.targets?.pc), 'build/targets.json: pc target is missing');

    for (const [targetName, target] of Object.entries(manifest.targets || {})) {
        check(Boolean(target.version), `build/targets.json: ${targetName} version is missing`);
        check(target.outputPattern?.includes('{version}'),
            `build/targets.json: ${targetName} outputPattern must contain {version}`);
        const paths = (target.inputs || []).map((input) => input.path);
        check(paths.length > 0, `build/targets.json: ${targetName} inputs are missing`);
        check(new Set(paths).size === paths.length,
            `build/targets.json: ${targetName} contains duplicate input paths`);
        for (const input of target.inputs || []) {
            check(Boolean(input.role), `build/targets.json: ${targetName} input role is missing for ${input.path || '(missing path)'}`);
            check(Boolean(input.path), `build/targets.json: ${targetName} input path is missing`);
            if (input.path) check(await exists(path.join(rootDir, input.path)),
                `build/targets.json: ${targetName} input does not exist: ${input.path}`);
        }
    }

    return manifest.targets;
}

async function verifyMobileSourceContracts() {
    const [bootstrap, postMain, coordinator, theme, convenience, mobileHeader, pcHeader] = await Promise.all([
        readFile(path.join(rootDir, 'src', 'runtime', 'bootstrap.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'post-main-fixes.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'runtime-coordinator.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'theme-module.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'convenience-module.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'meta', 'userscript-header.txt'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'meta', 'pc-filter-userscript-header.txt'), 'utf8')
    ]);

    check(!/pageType\s*===\s*['"]list['"]/.test(bootstrap),
        "mobile source: singular pageType 'list' typo returned");
    check(bootstrap.includes('if (!pageContext.isTargetPage) return;'),
        'mobile source: non-target page early return is missing');
    check(!/addEventListener\(\s*['"]unload['"]/.test(bootstrap),
        'mobile source: unload listener would opt production out of bfcache');
    check(coordinator.includes("window.addEventListener('pageshow'") && coordinator.includes('recoverFromBfcache(event)'),
        'mobile source: explicit persisted pageshow recovery is missing');

    for (const [label, header] of [['mobile', mobileHeader], ['pc', pcHeader]]) {
        const matches = Array.from(header.matchAll(/^\/\/ @match\s+([^\r\n]+)$/gm), (match) => match[1].trim());
        check(JSON.stringify(matches) === JSON.stringify(BOARD_MATCHES),
            `${label} metadata: @match scope is [${matches.join(', ')}]; expected board routes only`);
        check(!header.includes('https://gall.dcinside.com/*'), `${label} metadata: broad origin @match returned`);
    }

    const listGuardIndex = postMain.indexOf("if (!__dcufPageSupports('list-surface')) return;");
    const listStyleIndex = postMain.indexOf("const STYLE_ID = 'dcuf-phase1-list-theme';");
    check(listGuardIndex >= 0 && listStyleIndex >= 0 && listGuardIndex < listStyleIndex,
        'mobile source: phase-1 list CSS must be guarded by list-surface before injection');
    check(!postMain.includes('scheduleVerify'),
        'mobile source: superseded repeated phase-1 verification timers returned');
    check(!/\bmasterDisabled\b|_masterDisabledSnapshot/.test(convenience),
        'mobile source: convenience features must not reference the filter master-disabled state');

    check(coordinator.includes('mutationNodeTouchesSurface(node)'),
        'mobile source: child-list surface prefilter helper is missing');
    check(!coordinator.includes("if (record.type === 'childList') return !this.isScriptOwnedElement(record.target);"),
        'mobile source: broad child-list pass-through returned');

    for (const token of [
        '--dcuf-theme-accent',
        '--dcuf-theme-accent-strong',
        '--dcuf-theme-border',
        '--dcuf-theme-surface',
        '--dcuf-theme-surface-raised',
        '--dcuf-theme-surface-muted'
    ]) {
        check(theme.includes(token), `mobile source: palette token is missing: ${token}`);
    }
    for (const selector of [
        '.list_array_option .btn_write',
        '.custom-bottom-controls .bottom_paging_box > em',
        '.custom-bottom-controls .dcuf-search-card form[name="frmSearch"] .bnt_search',
        '#container.gallery_view .view_bottom_btnbox .btn_blue',
        'form.dcuf-write-form .btn_bottom_box .btn_blue'
    ]) {
        check(theme.includes(selector), `mobile source: palette selector is missing: ${selector}`);
    }

    console.log('Mobile source contracts');
    console.log(' - page scope, page type, lifecycle, mutation routing, and palette selectors checked');
}

async function verifyReleaseTarget(target, buildTarget) {
    const buildPath = path.join(rootDir, target.buildFile);
    const version = buildTarget.version;
    if (!version) return;

    const outputName = buildTarget.outputPattern.replace('{version}', version);
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
    const metadataMatches = Array.from(text.matchAll(/^\/\/ @match\s+([^\r\n]+)$/gm), (match) => match[1].trim());
    const hasBom = rootBytes.length >= 3
        && rootBytes[0] === 0xef
        && rootBytes[1] === 0xbb
        && rootBytes[2] === 0xbf;

    check(rootBytes.equals(distBytes), `${target.name}: root and dist bytes differ`);
    check(rootHash === distHash, `${target.name}: root and dist SHA-256 differ`);
    check(hasBom, `${target.name}: UTF-8 BOM is missing`);
    check(metadataVersion === version,
        `${target.name}: @version is ${metadataVersion || '(missing)'}; expected ${version}`);
    check(JSON.stringify(metadataMatches) === JSON.stringify(target.expectedMatches),
        `${target.name}: @match scope is [${metadataMatches.join(', ')}]; expected [${target.expectedMatches.join(', ')}]`);
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
    await verifyMobileSourceContracts();
    const buildTargets = await readBuildTargets();
    const targets = [
        {
            key: 'mobile',
            name: 'mobile',
            buildFile: 'tools/build-userscript.mjs',
            expectedMatches: BOARD_MATCHES
        },
        {
            key: 'pc',
            name: 'pc',
            buildFile: 'tools/build-pc-filter-userscript.mjs',
            expectedMatches: BOARD_MATCHES
        }
    ];

    for (const target of targets) await verifyReleaseTarget(target, buildTargets[target.key]);
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
