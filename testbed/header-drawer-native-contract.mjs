import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadDrawerPresenter} from './header-drawer-body-contract.mjs';

export function validateNativePresenter(source) {
    const css = loadDrawerPresenter(source).style.css;
    assert.ok(!/\.issue_wrap|\.issue_contentbox|#gall_top_recom|#hot_(?:rank|tip)|#relation_popup|\.minor_(?:intro|ranking)|\.btn_mgall_dcp|\.under_poply_close|\.pageing_box|\.concept_(?:txtlist|img)|\*/.test(css), 'Native drawer style must consume semantic projection, not host topology');
    for (const marker of ['data-dcuf-header-native-door', 'data-dcuf-header-native-recom', 'data-dcuf-header-door-fluid', 'data-dcuf-header-door-intro', 'data-dcuf-header-door-ranking', 'data-dcuf-header-door-no-decoration', 'data-dcuf-header-door-popup="rank"', 'data-dcuf-header-door-popup="tip"', 'data-dcuf-header-recom-part="paging"', 'data-dcuf-header-recom-part="text"', 'data-dcuf-header-recom-part="image"', 'data-dcuf-header-relation-popup', 'data-dcuf-header-relation-static', 'data-dcuf-header-door-context', 'data-dcuf-header-recom-context', 'data-dcuf-header-relation-context']) assert.ok(css.includes(marker), `Missing native semantic selector: ${marker}`);
}

export function captureNativeParts() {
    const selectors = ['.issue_contentbox', '.minor_intro_box', '.minor_ranking_box', '.btn_mgall_dcp', '.under_poply_close', '#hot_tip_pop', '#hot_rank_pop2', '#hot_rank_pop2 .pop_content', '#gall_top_recom', '#gall_top_recom > .pageing_box', '#gall_top_recom > .concept_txtlist', '#gall_top_recom > .concept_img', '.issue_wrap > #relation_popup'];
    const styles = selectors.map(selector => [...document.querySelectorAll(selector)].map(node => {
        const s = getComputedStyle(node), r = node.getBoundingClientRect(), before = getComputedStyle(node, '::before');
        return { rect: [r.x,r.y,r.width,r.height].map(x=>Math.round(x*10)/10), display:s.display, visibility:s.visibility, pointerEvents:s.pointerEvents, width:s.width, maxWidth:s.maxWidth, boxSizing:s.boxSizing, position:s.position, left:s.left, right:s.right, background:s.background, borderColor:s.borderColor, color:s.color, shadow:s.boxShadow, zIndex:s.zIndex, before:[before.content,before.display] };
    }));
    return {styles, topology:(window.__nativeOriginalNodes || []).map(({node,parent,next,handler}) => node.isConnected && node.parentNode===parent && node.nextSibling===next && node.onclick===handler)};
}

export function readNativeProjection() {
    const checks = [
        ['.issue_wrap .issue_contentbox', 'data-dcuf-header-native-door', '1'],
        ['.issue_wrap .issue_contentbox', 'data-dcuf-header-door-context', '1'],
        ['.issue_wrap #gall_top_recom.concept_wrap', 'data-dcuf-header-recom-context', '1'],
        ['.issue_wrap > #relation_popup', 'data-dcuf-header-relation-context', '1'],
        ['.minor_intro_box', 'data-dcuf-header-door-intro', '1'],
        ['.minor_ranking_box', 'data-dcuf-header-door-ranking', '1'],
        ['.btn_mgall_dcp, .under_poply_close', 'data-dcuf-header-door-no-decoration', '1'],
        ['#hot_rank_pop2', 'data-dcuf-header-door-popup', 'rank'],
        ['#hot_tip_pop', 'data-dcuf-header-door-popup', 'tip'],
        ['#gall_top_recom > .pageing_box', 'data-dcuf-header-recom-part', 'paging'],
        ['#gall_top_recom > .concept_txtlist', 'data-dcuf-header-recom-part', 'text'],
        ['#gall_top_recom > .concept_img', 'data-dcuf-header-recom-part', 'image']
    ];
    return checks.flatMap(([selector, attribute, expected]) => [...document.querySelectorAll(selector)].map(node => ({selector, attribute, expected, actual:node.getAttribute(attribute)})))
        .concat([...document.querySelectorAll('#hot_rank_pop2, #hot_rank_pop2 *')].map(node => ({selector:'rank interior exclusion', attribute:'data-dcuf-header-door-fluid', expected:null, actual:node.getAttribute('data-dcuf-header-door-fluid')})));
}

export function validateNativeProjection(rows) {
    assert.ok(rows.length > 0, 'Native projection needs applicable controls');
    assert.ok(rows.every(row => row.actual === row.expected), 'Native projection role/scope mismatch');
}

// The named native binding makes descendant/context writes unnecessary. Keep the
// old role oracle above for historical controls; this oracle checks host data and
// actual selector effects without requiring the removed implementation.
export async function exerciseNativeUnprojectedLifecycle(page, settle) {
    const steps = [];
    await page.evaluate(() => {
        window.__dcufHeaderDrawerHostAdapter.dispose();
        const source = document.querySelector('.issue_wrap .issue_contentbox');
        const intro = source.querySelector('.minor_intro_box');
        source.setAttribute('data-dcuf-header-native-door','1');
        let ranking = source.querySelector('.minor_ranking_box');
        if (!ranking) {ranking=document.createElement('div');ranking.className='minor_ranking_box';source.append(ranking);}
        const hostStyle=document.createElement('style');
        hostStyle.textContent='.native-lifecycle-button::before { content: "Native host decoration"; }';
        document.head.append(hostStyle);
        intro.setAttribute('data-dcuf-header-door-intro', 'host-original');
        ranking.setAttribute('data-dcuf-header-door-ranking', '1');
        source.setAttribute('data-dcuf-header-door-context', 'host-context');
        const relation=document.querySelector('.issue_wrap > #relation_popup');
        relation.setAttribute('data-dcuf-header-relation-popup','host-relation');
        relation.setAttribute('data-dcuf-header-relation-static','host-static');
        const attributes = ['data-dcuf-header-door-fluid','data-dcuf-header-door-intro',
            'data-dcuf-header-door-ranking','data-dcuf-header-door-no-decoration',
            'data-dcuf-header-door-popup','data-dcuf-header-recom-part',
            'data-dcuf-header-door-context','data-dcuf-header-recom-context',
            'data-dcuf-header-relation-context','data-dcuf-header-native-parts'];
        const nodes = [source, ...source.querySelectorAll('*'), document.querySelector('.issue_wrap > #relation_popup')].filter(Boolean);
        const before = nodes.map(node => attributes.map(name => node.getAttribute(name)));
        const writes = [];
        const observer = new MutationObserver(records => writes.push(...records.map(record => record.attributeName)));
        observer.observe(document.body, {subtree:true,attributes:true,attributeFilter:attributes});
        window.__nativeUnprojected = {source, intro, ranking, relation, attributes, nodes, before, writes, observer};
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    const unchanged = async name => {
        await settle(page);
        const state = await page.evaluate(() => {
            const s = window.__nativeUnprojected;
            return {before:s.before, after:s.nodes.map(node => s.attributes.map(name => node.getAttribute(name))), writes:s.writes};
        });
        assert.deepEqual(state.after, state.before, `${name}: host descendant/context data must remain untouched`);
        assert.deepEqual(state.writes, [], `${name}: no obsolete role or provenance writes`);
        steps.push(name);
    };
    await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers === 1
        && document.querySelector('.dcuf-header-drawer__toggle'));
    await unchanged('connect-host-values');
    await page.locator('.dcuf-header-drawer__toggle').click();
    await unchanged('native-open');
    await page.evaluate(() => {
        const s = window.__nativeUnprojected, container = document.createElement('div');
        const button = document.createElement('button'); button.textContent = 'Native lifecycle control';button.className='native-lifecycle-button';
        container.append(button); s.intro.append(container); s.container=container; s.button=button;
        button.classList.add('btn_mgall_dcp');
    });
    await unchanged('nested-class-add');
    assert.equal(await page.evaluate(() => getComputedStyle(window.__nativeUnprojected.button,'::before').content), 'none', 'Native binding suppresses decoration on an inserted control');
    await page.evaluate(() => window.__nativeUnprojected.button.classList.remove('btn_mgall_dcp'));
    await unchanged('nested-class-remove');
    assert.notEqual(await page.evaluate(() => getComputedStyle(window.__nativeUnprojected.button,'::before').content), 'none', 'Role loss restores native decoration behavior');
    await page.evaluate(() => {
        const s=window.__nativeUnprojected; s.copy=s.intro.cloneNode(true);
        const wrapper=document.createElement('div'); wrapper.append(s.copy); document.body.append(wrapper); s.wrapper=wrapper;
        s.cached=s.copy.cloneNode(true);
    });
    await unchanged('wrapped-host-copy');
    assert.equal(await page.evaluate(() => window.__nativeUnprojected.copy.getAttribute('data-dcuf-header-door-intro')), 'host-original');
    await page.evaluate(() => {
        const s=window.__nativeUnprojected; s.replacement=s.source.cloneNode(true); s.source.replaceWith(s.replacement);
    });
    await unchanged('source-replacement-detached-data');
    assert.equal(await page.evaluate(() => window.__nativeUnprojected.replacement.querySelector('.minor_intro_box').getAttribute('data-dcuf-header-door-intro')), 'host-original');
    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
    await unchanged('dispose-host-values');
    assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(value => value === false || value === 0));
    const roots=await page.evaluate(() => {
        const s=window.__nativeUnprojected;
        return {original:s.source.getAttribute('data-dcuf-header-native-door'),
            replacement:['data-dcuf-header-native-door','data-dcuf-header-native-door-open','data-dcuf-header-native-door-popup-only']
                .map(name=>s.replacement.getAttribute(name)),
            relation:['data-dcuf-header-relation-popup','data-dcuf-header-relation-static'].map(name=>s.relation.getAttribute(name))};
    });
    assert.deepEqual(roots,{original:'1',replacement:[null,null,null],relation:['host-relation','host-static']},
        'Root ledger preserves preexisting 1, releases owned replacement markers, and restores exact relation data');
    await page.evaluate(() => {
        const s=window.__nativeUnprojected; s.wrapper.remove(); document.body.append(s.cached);
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    await unchanged('cached-copy-and-reconnect');
    assert.equal(await page.evaluate(() => window.__nativeUnprojected.cached.getAttribute('data-dcuf-header-door-intro')), 'host-original');
    await page.evaluate(() => {window.__dcufHeaderDrawerHostAdapter.dispose();window.__nativeUnprojected.observer.disconnect();});
    await unchanged('final-dispose');
    assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(value => value === false || value === 0));
    return {status:'PASS',steps};
}

// Exercise the production mutation subscription. refresh() is intentionally absent from these transitions.
export async function exerciseNativeLifecycle(page, settle) {
    const steps = [];
    const check = async (name, predicate) => {
        try { await page.waitForFunction(predicate, undefined, {timeout: 3000}); }
        catch (error) {
            const diagnostic = await page.evaluate(() => Object.fromEntries(Object.entries(window.__nativeLifecycle)
                .map(([key, node]) => [key, {connected: node.isConnected, className: node.className,
                    attributes: [...node.attributes].filter(a => a.name.startsWith('data-dcuf-header')).map(a => [a.name, a.value])}])));
            throw new Error(`${name}: ${error.message}; completed ${JSON.stringify(steps)}; ${JSON.stringify(diagnostic)}`, {cause: error});
        }
        await settle(page);
        steps.push(name);
    };
    await page.evaluate(() => {
        const source = document.querySelector('.issue_wrap .issue_contentbox');
        const container = document.createElement('div');
        container.className = 'native-contract-container';
        source.querySelector('.minor_intro_box').append(container);
        window.__nativeLifecycle = {source, container};
    });
    await check('nested-container', () => window.__nativeLifecycle.container.getAttribute('data-dcuf-header-door-fluid') === '1');
    await page.evaluate(() => {
        const {container} = window.__nativeLifecycle;
        container.setAttribute('data-dcuf-header-door-ranking', 'host-later');
        container.classList.add('minor_ranking_box');
    });
    await check('later-role-activation', () => window.__nativeLifecycle.container.getAttribute('data-dcuf-header-door-ranking') === '1');
    await page.evaluate(() => window.__nativeLifecycle.container.classList.remove('minor_ranking_box'));
    await check('later-role-exact-rollback', () => window.__nativeLifecycle.container.getAttribute('data-dcuf-header-door-ranking') === 'host-later');
    await page.evaluate(() => {
        const inactiveCopy = window.__nativeLifecycle.container.cloneNode(true);
        window.__nativeLifecycle.inactiveCopy = inactiveCopy;
        document.body.append(inactiveCopy);
    });
    await check('inactive-host-attribute-on-copy', () => window.__nativeLifecycle.inactiveCopy.getAttribute('data-dcuf-header-door-fluid') === null
        && window.__nativeLifecycle.inactiveCopy.getAttribute('data-dcuf-header-door-ranking') === 'host-later');
    await page.evaluate(() => window.__nativeLifecycle.inactiveCopy.remove());
    await page.evaluate(() => {
        const node = document.createElement('div');
        node.className = 'minor_ranking_box';
        node.setAttribute('data-dcuf-header-door-ranking', 'rank');
        window.__nativeLifecycle.node = node;
        window.__nativeLifecycle.container.append(node);
    });
    await check('nested-insertion', () => window.__nativeLifecycle.node.getAttribute('data-dcuf-header-door-ranking') === '1');
    await page.evaluate(() => { window.__nativeLifecycle.node.className = 'native-contract-no-role'; });
    await check('class-removal-exact-reserved-rollback', () => window.__nativeLifecycle.node.getAttribute('data-dcuf-header-door-ranking') === 'rank');
    await page.evaluate(() => { window.__nativeLifecycle.node.className = 'minor_ranking_box'; });
    await check('class-addition', () => window.__nativeLifecycle.node.getAttribute('data-dcuf-header-door-ranking') === '1');
    await page.evaluate(() => {
        const clone = window.__nativeLifecycle.node.cloneNode(true);
        window.__nativeLifecycle.clone = clone;
        window.__nativeLifecycle.lateCopy = clone.cloneNode(true);
        document.body.append(clone);
    });
    await check('out-of-context-copy', () => window.__nativeLifecycle.clone.getAttribute('data-dcuf-header-door-fluid') === null
        && window.__nativeLifecycle.clone.getAttribute('data-dcuf-header-door-ranking') === 'rank');
    await page.evaluate(() => {
        const wrappedCopy = window.__nativeLifecycle.node.cloneNode(true);
        const wrapper = document.createElement('div'); wrapper.append(wrappedCopy);
        window.__nativeLifecycle.wrappedCopy = wrappedCopy; window.__nativeLifecycle.wrapper = wrapper;
        document.body.append(wrapper);
    });
    await check('wrapped-copy-routing', () => window.__nativeLifecycle.wrappedCopy.getAttribute('data-dcuf-header-door-fluid') === null
        && window.__nativeLifecycle.wrappedCopy.getAttribute('data-dcuf-header-door-ranking') === 'rank');
    await page.evaluate(() => window.__nativeLifecycle.wrapper.remove());
    await page.evaluate(() => { window.__nativeLifecycle.node.remove(); window.__nativeLifecycle.clone.remove(); });
    await check('detached-exact-rollback', () => window.__nativeLifecycle.node.getAttribute('data-dcuf-header-door-fluid') === null
        && window.__nativeLifecycle.node.getAttribute('data-dcuf-header-door-ranking') === 'rank');
    await page.evaluate(() => document.body.append(window.__nativeLifecycle.lateCopy));
    await check('cached-copy-after-detachment', () => window.__nativeLifecycle.lateCopy.getAttribute('data-dcuf-header-door-fluid') === null
        && window.__nativeLifecycle.lateCopy.getAttribute('data-dcuf-header-door-ranking') === 'rank');
    await page.evaluate(() => window.__nativeLifecycle.lateCopy.remove());
    await page.evaluate(() => {
        const relation = document.querySelector('.issue_wrap > #relation_popup');
        const clone = relation.cloneNode(true);
        window.__nativeLifecycle.relationClone = clone;
        document.body.append(clone);
    });
    await check('relation-copy-scope', () => !window.__nativeLifecycle.relationClone.hasAttribute('data-dcuf-header-relation-popup')
        && !window.__nativeLifecycle.relationClone.hasAttribute('data-dcuf-header-relation-static'));
    await page.evaluate(() => {
        window.__nativeLifecycle.relationClone.remove();
        const {source} = window.__nativeLifecycle;
        const replacement = source.cloneNode(true);
        window.__nativeLifecycle.replacement = replacement;
        source.replaceWith(replacement);
    });
    await check('replacement-projection', () => window.__nativeLifecycle.replacement.querySelector('.minor_intro_box')
        .getAttribute('data-dcuf-header-door-intro') === '1'
        && !window.__nativeLifecycle.source.querySelector('[data-dcuf-header-door-fluid]'));
    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
    await settle(page);
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.replacement.querySelector('.minor_intro_box')
        .getAttribute('data-dcuf-header-door-intro')), 'host-original', 'Replacement copy restores the known original value');
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.source.querySelector('.minor_intro_box')
        .getAttribute('data-dcuf-header-door-intro')), 'host-original', 'Original detached node restores its own value');
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.source.getAttribute('data-dcuf-header-native-door')), '1', 'Applicable first native root preserves its preexisting 1');
    assert.equal(await page.evaluate(() => Boolean(window.__nativeLifecycle.replacement.querySelector('[data-dcuf-header-door-fluid],[data-dcuf-header-door-popup],[data-dcuf-header-native-parts]'))), false);
    assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(value => value === false || value === 0));
    assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-dcuf-header-door-context],[data-dcuf-header-recom-context],[data-dcuf-header-relation-context],[data-dcuf-header-native-parts]'))), false, 'Dispose restores every context role and its provenance');
    steps.push('replacement-original-and-copy-disposal');
    // A preexisting role equal to the emitted value is still host data, not evidence of a clone.
    await page.evaluate(() => {
        const ranking = document.createElement('div'); ranking.className = 'minor_ranking_box';
        ranking.setAttribute('data-dcuf-header-door-ranking', '1');
        window.__nativeLifecycle.ranking = ranking;
        window.__nativeLifecycle.replacement.append(ranking);
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    await check('first-attachment-reserved-value', () => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers === 1
        && window.__nativeLifecycle.ranking.hasAttribute('data-dcuf-header-native-parts'));
    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
    await settle(page);
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.ranking.getAttribute('data-dcuf-header-door-ranking')), '1');
    steps.push('first-attachment-exact-rollback');
    await page.evaluate(() => {
        const state=window.__nativeLifecycle; state.ranking.remove();
        state.replacementParent=state.replacement.parentNode; state.replacementNext=state.replacement.nextSibling;
        state.replacement.setAttribute('data-dcuf-header-native-door','1'); document.body.append(state.replacement);
        const recom=document.createElement('section'); recom.id='gall_top_recom'; recom.className='concept_wrap';
        recom.setAttribute('data-dcuf-header-native-recom','1'); document.body.append(recom); state.outsideRecom=recom;
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    await check('out-of-scope-first-attachment', () => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers===1
        && window.__nativeLifecycle.replacement.getAttribute('data-dcuf-header-native-door')==='1'
        && !window.__nativeLifecycle.replacement.hasAttribute('data-dcuf-header-door-context'));
    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose()); await settle(page);
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.replacement.getAttribute('data-dcuf-header-native-door')),'1');
    assert.equal(await page.evaluate(() => window.__nativeLifecycle.outsideRecom.getAttribute('data-dcuf-header-native-recom')),'1');
    steps.push('out-of-scope-first-attachment-exact-rollback');
    await page.evaluate(() => {
        const state=window.__nativeLifecycle; state.outsideRecom.remove();
        state.replacementParent.insertBefore(state.replacement,state.replacementNext);
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    await check('reconnect', () => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers === 1
        && window.__nativeLifecycle.replacement.querySelector('.minor_intro_box').getAttribute('data-dcuf-header-door-intro') === '1');
    validateNativeProjection(await page.evaluate(readNativeProjection));
    return {status: 'PASS', steps};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const source=await readFile(new URL('../src/targets/mobile/header-drawer-presenter.js',import.meta.url),'utf8');
    validateNativePresenter(source);
    console.log('Native drawer semantic-selector contract: PASS');
}
