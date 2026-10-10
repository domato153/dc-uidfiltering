import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadDrawerPresenter(source) {
    const context = { __dcufRoot: {} }; // Deliberately no DOM, GM, network or scheduler.
    vm.runInNewContext(source, context, { timeout: 1000 });
    return context.__dcufRoot.__dcufHeaderDrawerPresenter;
}

const plain = value => JSON.parse(JSON.stringify(value));
const declaration = (name, value, priority = 'important') => ({ name, value, priority });
const assertFrozen = value => {
    assert.ok(Object.isFrozen(value), 'Body description must be immutable');
    if (Array.isArray(value)) value.forEach(assertFrozen);
};

export function validateLayoutPresenter(presenter, maxWidth = 640) {
    assert.ok(presenter.layout, 'Frozen drawer layout input required');
    assert.ok(Object.isFrozen(presenter.layout), 'Drawer layout input must be immutable');
    assert.deepEqual(plain(presenter.layout), { maxWidth }, 'Numeric-only layout input');
    const widths = [...presenter.style.css.matchAll(/width: min\((\d+)px, calc\(100vw - 24px\)\)/g)];
    assert.equal(widths.length, 3, 'Owned body and both native roots use layout width');
    assert.ok(widths.every(match => Number(match[1]) === maxWidth), 'All CSS widths consume the same layout input');
}

export function validateLayoutPresenterFaults(source) {
    validateLayoutPresenter(loadDrawerPresenter(source));
    const input = 'const layout = Object.freeze({ maxWidth: 640 });';
    assert.ok(source.includes(input), 'One selected numeric layout input required');
    const check = candidate => {
        validateLayoutPresenter(loadDrawerPresenter(candidate));
        for (const width of [560, 664, 1280]) {
            const variant = candidate.replace(input, `const layout = Object.freeze({ maxWidth: ${width} });`);
            validateLayoutPresenter(loadDrawerPresenter(variant), width);
        }
    };
    check(source);
    const faults = [
        [input, 'const layout = { maxWidth: 640 };'],
        ['width: min(${layout.maxWidth}px, calc(100vw - 24px))', 'width: min(640px, calc(100vw - 24px))'],
        ['{ shell, layout,', '{ shell,'],
    ];
    for (const [from, to] of faults) {
        assert.ok(source.includes(from), `Layout fault missing: ${from}`);
        assert.throws(() => check(source.replace(from, to)), assert.AssertionError);
    }
    return faults.length;
}

export function validateBodyPresenter(presenter) {
    assert.equal(typeof presenter.describeBodyVisibility, 'function', 'Body visibility description required');
    for (const open of [false, true, false]) {
        const snapshot = Object.freeze({ open });
        const result = presenter.describeBodyVisibility(snapshot);
        assertFrozen(result);
        assert.deepEqual(plain(result), open ? [
            declaration('display', 'block'), declaration('visibility', 'visible'),
            declaration('opacity', '1'), declaration('pointer-events', 'auto'), declaration('overflow', 'visible')
        ] : [
            declaration('max-height', '0px'), declaration('opacity', '0'), declaration('visibility', 'hidden'),
            declaration('pointer-events', 'none'), declaration('overflow', 'hidden'), declaration('display', 'none')
        ], 'Body declarations/priority/order changed');
        assert.equal(snapshot.open, open);
    }
    for (const inlineStart of [-628, -2.25, 0, 12.5]) {
        const snapshot = Object.freeze({ inlineStart });
        const result = presenter.describeBodyOffset(snapshot);
        assertFrozen(result);
        assert.deepEqual(plain(result), declaration('--dcuf-header-drawer-inline-start', `${inlineStart}px`, ''));
        assert.equal(snapshot.inlineStart, inlineStart);
    }
    for (const height of [1, 25, 900]) {
        const result = presenter.describeBodyHeight(Object.freeze({ height }));
        assertFrozen(result);
        assert.deepEqual(plain(result), declaration('max-height', `${height}px`));
    }
    for (const [hasChildren, height] of [[false, 0], [false, 120], [true, 120], [true, 0]]) {
        const result = presenter.describeBodyPadding(Object.freeze({ hasChildren, height }));
        assertFrozen(result);
        assert.deepEqual(plain(result), { paddingTop: hasChildren ? `${height}px` : '' });
    }
}

export function validateBodyPresenterFaults(source) {
    validateBodyPresenter(loadDrawerPresenter(source));
    const faults = [
        ["{ name: 'display', value: 'block', priority: 'important' }", "{ name: 'display', value: 'none', priority: 'important' }"],
        ["{ name: 'pointer-events', value: 'none', priority: 'important' }", "{ name: 'pointer-events', value: 'auto', priority: 'important' }"],
        ["{ name: 'overflow', value: 'visible', priority: 'important' },", ''],
        ["name: '--dcuf-header-drawer-inline-start', value: `${snapshot.inlineStart}px`, priority: ''", "name: '--dcuf-header-drawer-inline-start', value: '0px', priority: ''"],
        ["name: 'max-height', value: `${snapshot.height}px`, priority: 'important'", "name: 'max-height', value: `${snapshot.height}px`, priority: ''"],
        ["paddingTop: snapshot.hasChildren ? `${snapshot.height}px` : ''", "paddingTop: `${snapshot.height}px`"]
    ];
    for (const [from, to] of faults) {
        assert.ok(source.includes(from), `Selected body fault missing: ${from}`);
        assert.throws(() => validateBodyPresenter(loadDrawerPresenter(source.replace(from, to))), assert.AssertionError);
    }
    return faults.length;
}

export function validateBodyObservation(body, open) {
    assert.ok(body, 'Owned body required');
    const entries = new Map(body.inline.map(entry => [entry.name, entry]));
    for (const [name, value] of Object.entries(open ? {
        display: 'block', visibility: 'visible', opacity: '1', 'pointer-events': 'auto', overflow: 'visible'
    } : { display: 'none', visibility: 'hidden', opacity: '0', 'pointer-events': 'none', overflow: 'hidden', 'max-height': '0px' })) {
        assert.deepEqual(entries.get(name), declaration(name, value), `Inline body ${name}`);
    }
    assert.equal(body.paddingTop, open && body.sourceHeight !== null && body.hasChildren ? `${Math.ceil(body.sourceHeight)}px` : '', 'Inner padding branch');
    assert.equal(body.computed.display, open ? 'block' : 'none');
    assert.equal(body.computed.visibility, open ? 'visible' : 'hidden');
    assert.equal(body.computed.pointerEvents, open ? 'auto' : 'none');
    if (open) {
        assert.equal(entries.get('max-height')?.priority, 'important', 'Measured height priority');
        assert.ok(parseFloat(entries.get('max-height')?.value) >= 1, 'Positive measured body height');
        assert.ok(body.rect[2] > 0, 'Positive body width');
        if (body.hasChildren) assert.ok(body.rect[3] > 0, 'Positive content body area');
        else assert.equal(body.rect[3], 0, 'Empty owned body preserves zero height');
        if (body.sourceRect) assert.ok(body.sourceRect[2] > 0 && body.sourceRect[3] > 0, 'Positive original native door area');
        assert.ok(body.rect[0] >= 11 && body.rect[0] + body.rect[2] <= body.viewportWidth - 11, 'Body viewport containment');
        assert.ok(entries.get('--dcuf-header-drawer-inline-start')?.value.endsWith('px'), 'Measured offset required');
        if (body.sourceHeight !== null) assert.equal(entries.get('max-height')?.value, `${Math.max(Math.ceil(body.innerScrollHeight), 1)}px`, 'Second height measurement');
    }
}

export function captureBodyPhase() {
    const drawer = document.querySelector('.dcuf-header-drawer'), body = drawer.querySelector('.dcuf-header-drawer__body');
    const inner = body.firstElementChild, source = document.querySelector('.issue_contentbox');
    const trace = [], restore = [];
    const replace = (object, name, value) => {
        const original = Object.getOwnPropertyDescriptor(object, name);
        Object.defineProperty(object, name, { configurable: true, ...value });
        restore.push(() => original ? Object.defineProperty(object, name, original) : delete object[name]);
    };
    for (const [node, id] of [[drawer, 'drawer'], [body, 'body'], [inner, 'inner'], [source, 'source']]) {
        if (!node) continue;
        const getRect = node.getBoundingClientRect;
        replace(node, 'getBoundingClientRect', { value() {
            const result = getRect.call(this);
            trace.push(['read', id, 'rect', [result.x, result.y, result.width, result.height]]);
            return result;
        } });
    }
    for (const [node, id] of [[body, 'body'], [inner, 'inner']]) {
        let prototype = node, getter;
        while (prototype && !getter) { getter = Object.getOwnPropertyDescriptor(prototype, 'scrollHeight')?.get; prototype = Object.getPrototypeOf(prototype); }
        replace(node, 'scrollHeight', { get() {
            const result = getter.call(this);
            trace.push(['read', id, 'scrollHeight', result, inner.style.paddingTop]);
            return result;
        } });
    }
    const setProperty = body.style.setProperty;
    replace(body.style, 'setProperty', { value(name, value, priority = '') {
        trace.push(['write', name, value, priority]);
        return setProperty.call(this, name, value, priority);
    } });
    try { window.__dcufHeaderDrawerHostAdapter.refresh(); }
    finally { restore.reverse().forEach(run => run()); }
    return { trace, hasNativeSource: Boolean(source), hasChildren: inner.childElementCount > 0 };
}

export function validateBodyPhase(phase) {
    const { trace, hasNativeSource } = phase;
    const writes = trace.filter(entry => entry[0] === 'write');
    assert.deepEqual(writes.map(entry => entry[1]), ['--dcuf-header-drawer-inline-start', 'display', 'visibility', 'opacity', 'pointer-events', 'overflow', 'max-height', ...(hasNativeSource ? ['max-height'] : [])], 'Body write phases');
    const firstHeight = trace.findIndex(entry => entry[0] === 'write' && entry[1] === 'max-height');
    assert.deepEqual(trace.slice(firstHeight - 3, firstHeight).map(entry => entry.slice(0, 3)), [
        ['read', 'inner', 'scrollHeight'], ['read', 'inner', 'rect'], ['read', 'body', 'scrollHeight']
    ], 'First visible-body height read order');
    if (hasNativeSource) {
        const sourceRead = trace.findIndex(entry => entry[0] === 'read' && entry[1] === 'source');
        const lastHeight = trace.findLastIndex(entry => entry[0] === 'write' && entry[1] === 'max-height');
        assert.ok(sourceRead > firstHeight && lastHeight > sourceRead, 'Native source measurement precedes second height');
        assert.deepEqual(trace[lastHeight - 1].slice(0, 3), ['read', 'inner', 'scrollHeight']);
        assert.equal(trace[lastHeight - 1][4], phase.hasChildren ? `${Math.ceil(trace[sourceRead][3][3])}px` : '', 'Padding applied before second height read');
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const source = await readFile(path.join(root, 'src/targets/mobile/header-drawer-presenter.js'), 'utf8');
    const faults = validateBodyPresenterFaults(source);
    const layoutFaults = validateLayoutPresenterFaults(source);
    console.log(`Drawer body/layout pure contract: PASS; ${faults + layoutFaults} wrong-value/omission faults rejected.`);
}
