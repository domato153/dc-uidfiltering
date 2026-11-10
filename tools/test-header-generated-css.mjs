import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
import { generatedHeaderCssReferences, importantLedger, resolveGeneratedHeaderCss, verifyGeneratedCssRegistrations, verifyGeneratedCssSources } from './header-generated-css.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const files = new Map();
const readSource = async reference => {
    if (!files.has(reference)) files.set(reference, await readFile(reference, 'utf8'));
    return files.get(reference);
};
const snapshots = [];
const surface = { sourceRefs: [...generatedHeaderCssReferences], generatedCssPayloads: [], cascadeExceptions: [] };
let oldStaticPayloads = 0;
const resolve = async (reference, replacements = new Map()) => resolveGeneratedHeaderCss({ reference,
    source: replacements.get(reference) ?? await readSource(reference),
    readSource: async name => replacements.get(name) ?? await readSource(name) });
for (const reference of generatedHeaderCssReferences) {
    const inspect = node => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ObjectExpression' && node.properties.some(property => property.key?.name === 'css'
            && property.value?.type === 'TemplateLiteral' && property.value.expressions.length === 0)) oldStaticPayloads++;
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(inspect);
            else if (value && typeof value === 'object') inspect(value);
        }
    };
    inspect(parse(await readSource(reference), { ecmaVersion: 'latest' }));
    const payloads = await resolve(reference);
    assert.ok(payloads.length >= 2);
    for (const payload of payloads) {
        const ledger = importantLedger(payload.css);
        assert.equal(ledger.declarations.length, ledger.totalCount);
        surface.generatedCssPayloads.push({ sourceRef: reference, styleKey: payload.styleKey,
            declarationCount: ledger.totalCount, declarationLedgerSha256: ledger.sha256 });
        for (const declaration of ledger.declarations) surface.cascadeExceptions.push({ ...declaration,
            hostCollision: 'Test-only exact declaration reason; never product admission.', testRef: 'tools/test-header-generated-css.mjs' });
    }
    snapshots.push({ sourceRef: reference, authoredImportantCount: (await readSource(reference)).match(/!important/g)?.length || 0,
        payloads: payloads.map(payload => ({ styleKey: payload.styleKey, ...importantLedger(payload.css) })) });
    assert.deepEqual(verifyGeneratedCssRegistrations(reference, payloads, [surface]), []);
}
assert.equal(snapshots.reduce((sum, snapshot) => sum + snapshot.payloads.length, 0), 13);
assert.equal(oldStaticPayloads, 0, 'Reproduce the old zero-expression extractor gap on these five presenters');
assert.deepEqual(verifyGeneratedCssSources([surface]), []);

// Independent execution uses complete existing pure presenters, then actual
// adapter declarations, rather than the resolver's selected-function path.
for (const reference of generatedHeaderCssReferences) {
    const source = await readSource(reference);
    const stem = path.basename(reference, '-presenter.js');
    const family = stem === 'gallery-page-head' ? 'GalleryPageHead' : stem.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('');
    const adapter = await readSource(reference.replace('-presenter.js', '-host-adapter.js'));
    const context = vm.createContext({ __dcufRoot: {} }, { codeGeneration: { strings: false, wasm: false } });
    // Only hoisted selectors precede the effectful adapter IIFE.
    const selectorEnd = adapter.indexOf(`const __dcuf${family}HostAdapter`);
    assert.ok(selectorEnd > 0);
    vm.runInContext(adapter.slice(0, selectorEnd) + '\n' + source, context, { timeout: 1000 });
    const payloads = await resolve(reference);
    const payload = payloads.find(item => item.styleKey === stem);
    if (stem === 'header-drawer') {
        const begin = adapter.indexOf("const STYLE_ID = 'dcuf-header-drawer-style';");
        const end = adapter.indexOf('const BODY_SCOPE_ATTR =', begin);
        assert.ok(begin > 0 && end > begin);
        const css = vm.runInContext(`(() => { ${adapter.slice(begin, end)} return nativeStyleDefinition.css; })()`, context, { timeout: 1000 });
        assert.equal(payload.css, css);
        assert.notEqual(payload.css, context.__dcufRoot.__dcufHeaderDrawerPresenter.style.css, 'Production drawer bindings differ from characterization-only defaults');
    } else assert.equal(payload.css, context.__dcufRoot[`__dcuf${family}Presenter`].style.css);
    for (const early of payloads.filter(item => item.styleKey !== stem)) {
        const kind = early.styleKey[0].toUpperCase() + early.styleKey.slice(1);
        const attribute = kind === 'Theme' ? '"data-dcuf-palette"' : '';
        const actual = vm.runInContext(`__dcuf${family}Presenter.build${kind}Css(__dcufDescribe${family}${kind}Selectors(${attribute}))`, context, { timeout: 1000 });
        assert.equal(early.css, actual, 'Generated early payload equals independently initialized production presenter and adapter input');
    }
}

const shell = generatedHeaderCssReferences[0];
const shellSource = await readSource(shell);
const shellAdapter = shell.replace('-presenter.js', '-host-adapter.js');
const originalAdapter = await readSource(shellAdapter);
const originalPayloads = await resolve(shell);
let negatives = 0;
const mutation = async (reference, from, to, kind = 'resolution') => {
    const original = await readSource(reference);
    assert.ok(original.includes(from), `Mutation target missing: ${from}`);
    const replacements = new Map([[reference, original.replace(from, to)]]);
    if (kind === 'resolution') await assert.rejects(() => resolve(shell, replacements));
    else {
        const payloads = await resolve(shell, replacements);
        assert.ok(verifyGeneratedCssRegistrations(shell, payloads, [surface]).length, `Mutation accepted: ${from}`);
    }
    negatives++;
};
await mutation(shell, 'height: auto !important', 'height: auto !important; opacity: 1 !important', 'ledger');
await mutation(shell, 'height: auto !important', 'height: auto !important; height: auto !important', 'ledger');
await mutation(shell, '${selectors.root}', '${missingSelectors.root}');
await mutation(shell, '${selectors.root}', '${selectors.root + ", button"}');
await mutation(shell, '__dcufBuildHeaderShellStyle(__dcufDescribeHeaderShellStyleSelectors())', '__dcufBuildHeaderShellStyle(__dcufDescribeHeaderShellResetSelectors())');
await mutation(shell, 'function __dcufBuildHeaderShellThemeCss(selectors)', 'function __dcufMissingThemeCss(selectors)');
await mutation(shell, '    // Hoisted:', 'void "outline: 0 !important";\n    // Hoisted:');
await mutation(shellAdapter, 'root:', 'unknown:');
await mutation(shellAdapter, 'root:', 'root: ".wrong", root:');
await mutation(shellAdapter, 'Object.freeze({', '({');
await mutation(shellAdapter, 'root: "[data-dcuf-header-shell-role=', 'root: "button, [data-dcuf-header-shell-role=', 'ledger');
await mutation(shellAdapter, 'root: "[data-dcuf-header-shell-role=', 'root: (() => "[data-dcuf-header-shell-role=');
await mutation('src/targets/mobile/theme-host-style.js', '__dcufBuildHeaderShellThemeCss(__dcufDescribeHeaderShellThemeSelectors(ROOT_ATTRIBUTE))', '__dcufBuildHeaderShellThemeCss(__dcufDescribeHeaderShellThemeSelectors("wrong"))');
await mutation('src/targets/shared/theme-presenter.js', '__dcufBuildTargetThemeCss(ROOT_ATTRIBUTE)', '__dcufBuildTargetThemeCss("wrong")');

const malformedSurfaces = [
    { ...surface, generatedCssPayloads: null },
    { ...surface, generatedCssPayloads: {} },
    { ...surface, generatedCssPayloads: [null] },
    { ...surface, generatedCssPayloads: surface.generatedCssPayloads.filter(item => item.sourceRef !== shell) },
    { ...surface, generatedCssPayloads: [...surface.generatedCssPayloads, surface.generatedCssPayloads[0]] },
    { ...surface, generatedCssPayloads: [...surface.generatedCssPayloads, { ...surface.generatedCssPayloads[0], styleKey: 'unknown' }] },
    { ...surface, cascadeExceptions: [] },
    { ...surface, generatedCssPayloads: surface.generatedCssPayloads.map((item, index) => index ? item : { ...item, declarationLedgerSha256: '0'.repeat(64) }) },
    { ...surface, generatedCssPayloads: surface.generatedCssPayloads.map((item, index) => index ? item : { ...item, declarationCount: item.declarationCount + 1 }) },
    { ...surface, generatedCssPayloads: surface.generatedCssPayloads.map((item, index) => index ? item : { ...item, declarationCount: -1 }) },
    { ...surface, generatedCssPayloads: surface.generatedCssPayloads.map((item, index) => index ? item : { ...item, extra: true }) },
];
for (const malformed of malformedSurfaces) {
    assert.ok(verifyGeneratedCssRegistrations(shell, originalPayloads, [malformed]).length);
    negatives++;
}
assert.ok(verifyGeneratedCssSources([{ ...surface, sourceRefs: [] }]).length);
assert.ok(verifyGeneratedCssSources([{ ...surface, generatedCssPayloads: [{ sourceRef: 'src/unknown.js', styleKey: 'theme' }] }]).length);
negatives += 2;
const drawer = generatedHeaderCssReferences.at(-1);
const drawerAdapter = drawer.replace('-presenter.js', '-host-adapter.js');
const drawerOriginal = await readSource(drawerAdapter);
for (const [from, to] of [
    ['{ slot: "door", selector:', '{ slot: "unknown", selector:'],
    ['{ slot: "door", selector:', '{ slot: "recommendation", selector:'],
    ['.map(Object.freeze)', '.map(value => value)'],
    ['selector: ".issue_wrap .issue_contentbox', 'selector: missingSelector(".issue_wrap .issue_contentbox'],
]) {
    assert.ok(drawerOriginal.includes(from));
    await assert.rejects(() => resolve(drawer, new Map([[drawerAdapter, drawerOriginal.replace(from, to)]])));
    negatives++;
}

// Exercise the production manifest consumer without executing its unrelated
// top-level continuity/routing reads or mutating the repository manifest.
const schemaSource = await readSource('tools/verify-modernization-assurance.mjs');
const schemaAst = parse(schemaSource, { ecmaVersion: 'latest', sourceType: 'module' });
const schemaDeclarations = ['fail', 'isPlainObject', 'unique'].map(name => {
    const matches = schemaAst.body.filter(node => node.type === 'VariableDeclaration')
        .flatMap(node => node.declarations).filter(node => node.id?.name === name);
    assert.equal(matches.length, 1);
    return `const ${schemaSource.slice(matches[0].start, matches[0].end)};`;
});
for (const name of ['exactKeys', 'nonEmptyStrings', 'validateSurfaces']) {
    const matches = schemaAst.body.filter(node => node.type === 'FunctionDeclaration' && node.id?.name === name);
    assert.equal(matches.length, 1);
    schemaDeclarations.push(schemaSource.slice(matches[0].start, matches[0].end));
}
const manifest = JSON.parse(await readSource('architecture/ui-surfaces.json'));
const deltas = JSON.parse(await readSource('verification/intended-deltas.json'));
const header = manifest.surfaces.find(item => item.id === 'header-navigation');
assert.ok(header);
header.generatedCssPayloads = structuredClone(surface.generatedCssPayloads);
const schemaFailures = candidate => JSON.parse(vm.runInNewContext(`const failures = [];\n${schemaDeclarations.join('\n')}\nvalidateSurfaces(${JSON.stringify(candidate)}, ${JSON.stringify(deltas)}); JSON.stringify(failures);`, {}, { timeout: 1000 }));
assert.deepEqual(schemaFailures(manifest), [], 'Actual manifest consumer accepts exact generated registrations');
const optional = structuredClone(manifest);
delete optional.surfaces.find(item => item.id === 'header-navigation').generatedCssPayloads;
assert.deepEqual(schemaFailures(optional), [], 'Unrelated surfaces need no generated registration');
let schemaNegatives = 0;
const schemaMutations = [
    target => { target.generatedCssPayloads = null; },
    target => { target.generatedCssPayloads = {}; },
    target => { target.generatedCssPayloads = []; },
    target => { target.generatedCssPayloads.push(null); },
    target => { target.generatedCssPayloads[0].sourceRef = 'src/unknown.js'; },
    target => { target.generatedCssPayloads[0].styleKey = ' '; },
    target => { target.generatedCssPayloads[0].declarationCount = -1; },
    target => { target.generatedCssPayloads[0].declarationCount = 1.5; },
    target => { target.generatedCssPayloads[0].declarationLedgerSha256 = 'bad'; },
    target => { target.generatedCssPayloads.push(target.generatedCssPayloads[0]); },
    target => { target.generatedCssPayloads[0].extra = true; },
    target => { delete target.generatedCssPayloads[0].declarationCount; },
];
for (const mutate of schemaMutations) {
    const candidate = structuredClone(manifest);
    mutate(candidate.surfaces.find(item => item.id === 'header-navigation'));
    assert.ok(schemaFailures(candidate).length, 'Actual manifest consumer must diagnose malformed generated registrations');
    schemaNegatives++;
}

// This report records current observed inputs and complete ledgers, not a
// persistent approval or a reason to bless the dynamically read declarations.
const report = { kind: 'header-generated-css-resolver', status: 'PASS', scope: 'VERIFIER_CONTRACT_NOT_HEADER_ADMISSION',
    observerSha256: sha(await readFile(new URL(import.meta.url))), resolverSha256: sha(await readFile(new URL('./header-generated-css.mjs', import.meta.url))),
    sources: Object.fromEntries([...files].map(([reference, content]) => [reference, sha(content)])),
    generatedCssPayloads: surface.generatedCssPayloads, snapshots, negativeControls: negatives,
    oldStaticExtractorPayloads: oldStaticPayloads, independentProductionLatePayloads: generatedHeaderCssReferences.length, independentProductionEarlyPayloads: 8,
    actualManifestSchemaPositives: 2, actualManifestSchemaNegatives: schemaNegatives };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
    const destination = process.argv[outputIndex + 1];
    assert.ok(destination && !destination.startsWith('--'), '--output path required');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
}
console.log(`Generated header CSS PASS: 13 actual payloads, 13 independent output comparisons, ${negatives} resolver/registration and ${schemaNegatives} actual-schema rejected mutations; old static extractor finds zero; no surface admission.`);
