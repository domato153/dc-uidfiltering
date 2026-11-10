import assert from 'node:assert/strict';
import { parse } from 'acorn';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// These are the existing thirteen pure CSS entry points, not a second selector
// registry. Read their production adapter inputs and call sites on every run.
const families = new Map([
    ['header-shell', ['HeaderShell', ['Theme', 'Reset', 'Style']]],
    ['gallery-page-head', ['GalleryPageHead', ['Theme', 'Style']]],
    ['header-gnb', ['HeaderGnb', ['Theme', 'Reset', 'Style']]],
    ['header-recent-visit', ['HeaderRecentVisit', ['Theme', 'Style']]],
    ['header-drawer', ['HeaderDrawer', ['Theme', 'Visibility', 'Style']]],
]);
const root = 'src/targets/mobile/';
export const generatedHeaderCssReferences = Object.freeze([...families.keys()].map(stem => `${root}${stem}-presenter.js`));
export function verifyGeneratedCssSources(surfaces) {
    const failures = [];
    const keys = new Set();
    for (const surface of surfaces) {
        if (Object.hasOwn(surface, 'generatedCssPayloads') && (!Array.isArray(surface.generatedCssPayloads) || !surface.generatedCssPayloads.length)) {
            failures.push('Generated CSS registrations must be a non-empty array');
            continue;
        }
        for (const item of surface.generatedCssPayloads || []) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                failures.push('Generated CSS registration must be an object');
                continue;
            }
            if (!generatedHeaderCssReferences.includes(item.sourceRef) || !surface.sourceRefs?.includes(item.sourceRef)) failures.push(`Unknown or unowned generated CSS source ${item.sourceRef}`);
            const key = `${item.sourceRef}:${item.styleKey}`;
            if (keys.has(key)) failures.push(`Duplicate generated CSS registration ${key}`);
            keys.add(key);
        }
    }
    return failures;
}
const syntax = source => parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const walk = (node, callback) => {
    if (!node || typeof node !== 'object') return;
    if (node.type) callback(node);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'start' || key === 'end') continue;
        if (Array.isArray(value)) value.forEach(child => walk(child, callback));
        else if (value && typeof value === 'object') walk(value, callback);
    }
};
const named = (ast, type, name) => {
    const matches = [];
    walk(ast, node => { if (node.type === type && node.id?.name === name) matches.push(node); });
    assert.equal(matches.length, 1, `Exactly one ${type} ${name} is required`);
    return matches[0];
};
const text = (source, node) => source.slice(node.start, node.end);
const identifier = (node, name) => node?.type === 'Identifier' && node.name === name;
const member = (node, owner, property) => node?.type === 'MemberExpression' && !node.computed
    && identifier(node.object, owner) && identifier(node.property, property);
const call = (node, name) => node?.type === 'CallExpression' && identifier(node.callee, name);
const freeze = node => node?.type === 'CallExpression' && member(node.callee, 'Object', 'freeze') && node.arguments.length === 1;
function execute(declarations, expression) {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    return vm.runInContext(`'use strict';\n${declarations}\n${expression}`, context, { timeout: 1000 });
}
function checkTemplateInputs(node, owners) {
    walk(node, child => {
        if (child.type !== 'TemplateLiteral') return;
        for (const expression of child.expressions) {
            assert.ok(expression.type === 'MemberExpression' && !expression.computed
                && expression.object.type === 'Identifier' && owners.has(expression.object.name)
                && expression.property.type === 'Identifier', 'Unexpected CSS factory interpolation');
        }
    });
}
function checkInputFactory(node) {
    assert.ok(!node.async && !node.generator, 'Selector input must be synchronous');
    assert.ok(node.params.length <= 1 && node.params.every(parameter => identifier(parameter, 'ROOT_ATTRIBUTE')), 'Unexpected selector input parameter');
    assert.equal(node.body.body.length, 1, 'Selector input must only return its immutable literal record');
    const statement = node.body.body[0];
    assert.ok(statement.type === 'ReturnStatement' && freeze(statement.argument), 'Frozen selector literal required');
    const record = statement.argument.arguments[0];
    assert.equal(record.type, 'ObjectExpression', 'Selector literal record required');
    const keys = new Set();
    for (const property of record.properties) {
        assert.ok(property.type === 'Property' && !property.computed && !property.method && property.kind === 'init', 'Plain selector fields required');
        const key = property.key.name ?? property.key.value;
        assert.ok(typeof key === 'string' && !keys.has(key), 'Duplicate selector input');
        keys.add(key);
        if (property.value.type === 'TemplateLiteral') {
            assert.ok(property.value.expressions.every(expression => identifier(expression, 'ROOT_ATTRIBUTE')), 'Unexpected selector interpolation');
        } else assert.ok(property.value.type === 'Literal' && typeof property.value.value === 'string', 'Literal selector value required');
    }
}
function ensureCall(ast, builder, input, argument) {
    const calls = [];
    walk(ast, node => { if (call(node, builder)) calls.push(node); });
    assert.equal(calls.length, 1, `Exactly one production invocation of ${builder} is required`);
    const actual = calls[0];
    assert.ok(actual.arguments.length === 1 && call(actual.arguments[0], input), `${builder} must consume its real adapter input`);
    const args = actual.arguments[0].arguments;
    assert.ok(argument ? args.length === 1 && identifier(args[0], argument) : args.length === 0, `${builder} input arguments changed`);
}

export function importantLedger(css) {
    const normalized = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const declarations = [];
    for (const match of normalized.matchAll(/([\w-]+)\s*:\s*[^;{}]*!important/g)) {
        const opening = normalized.lastIndexOf('{', match.index);
        const start = Math.max(normalized.lastIndexOf('{', opening - 1), normalized.lastIndexOf('}', opening - 1));
        declarations.push({ selector: normalized.slice(start + 1, opening).replace(/\s+/g, ' ').trim(), property: match[1].toLowerCase() });
    }
    return { declarations, totalCount: normalized.match(/!important/g)?.length || 0,
        sha256: createHash('sha256').update(JSON.stringify(declarations)).digest('hex') };
}

export async function resolveGeneratedHeaderCss({ reference, source, readSource }) {
    const entry = [...families].find(([stem]) => reference === `${root}${stem}-presenter.js`);
    if (!entry) return null;
    const [stem, [family, kinds]] = entry;
    const ast = syntax(source);
    const adapter = await readSource(`${root}${stem}-host-adapter.js`);
    const adapterAst = syntax(adapter);
    const payloads = [];
    for (const kind of kinds) {
        if (stem === 'header-drawer' && kind === 'Style') {
            const declarations = ['layout', 'nativeStyleSlots', 'describeNativeStyle'].map(name => named(ast, 'VariableDeclarator', name));
            const [layout, slots, describe] = declarations;
            assert.ok(freeze(layout.init) && layout.init.arguments[0].type === 'ObjectExpression', 'Frozen drawer layout literal required');
            const layoutFields = layout.init.arguments[0].properties;
            assert.ok(layoutFields.length === 1 && layoutFields[0].type === 'Property' && !layoutFields[0].computed
                && identifier(layoutFields[0].key, 'maxWidth') && layoutFields[0].value.type === 'Literal'
                && Number.isFinite(layoutFields[0].value.value) && layoutFields[0].value.value > 0, 'Literal drawer maxWidth required');
            assert.ok(freeze(slots.init) && slots.init.arguments[0].type === 'ArrayExpression'
                && slots.init.arguments[0].elements.every(item => item?.type === 'Literal' && typeof item.value === 'string'), 'Frozen drawer slot literal required');
            assert.equal(describe.init.type, 'ArrowFunctionExpression', 'Pure drawer style factory required');
            checkTemplateInputs(describe.init, new Set(['selectors', 'layout']));
            const binding = named(adapterAst, 'VariableDeclarator', 'nativeStyleDefinition').init;
            assert.ok(binding.type === 'CallExpression' && member(binding.callee, '__dcufHeaderDrawerPresenter', 'describeNativeStyle') && binding.arguments.length === 1,
                'Actual drawer adapter style binding required');
            const frozen = binding.arguments[0];
            assert.ok(freeze(frozen), 'Frozen drawer native binding required');
            const mapped = frozen.arguments[0];
            assert.ok(mapped.type === 'CallExpression' && mapped.callee.type === 'MemberExpression' && !mapped.callee.computed
                && identifier(mapped.callee.property, 'map') && mapped.callee.object.type === 'ArrayExpression'
                && mapped.arguments.length === 1 && member(mapped.arguments[0], 'Object', 'freeze'), 'Literal frozen drawer binding entries required');
            for (const item of mapped.callee.object.elements) {
                assert.ok(item?.type === 'ObjectExpression' && item.properties.length === 2, 'Plain drawer selector entry required');
                for (const property of item.properties) assert.ok(property.type === 'Property' && !property.computed && property.kind === 'init'
                    && ['slot', 'selector'].includes(property.key.name ?? property.key.value)
                    && property.value.type === 'Literal' && typeof property.value.value === 'string', 'Literal drawer selector entry required');
            }
            const selected = declarations.map(node => `const ${text(source, node)};`).join('\n');
            const result = execute(selected, `(() => { const result = describeNativeStyle(${text(adapter, frozen)});
                if (!Object.isFrozen(result)) throw new TypeError('Frozen style payload required'); return JSON.stringify(result); })()`);
            const payload = JSON.parse(result);
            assert.equal(payload.key, 'header-drawer');
            assert.equal(typeof payload.css, 'string');
            payloads.push({ styleKey: payload.key, css: payload.css });
            continue;
        }
        const builder = `__dcufBuild${family}${kind === 'Style' ? 'Style' : `${kind}Css`}`;
        const input = `__dcufDescribe${family}${kind}Selectors`;
        const buildNode = named(ast, 'FunctionDeclaration', builder);
        const inputNode = named(adapterAst, 'FunctionDeclaration', input);
        assert.ok(!buildNode.async && !buildNode.generator && buildNode.params.length === 1 && identifier(buildNode.params[0], 'selectors'), 'Pure synchronous CSS selector builder required');
        checkTemplateInputs(buildNode, new Set(['selectors']));
        checkInputFactory(inputNode);
        let attribute;
        if (kind === 'Theme') {
            const themeOwner = await readSource('src/targets/shared/theme-presenter.js');
            const themeAst = syntax(themeOwner);
            const attr = named(themeAst, 'VariableDeclarator', 'ROOT_ATTRIBUTE').init;
            assert.ok(attr.type === 'Literal' && typeof attr.value === 'string' && /^data-dcuf-[a-z-]+$/.test(attr.value), 'Literal palette attribute required');
            const targetCalls = [];
            walk(themeAst, node => { if (call(node, '__dcufBuildTargetThemeCss')) targetCalls.push(node); });
            assert.ok(targetCalls.length === 1 && targetCalls[0].arguments.length === 1
                && identifier(targetCalls[0].arguments[0], 'ROOT_ATTRIBUTE'), 'Target palette must consume its actual root attribute');
            attribute = attr.value;
        }
        const composition = kind === 'Style' ? ast : syntax(await readSource(`${root}${kind === 'Theme' ? 'theme-host-style' : 'filter-module'}.js`));
        ensureCall(composition, builder, input, kind === 'Theme' ? 'ROOT_ATTRIBUTE' : null);
        const result = execute(`${text(source, buildNode)}\n${text(adapter, inputNode)}`,
            `(() => { const input = ${input}(${attribute ? JSON.stringify(attribute) : ''});
                if (!Object.isFrozen(input) || !Object.values(input).every(value => typeof value === 'string' && value.trim() && !/[{};]/.test(value))) throw new TypeError('Invalid frozen selector input');
                const result = ${builder}(input);
                if (typeof result === 'object' && !Object.isFrozen(result)) throw new TypeError('Frozen style payload required');
                return JSON.stringify(result); })()`);
        const payload = JSON.parse(result);
        if (kind === 'Style') {
            assert.equal(payload?.key, stem);
            assert.equal(typeof payload.css, 'string');
            payloads.push({ styleKey: payload.key, css: payload.css });
        } else {
            assert.equal(typeof payload, 'string');
            payloads.push({ styleKey: kind.toLowerCase(), css: payload });
        }
    }
    assert.equal(new Set(payloads.map(payload => payload.styleKey)).size, payloads.length, 'Duplicate generated style key');
    const count = payloads.reduce((total, payload) => total + importantLedger(payload.css).totalCount, 0);
    assert.equal(count, source.match(/!important/g)?.length || 0, 'Generated payloads must cover every authored !important exactly once');
    return payloads;
}

export function verifyGeneratedCssRegistrations(reference, payloads, surfaces) {
    const failures = verifyGeneratedCssSources(surfaces);
    const registrations = surfaces.flatMap(surface => Array.isArray(surface.generatedCssPayloads) ? surface.generatedCssPayloads : [])
        .filter(item => item && typeof item === 'object' && item.sourceRef === reference);
    const exceptions = surfaces.flatMap(surface => surface.cascadeExceptions || []);
    const seen = new Set();
    for (const registration of registrations) {
        if (Object.keys(registration).sort().join(',') !== 'declarationCount,declarationLedgerSha256,sourceRef,styleKey'
            || !Number.isInteger(registration.declarationCount) || registration.declarationCount < 0
            || typeof registration.styleKey !== 'string' || !registration.styleKey
            || !/^[a-f0-9]{64}$/i.test(registration.declarationLedgerSha256 || '')) {
            failures.push('malformed generated CSS registration');
        }
        if (seen.has(registration.styleKey)) failures.push(`duplicate generated CSS registration ${registration.styleKey}`);
        seen.add(registration.styleKey);
        if (!payloads.some(payload => payload.styleKey === registration.styleKey)) failures.push(`registered generated CSS payload ${registration.styleKey} is missing`);
    }
    for (const payload of payloads) {
        const ledger = importantLedger(payload.css);
        const registration = registrations.find(item => item.styleKey === payload.styleKey);
        if (!registration) failures.push(`generated CSS payload ${payload.styleKey} is unregistered`);
        else if (registration.declarationCount !== ledger.totalCount || registration.declarationLedgerSha256?.toLowerCase() !== ledger.sha256) {
            failures.push(`generated CSS payload ${payload.styleKey} !important ledger mismatch (actual count ${ledger.totalCount}, sha256 ${ledger.sha256})`);
        }
        if (ledger.totalCount !== ledger.declarations.length) failures.push(`generated CSS payload ${payload.styleKey} contains an unparseable !important declaration`);
        for (const declaration of ledger.declarations) {
            if (!exceptions.some(exception => exception.selector.replace(/\s+/g, ' ').trim() === declaration.selector
                && exception.property?.toLowerCase() === declaration.property && exception.hostCollision?.trim() && exception.testRef?.trim())) {
                failures.push(`generated CSS payload ${payload.styleKey} contains an unregistered !important exception: ${declaration.selector} / ${declaration.property}`);
            }
        }
    }
    return failures.map(failure => `${reference}: ${failure}`);
}
