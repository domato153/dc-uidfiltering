import { parse } from 'acorn';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'architecture', 'registry.json'), 'utf8'));
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

for (const component of registry.components) {
    if (component.layer !== 'presentation-ui' || component.boundaryState !== 'conforming') continue;
    for (const reference of component.sourceRefs) {
        if (reference.includes('*')) continue;
        const absolutePath = path.join(rootDir, reference);
        const source = await readFile(absolutePath, 'utf8');
        const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowAwaitOutsideFunction: true });
        filesChecked += 1;
        visit(ast, null, (identifier, line) => failures.push(`${reference}:${line}: presentation directly references ${identifier}`));
    }
}

if (failures.length) {
    console.error('UI boundary verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`UI boundary verification passed: ${filesChecked} conforming presentation files checked.`);
}
