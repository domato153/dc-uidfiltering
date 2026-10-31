import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectSurfaceLinks } from './inspect-live-architecture.mjs';

const source = 'src/targets/mobile/example-presenter.js';
const testRef = 'testbed/example.mjs';
const styleId = 'dcuf-example-style';

function fixture() {
    return {
        registry: { components: [{ id: 'example', layer: 'presentation', sourceRefs: [source] }] },
        targets: { mobile: { inputs: [{ path: source }] }, pc: { inputs: [] } },
        surfaces: [{
            id: 'example-surface', state: 'modern-candidate', risk: 'R2', currentVisualOwner: 'example',
            adapter: 'example-host', presenter: 'example', routeFamilies: ['list'],
            sourceRefs: [source], styleIds: [styleId], testRefs: [testRef], canaryCheckpoint: 'settings-list',
        }],
        sourceTexts: new Map([[source, `const STYLE_ID = '${styleId}';`]]),
        existingPaths: new Set([source, testRef]),
    };
}

test('valid effective architecture and surface links have no findings', () => {
    const result = inspectSurfaceLinks(fixture());
    assert.deepEqual(result.findings, []);
    assert.equal(result.surfaces[0].sources[0].component, 'example');
    assert.deepEqual(result.surfaces[0].styles[0].sourceRefs, [source]);
});

test('a source omitted from the mobile build cannot be called live', () => {
    const input = fixture();
    input.targets.mobile.inputs = [];
    assert.match(inspectSurfaceLinks(input).findings.join('\n'), /absent from mobile build/);
});

test('missing source, owner, style, and test are reported separately', () => {
    const input = fixture();
    input.registry.components = [];
    input.sourceTexts.clear();
    input.existingPaths.clear();
    const findings = inspectSurfaceLinks(input).findings.join('\n');
    for (const expected of ['missing source', '0 exact architecture owners', 'style ID has no listed source owner', 'missing test']) {
        assert.ok(findings.includes(expected), `missing finding: ${expected}`);
    }
});
