import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEvidenceBinding } from './evidence-binding.mjs';
import { loadArchitectureState } from './architecture-state.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function valueAfter(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
}

function git(gitArgs) {
    const result = spawnSync('git', gitArgs, { cwd: rootDir, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${gitArgs.join(' ')} failed`);
    return result.stdout.trim();
}

function normalize(file) {
    return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function matches(reference, file) {
    const normalizedReference = normalize(reference);
    const normalizedFile = normalize(file);
    if (!normalizedReference.includes('*')) return normalizedReference === normalizedFile;
    const escaped = normalizedReference.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`).test(normalizedFile);
}

const gatesBytes = await readFile(path.join(rootDir, 'verification', 'gates.json'));
const architectureState = await loadArchitectureState(rootDir);
if (architectureState.candidateFailures.length) {
    throw new Error(`Invalid architecture candidate:\n${architectureState.candidateFailures.join('\n')}`);
}
const registry = architectureState.effective;
const gates = JSON.parse(gatesBytes);
const head = valueAfter('--head') || 'HEAD';
const base = valueAfter('--base') || `${head}^`;
const explicitFiles = valueAfter('--files');
const changedFiles = explicitFiles
    ? explicitFiles.split(',').map(normalize).filter(Boolean)
    : git(['diff', '--name-only', `${base}...${head}`]).split(/\r?\n/).map(normalize).filter(Boolean);
const selectedComponents = new Set();
const selectedProfiles = new Set(['policy']);
const unmappedFiles = [];

for (const file of changedFiles) {
    const matchesForFile = registry.components.filter((component) => component.sourceRefs.some((reference) => matches(reference, file)));
    if (matchesForFile.length) {
        for (const component of matchesForFile) selectedComponents.add(component.id);
        continue;
    }
    if (file === 'AGENTS.md' || /^(architecture|verification|vendor|\.agents)\//.test(file)) {
        selectedComponents.add('architecture-governance');
    } else if (/^(build|tools)\//.test(file)) {
        selectedProfiles.add('acceptance');
        unmappedFiles.push(file);
    } else if (/^docs\//.test(file)) {
        selectedProfiles.add(file === 'docs/ui-surface-contracts.md' ? 'mobile-focused' : 'policy');
    } else {
        selectedProfiles.add(gates.fallbackProfile);
        unmappedFiles.push(file);
    }
}

const queue = [...selectedComponents];
while (queue.length) {
    const componentId = queue.shift();
    for (const relation of registry.relations.filter((item) => item.from === componentId)) {
        if (!selectedComponents.has(relation.to)) {
            selectedComponents.add(relation.to);
            queue.push(relation.to);
        }
    }
}

for (const componentId of selectedComponents) {
    for (const profile of gates.componentProfiles[componentId] || [gates.fallbackProfile]) selectedProfiles.add(profile);
}
if (args.includes('--full')) selectedProfiles.add('acceptance');

const profileOrder = ['policy', 'mobile-focused', 'pc-focused', 'acceptance', 'promotion-windows', 'live-canary'];
const profiles = [...selectedProfiles].sort((a, b) => profileOrder.indexOf(a) - profileOrder.indexOf(b));
const receipt = {
    schemaVersion: 1,
    base: git(['rev-parse', base]),
    head: git(['rev-parse', head]),
    changedFiles,
    selectedComponents: [...selectedComponents].sort(),
    selectedProfiles: profiles,
    resolvedCommands: profiles.flatMap((profile) => (gates.profiles[profile]?.commands || []).map((item) => ({ profile, ...item }))),
    unmappedFiles: [...new Set(unmappedFiles)].sort(),
    evidenceBinding: await createEvidenceBinding(rootDir),
};

const output = valueAfter('--output');
if (output) {
    const outputPath = path.resolve(rootDir, output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
