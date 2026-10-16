import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifier = await readFile(path.join(rootDir, 'tools/verify-repo.mjs'), 'utf8');
const start = verifier.indexOf('async function verifyMobileSourceContracts() {');
const end = verifier.indexOf('async function verifyReleaseTarget(', start);
assert.ok(start >= 0 && end > start, 'Run the actual mobile source-contract consumer');
const coordinatorPath = path.join(rootDir, 'src/targets/mobile/runtime-coordinator.js');
const coordinator = await readFile(coordinatorPath, 'utf8');

async function observe(input) {
    const failures = [];
    const context = vm.createContext({
        rootDir, path,
        BOARD_MATCHES: [
            'https://gall.dcinside.com/board/*',
            'https://gall.dcinside.com/mgallery/board/*',
            'https://gall.dcinside.com/mini/board/*'
        ],
        readFile: (file, encoding) => file === coordinatorPath ? Promise.resolve(input) : readFile(file, encoding),
        check: (condition, message) => { if (!condition) failures.push(message); },
        console: { log() {} }
    });
    await vm.runInContext(`${verifier.slice(start, end)}\nverifyMobileSourceContracts();`, context);
    return failures;
}

const declaration = 'mutationNodeTouchesSurface(node, options) {';
assert.equal(coordinator.split(declaration).length - 1, 1);
const cases = [
    ['optional routing context is accepted', coordinator, []],
    ['legacy one-argument helper is accepted', coordinator.replaceAll('mutationNodeTouchesSurface(node, options)', 'mutationNodeTouchesSurface(node)'), []],
    ['formatted declaration is accepted', coordinator.replace(declaration, 'mutationNodeTouchesSurface (\n node,\n options\n) {'), []],
    ['surviving call cannot replace a missing declaration', coordinator.replace(declaration, 'removedSurfaceHelper(node, options) {'), ['prefilter helper is missing']],
    ['comment cannot replace a missing declaration', coordinator.replace(declaration, 'removedSurfaceHelper(node, options) {') + '\n// mutationNodeTouchesSurface(node)\n', ['prefilter helper is missing']],
    ['broad child-list admission is rejected', coordinator + "\nif (record.type === 'childList') return !this.isScriptOwnedElement(record.target);\n", ['broad child-list pass-through returned']]
];
for (const [name, input, expected] of cases) {
    const failures = await observe(input);
    assert.equal(failures.length, expected.length, `${name}: ${failures.join('; ')}`);
    expected.forEach((message, index) => assert.ok(failures[index].includes(message), name));
    console.log(`PASS ${name}`);
}
console.log(`Mobile source-contract controls: ${cases.length} passed.`);
