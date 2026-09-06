import { parse } from 'acorn';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArchitectureState } from './architecture-state.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mutationFlagIndex = process.argv.indexOf('--audit-inject-forbidden');
const mutationComponentId = mutationFlagIndex >= 0 ? process.argv[mutationFlagIndex + 1] : null;
if (mutationFlagIndex >= 0 && (!mutationComponentId || mutationComponentId.startsWith('--'))) {
    throw new Error('--audit-inject-forbidden requires a presentation component id');
}
const architectureState = await loadArchitectureState(rootDir);
if (architectureState.candidateFailures.length) {
    throw new Error(`Invalid architecture candidate:\n${architectureState.candidateFailures.join('\n')}`);
}
const registry = architectureState.effective;
const forbiddenIdentifiers = new Set([
    'GM_getValue',
    'GM_setValue',
    'GM_registerMenuCommand',
    'GM_xmlhttpRequest',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'MutationObserver',
    'localStorage',
    'sessionStorage',
    'document',
]);
const failures = [];
let filesChecked = 0;
let mutationInjected = false;

function visit(node, parent, report) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' && forbiddenIdentifiers.has(node.name)) {
        const isProperty = parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
        const isObjectKey = parent?.type === 'Property' && parent.key === node && !parent.computed;
        if (!isProperty && !isObjectKey) report(node.name, node.loc?.start.line || 0);
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        if (Array.isArray(value)) for (const child of value) visit(child, node, report);
        else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value, node, report);
    }
}

const presentationComponents = registry.components.filter((component) => (
    component.status !== 'retired'
    && component.layer === 'presentation-ui'
    && component.classification === 'presentation-source'
));

for (const component of presentationComponents) {
    let componentFilesChecked = 0;
    for (const reference of component.sourceRefs) {
        if (reference.includes('*')) {
            failures.push(`${component.id}: presentation source reference must be a concrete file: ${reference}`);
            continue;
        }
        const absolutePath = path.join(rootDir, reference);
        let source = await readFile(absolutePath, 'utf8');
        if (component.id === mutationComponentId && !mutationInjected) {
            source += '\nvoid GM_setValue;\n';
            mutationInjected = true;
        }
        const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowAwaitOutsideFunction: true });
        filesChecked += 1;
        componentFilesChecked += 1;
        visit(ast, null, (identifier, line) => failures.push(`${reference}:${line}: presentation directly references ${identifier}`));
    }
    if (componentFilesChecked === 0) failures.push(`${component.id}: no concrete presentation source file was checked`);
}

if (mutationComponentId && !mutationInjected) {
    failures.push(`audit mutation target is not an active presentation source component: ${mutationComponentId}`);
}

if (failures.length) {
    console.error('UI boundary verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`UI boundary verification passed: ${filesChecked} active presentation source files checked.`);
}
