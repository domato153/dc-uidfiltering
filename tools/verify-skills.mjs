import { createHash } from 'node:crypto';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(rootDir, '.agents', 'skills');
const expectedSkills = [
    'dcuf-evidence-adversarial-selection',
    'dcuf-long-work-continuity',
    'dcuf-release',
    'dcuf-semantic-architecture',
    'dcuf-semantic-preservation',
    'dcuf-ui-surface-maintainer',
    'dom-safety-audit',
    'metadata-safety',
];
const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

const entries = await readdir(skillsDir, { withFileTypes: true });
const actualSkills = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
check(JSON.stringify(actualSkills) === JSON.stringify(expectedSkills), `active skill set differs: ${actualSkills.join(', ')}`);

for (const skill of actualSkills) {
    const skillPath = path.join(skillsDir, skill, 'SKILL.md');
    const openaiPath = path.join(skillsDir, skill, 'agents', 'openai.yaml');
    const text = await readFile(skillPath, 'utf8');
    const frontmatter = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
    check(Boolean(frontmatter), `${skill}: malformed frontmatter`);
    if (frontmatter) {
        const fields = frontmatter[1].split('\n').filter(Boolean).map((line) => line.split(':', 1)[0]).sort();
        check(JSON.stringify(fields) === JSON.stringify(['description', 'name']), `${skill}: frontmatter must contain only name and description`);
        check(frontmatter[1].includes(`name: ${skill}`), `${skill}: frontmatter name mismatch`);
    }
    check(!text.includes('[TODO'), `${skill}: unfinished TODO remains`);
    check(text.length <= 5000, `${skill}: SKILL.md exceeds 5000 characters`);
    check(await exists(openaiPath), `${skill}: agents/openai.yaml is missing`);
    if (await exists(openaiPath)) check((await readFile(openaiPath, 'utf8')).includes(`$${skill}`), `${skill}: default_prompt does not mention the skill`);
}

const routing = JSON.parse(await readFile(path.join(rootDir, 'verification', 'skill-routing-cases.json'), 'utf8'));
const continuity = JSON.parse(await readFile(path.join(rootDir, 'verification', 'continuity-contract.json'), 'utf8'));
check(new Set(routing.cases.map((item) => item.id)).size === routing.cases.length, 'routing corpus has duplicate case ids');
const categories = new Set(routing.cases.map((item) => item.category));
for (const required of ['positive', 'negative', 'overlap', 'paraphrase', 'held-out']) check(categories.has(required), `routing corpus lacks ${required} cases`);
for (const item of routing.cases) {
    check(Boolean(item.id && item.request), 'routing case is missing id or request');
    for (const skill of [...item.expectedSkills, ...item.excludedSkills]) check(expectedSkills.includes(skill), `${item.id}: unknown skill ${skill}`);
    check(!item.expectedSkills.some((skill) => item.excludedSkills.includes(skill)), `${item.id}: skill is both expected and excluded`);
}
for (const skill of expectedSkills) {
    check(routing.cases.some((item) => item.expectedSkills.includes(skill)), `${skill}: no positive routing case`);
    check(routing.cases.some((item) => item.excludedSkills.includes(skill)), `${skill}: no negative routing case`);
}
const routingById = new Map(routing.cases.map((item) => [item.id, item]));
for (const [caseId, requiredSkills, excludedSkills] of [
    ['architecture-live-positive', ['dcuf-semantic-architecture'], ['dcuf-release']],
    ['architecture-live-overlap', ['dcuf-semantic-architecture', 'dcuf-ui-surface-maintainer', 'dom-safety-audit', 'dcuf-long-work-continuity'], ['dcuf-release']],
    ['architecture-live-held-out', ['dcuf-semantic-architecture', 'dcuf-ui-surface-maintainer'], ['dcuf-release']],
    ['architecture-local-negative', ['dcuf-ui-surface-maintainer'], ['dcuf-semantic-architecture']],
    ['evidence-research-overlap', ['dcuf-evidence-adversarial-selection', 'dcuf-semantic-architecture'], ['dcuf-release']],
    ['evidence-local-negative', [], ['dcuf-evidence-adversarial-selection']],
    ['evidence-research-held-out', ['dcuf-evidence-adversarial-selection', 'dcuf-ui-surface-maintainer'], ['dcuf-release']],
    ['continuity-decision-overlap', ['dcuf-long-work-continuity', 'dcuf-evidence-adversarial-selection'], ['dcuf-release']],
    ['continuity-decision-held-out', ['dcuf-long-work-continuity', 'dcuf-evidence-adversarial-selection'], ['dcuf-release']],
    ['continuity-handoff-overlap', ['dcuf-long-work-continuity', 'dcuf-semantic-preservation'], ['dcuf-release']],
    ['continuity-handoff-held-out', ['dcuf-long-work-continuity'], ['dcuf-release']],
]) {
    const item = routingById.get(caseId);
    check(Boolean(item), `required routing case is missing: ${caseId}`);
    for (const skill of requiredSkills) check(item?.expectedSkills.includes(skill), `${caseId}: expected skill missing: ${skill}`);
    for (const skill of excludedSkills) check(item?.excludedSkills.includes(skill), `${caseId}: excluded skill missing: ${skill}`);
}
const architectureSkill = await readFile(path.join(skillsDir, 'dcuf-semantic-architecture', 'SKILL.md'), 'utf8');
check(architectureSkill.includes('live architecture map') && architectureSkill.includes('tools/inspect-live-architecture.mjs --check'),
    'semantic architecture skill no longer routes live map inspection and its gate');

const continuityCases = routing.cases.filter((item) => item.expectedSkills.includes('dcuf-long-work-continuity'));
for (const category of ['positive', 'paraphrase', 'held-out', 'overlap']) {
    check(continuityCases.some((item) => item.category === category), `dcuf-long-work-continuity: no ${category} routing case`);
}
const continuitySkillPath = path.join(rootDir, continuity.thinRouter.skillPath);
const continuitySkillText = await readFile(continuitySkillPath, 'utf8');
check(continuitySkillText.length <= continuity.thinRouter.maxEntrypointCharacters,
    'dcuf-long-work-continuity: thin router exceeds its machine limit');
check(continuitySkillText.includes('(references/retrieval-contract.md)'),
    'dcuf-long-work-continuity: detail reference is not routed from SKILL.md');
check(continuitySkillText.includes('(references/handoff-contract.md)'),
    'dcuf-long-work-continuity: cold-start handoff reference is not routed from SKILL.md');
check(!/[a-f0-9]{40}(?:[a-f0-9]{24})?/i.test(continuitySkillText),
    'dcuf-long-work-continuity: current commit or artifact fact leaked into the thin router');
const evidenceSkillText = await readFile(path.join(skillsDir, 'dcuf-evidence-adversarial-selection', 'SKILL.md'), 'utf8');
check(evidenceSkillText.includes('(references/research-contract.md)'),
    'dcuf-evidence-adversarial-selection: research detail reference is not routed from SKILL.md');
for (const concept of continuity.retrievalConcepts || []) {
    for (const caseId of concept.routingCaseIds || []) {
        const item = routing.cases.find((candidate) => candidate.id === caseId);
        check(Boolean(item), `dcuf-long-work-continuity: missing routed case ${caseId}`);
        check(item?.expectedSkills.includes('dcuf-long-work-continuity'),
            `dcuf-long-work-continuity: ${caseId} does not select the continuity skill`);
    }
}

const vendorRoot = path.join(rootDir, 'vendor', 'agent-method-sectors', 'mattpocock-skills', '6654f6b60cd9d5be8b54c6fafe44346dabeb3b76');
const manifest = JSON.parse(await readFile(path.join(vendorRoot, 'UPSTREAM_MANIFEST.json'), 'utf8'));
check(manifest.upstream.commit === '6654f6b60cd9d5be8b54c6fafe44346dabeb3b76', 'vendor commit pin mismatch');
check(manifest.discoveryIsolation?.upstreamBytesAreInert === true, 'vendor source is not declared inert');
check(await exists(path.join(vendorRoot, 'LICENSE')), 'vendor MIT LICENSE is missing');
for (const file of manifest.files || []) {
    const absolute = path.join(vendorRoot, ...file.path.split('/'));
    check(await exists(absolute), `vendor file is missing: ${file.path}`);
    if (await exists(absolute)) check(sha256(await readFile(absolute)) === file.sha256, `vendor hash mismatch: ${file.path}`);
}

const buildTargetsText = await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8');
check(!buildTargetsText.includes('vendor/agent-method-sectors'), 'vendored methods entered product build inputs');

if (failures.length) {
    console.error('Skill verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Skill verification passed: ${actualSkills.length} active DCUF skills, ${routing.cases.length} routing cases, ${continuity.retrievalConcepts.length} continuity concepts, ${manifest.files.length} pinned vendor files.`);
}
