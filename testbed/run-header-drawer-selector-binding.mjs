import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import { loadDrawerPresenter } from './header-drawer-body-contract.mjs';

const source = await readFile('src/targets/mobile/header-drawer-presenter.js', 'utf8');
const adapter = await readFile('src/targets/mobile/header-drawer-host-adapter.js', 'utf8');
const control = await readFile('artifacts/controls/header-width-2AA1.user.js');
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(sha(control), '2AA122E15EE3521500C06BCFCDA5FE280EDF54EE05571A32ADE2C88D29C7FD56');
const controlText = control.toString();
const start = controlText.indexOf('function __dcufBuildHeaderDrawerThemeCss(');
const end = controlText.indexOf('__dcufRoot.__dcufHeaderDrawerPresenter =', start);
assert.ok(start >= 0 && end > start);
const baseline = loadDrawerPresenter(controlText.slice(start, end) + '__dcufRoot.__dcufHeaderDrawerPresenter = __dcufHeaderDrawerPresenter;');
const presenter = loadDrawerPresenter(source);
assert.equal(typeof presenter.describeNativeStyle, 'function', 'A pure named-selector factory is required');
const entries = [
    ['door', '.issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"]'],
    ['recommendation', '.issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"]'],
    ['relationPopup', '.issue_wrap > #relation_popup[data-dcuf-header-relation-popup="1"]'],
    ['relationStatic', '.issue_wrap > #relation_popup[data-dcuf-header-relation-static="1"]'],
    ['fluid', '*:not(#hot_rank_pop2):not(#hot_rank_pop2 *)'],
    ['intro', '.minor_intro_box'], ['ranking', '.minor_ranking_box'],
    ['buttonDecoration', '.btn_mgall_dcp'], ['closeDecoration', '.under_poply_close'],
    ['rankPopup', '#hot_rank_pop2'], ['tipPopup', '#hot_tip_pop'],
    ['recommendationPaging', '.pageing_box'], ['recommendationText', '.concept_txtlist'],
    ['recommendationImage', '.concept_img']
];
const freeze = rows => Object.freeze(rows.map(([slot, selector]) => Object.freeze({ slot, selector })));
const bindings = freeze(entries);
const canonical = css => css.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
const validate = owner => {
    const result = owner.describeNativeStyle(bindings);
    assert.ok(Object.isFrozen(result));
    assert.equal(result.id, 'dcuf-header-drawer-style');
    assert.equal(result.key, 'header-drawer');
    assert.equal(canonical(result.css), canonical(baseline.style.css), 'Exact original selector/declaration/media order');
    assert.equal(canonical(owner.describeNativeStyle(freeze([...entries].reverse())).css), canonical(result.css), 'Binding order cannot change selector meaning');
    return result;
};
validate(presenter);
const describeAdapterStyle = candidate => {
    const begin = candidate.indexOf("const STYLE_ID = 'dcuf-header-drawer-style';");
    const finish = candidate.indexOf('const BODY_SCOPE_ATTR =', begin);
    assert.ok(begin >= 0 && finish > begin, 'Read the actual cached target binding');
    return vm.runInNewContext(`(() => { ${candidate.slice(begin, finish)} return nativeStyleDefinition; })()`,
        { __dcufHeaderDrawerPresenter: presenter }, { timeout: 1000 });
};
assert.equal(canonical(describeAdapterStyle(adapter).css), canonical(baseline.style.css), 'Actual production adapter binding preserves the original CSS');
assert.notEqual(canonical(describeAdapterStyle(adapter.replace('.under_poply_close', '.missing_native_close')).css), canonical(baseline.style.css), 'Wrong production decoration binding is detected');
assert.ok(Object.isFrozen(presenter.nativeStyleSlots));
assert.deepEqual(JSON.parse(JSON.stringify(presenter.nativeStyleSlots)), entries.map(([slot]) => slot));
const rejected = [
    bindings.slice(1),
    freeze(entries.slice(1)),
    freeze([...entries.slice(1), entries[1]]),
    freeze([...entries.slice(1), ['unknown', '.native-unknown']]),
    freeze([...entries.slice(1), ['door', '']]),
    Object.freeze(bindings.map((entry, index) => index ? entry : { ...entry })),
    Object.freeze(bindings.map((entry, index) => index ? entry : Object.freeze({ ...entry, extra: true }))),
    null
];
for (const input of rejected) assert.throws(() => presenter.describeNativeStyle(input), { name: 'TypeError' });
const stale = freeze(entries.map(([slot, selector]) => [slot, slot === 'door' ? '[data-dcuf-header-door-context="1"]' : selector]));
assert.notEqual(canonical(presenter.describeNativeStyle(stale).css), canonical(baseline.style.css), 'Stale semantic binding cannot masquerade as original native CSS');
for (const width of [560, 664, 1280]) {
    const changed = loadDrawerPresenter(source.replace('const layout = Object.freeze({ maxWidth: 640 });', `const layout = Object.freeze({ maxWidth: ${width} });`));
    assert.equal(canonical(changed.describeNativeStyle(bindings).css), canonical(baseline.style.css.replaceAll('width: min(640px, calc(100vw - 24px))', `width: min(${width}px, calc(100vw - 24px))`)), 'Presenter-only width survives named binding');
}
const report = { kind: 'drawer-named-selector-contract', status: 'PASS', scope: 'PURE_FACTORY_NOT_RUNTIME_OR_HEADER_ADMISSION',
    sourceSha256: sha(source), adapterSha256: sha(adapter), controlSha256: sha(control), slots: entries.length,
    rejectedInputs: rejected.length, exactControlCssEqual: true, actualAdapterBindingCssEqual: true, reversedOrderEqual: true, presenterOnlyWidths: [560, 664, 1280] };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) await writeFile(path.resolve(process.argv[outputIndex + 1]), JSON.stringify(report, null, 2) + '\n');
console.log(`Named selector PASS: ${entries.length} slots, ${rejected.length} invalid inputs rejected, exact control CSS and three presenter-only width variants.`);
