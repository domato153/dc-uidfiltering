import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {startServer} from './server/server.mjs';
import {createTestPage, launchBrowser, getMetrics, assertNoRuntimeErrors, storageKeys} from './harness/runner-utils.mjs';

// Catches roles applied only by a later RAF: final styles can agree while the first frame flashes.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv.includes('--require-runtime-under-test'), 'Guarded source runtime required');
const argument = name => {
    const index = process.argv.indexOf(name);
    assert.ok(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--'), `${name} path required`);
    return path.resolve(root, process.argv[index + 1]);
};
const output = argument('--output');
const control = argument('--control');
const candidate = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const negative = process.argv.includes('--negative-control') ? argument('--negative-control') : null;
const fallback = process.argv.includes('--fallback-observer');
const sha = value => createHash('sha256').update(value).digest('hex').toUpperCase();
const canonical = text => text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
const candidateBytes = await readFile(candidate);
const inputs = {};
for (const input of ['src/targets/mobile/header-drawer-host-adapter.js', 'src/targets/mobile/header-drawer-presenter.js', 'src/targets/mobile/runtime-coordinator.js', 'testbed/harness/runner-utils.mjs', 'testbed/fixtures/pages.mjs', 'testbed/fixtures/builders.mjs']) {
    const bytes = await readFile(path.join(root, input));
    inputs[input] = sha(bytes);
    if (input.startsWith('src/')) assert.ok(canonical(candidateBytes.toString()).includes(canonical(bytes.toString())), `Built source drift: ${input}`);
}
const report = {kind:'native-drawer-first-frame',status:'PARTIAL',scope:'BOUNDED_SYNTHETIC_NOT_STAGE_ACCEPTANCE',
    mutationMode:fallback ? 'existing-fallback-observer' : 'shared-mutation-subscription',
    sameStackStylePreservation:'UNKNOWN', liveHostMeasurementImpact:'UNKNOWN', inputs, observerSha256:sha(await readFile(fileURLToPath(import.meta.url))), runtimes:{}, sides:{}, listCosts:{}, relationExits:{}};
const settle = page => page.waitForFunction(() => {
    const m = window.__dcufTestbedMetrics.snapshot();
    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
        && document.getAnimations().every(a => a.playState !== 'running');
});
const server = await startServer(); let browser;
try {
    browser = await launchBrowser(); report.browser = browser.version();
    for (const [side, runtime] of Object.entries({control, candidate, ...(negative ? {negative} : {})})) {
        const bytes = await readFile(runtime);
        report.runtimes[side] = {path:runtime, sha256:sha(bytes)};
        if (side === 'control') assert.equal(sha(bytes), process.argv.includes('--binding-control')
            ? 'EFF9876F41C382A49702285BFAB0A91B8E3A27196A4D7B3D28F6086805EE1689'
            : '2AA122E15EE3521500C06BCFCDA5FE280EDF54EE05571A32ADE2C88D29C7FD56');
        if (side === 'negative') assert.equal(sha(bytes), 'BD9D564B03471C0028558942AE9804E387352F1C9E0638FAFF6C681C4686321B');
        console.log(`First-frame ${side}: ${runtime}; SHA-256 ${sha(bytes)}`);
        process.env.DCUF_TESTBED_USERSCRIPT = runtime; process.env.DCUF_TESTBED_TARGET = 'mobile';
        const session = await createTestPage(browser, server.baseUrl, {viewport:{width:390,height:900}, storage:{
            [storageKeys.threshold]:0, [storageKeys.ratioEnabled]:false, [storageKeys.personalEnabled]:true,
            [storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}});
        try {
            const page = session.page;
            await session.goto('/mgallery/board/lists?id=test');
            await page.locator('#dcuf-testbed-controls').evaluate(node => {node.style.display='none';});
            await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1);
            if(fallback) {
                await page.evaluate(() => {
                    const coordinator=window.__dcufRuntimeCoordinator, subscribe=coordinator.subscribeMutations;
                    window.__dcufHeaderDrawerHostAdapter.dispose();
                    coordinator.subscribeMutations=undefined;
                    try {window.__dcufHeaderDrawerHostAdapter.connect();}
                    finally {coordinator.subscribeMutations=subscribe;}
                });
                await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().fallbackObservers===1);
            }
            await page.evaluate(() => {
                const recom=document.createElement('section'); recom.id='gall_top_recom'; recom.className='concept_wrap';
                recom.innerHTML='<div class="concept_txtlist">Native recommendation</div>';
                document.querySelector('.issue_wrap').append(recom);
            });
            await settle(page);
            await page.locator('.dcuf-header-drawer__toggle').click(); await settle(page);
            await page.evaluate(() => {
                const style = document.createElement('style');
                style.textContent = '.native-frame-probe::before {content:"Native host decoration";display:block}';
                document.head.append(style);
                const button = document.createElement('button'); button.type='button'; button.className='native-frame-probe'; button.textContent='Native action';
                document.querySelector('.minor_intro_box').append(button);
                window.__nativeFrameProbe = {button, source:document.querySelector('.issue_contentbox'),
                    wrap:document.querySelector('.issue_contentbox').closest('.issue_wrap'), recomSource:document.querySelector('#gall_top_recom')};
            });
            await settle(page);
            const beforeCost=await getMetrics(page);
            await page.evaluate(() => {
                const fragment=document.createDocumentFragment();
                for(let i=0;i<500;i++) {const node=document.createElement('div'); node.className='native-cost-unrelated'; fragment.append(node);}
                document.querySelector('.gall_listwrap, .list_wrap').append(fragment);
            });
            await settle(page);
            await page.evaluate(() => document.querySelectorAll('.native-cost-unrelated').forEach(node => node.classList.add('native-cost-changed')));
            await settle(page);
            const afterCost=await getMetrics(page);
            report.listCosts[side]={nodes:500,
                documentSelectorCalls:afterCost.documentQuerySelectorCalls+afterCost.documentQuerySelectorAllCalls-beforeCost.documentQuerySelectorCalls-beforeCost.documentQuerySelectorAllCalls,
                elementSelectorCalls:afterCost.elementQuerySelectorCalls+afterCost.elementQuerySelectorAllCalls-beforeCost.elementQuerySelectorCalls-beforeCost.elementQuerySelectorAllCalls,
                activeFrames:afterCost.activeAnimationFrames, activeIntervals:afterCost.activeIntervals};
            assert.equal(afterCost.activeAnimationFrames,0,'Unrelated list burst settles without a frame leak');
            assert.equal(afterCost.activeIntervals,beforeCost.activeIntervals,'Unrelated list burst adds no intervals');
            await page.evaluate(() => document.querySelectorAll('.native-cost-unrelated').forEach(node => node.remove()));
            await settle(page);
            const observations = [];
            for (const action of ['class-add', 'class-remove', 'nested-insert', 'recom-insert', 'wrapped-copy',
                'root-roundtrip', 'source-class-loss', 'source-class-return', 'ancestor-class-loss', 'ancestor-class-return',
                'recom-id-loss', 'recom-id-return', 'root-replace', 'root-out-of-scope']) {
                const observation = await page.evaluate(async action => {
                    const state = window.__nativeFrameProbe;
                    const source = state.source;
                    if (action === 'class-add') state.button.classList.add('btn_mgall_dcp');
                    if (action === 'class-remove') state.button.classList.remove('btn_mgall_dcp');
                    if (action === 'nested-insert') {
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = '<button type="button" class="native-frame-probe btn_mgall_dcp">Inserted native action</button>';
                        source.querySelector('.minor_intro_box').append(wrapper); state.inserted=wrapper.firstChild;
                    }
                    if (action === 'recom-insert') {
                        const part = document.createElement('div'); part.className='concept_txtlist'; part.style.cssText='width:800px;float:left';
                        document.querySelector('#gall_top_recom').append(part); state.recom=part;
                    }
                    if (action === 'wrapped-copy') {
                        const wrapper = document.createElement('div'); state.copy=state.inserted.cloneNode(true);
                        wrapper.append(state.copy); document.body.append(wrapper);
                    }
                    if (action === 'root-roundtrip') {
                        document.body.append(source);
                        await new Promise(resolve => queueMicrotask(resolve));
                        state.scopeLoss={door:source.getAttribute('data-dcuf-header-native-door'),
                            intro:source.querySelector('.minor_intro_box').getAttribute('data-dcuf-header-door-intro')};
                        state.wrap.append(source);
                        await new Promise(resolve => queueMicrotask(resolve));
                    }
                    if (action === 'source-class-loss') source.classList.remove('issue_contentbox');
                    if (action === 'source-class-return') source.classList.add('issue_contentbox');
                    if (action === 'ancestor-class-loss') state.wrap.classList.remove('issue_wrap');
                    if (action === 'ancestor-class-return') state.wrap.classList.add('issue_wrap');
                    if (action === 'recom-id-loss') state.recomSource.id='native-recom-renamed';
                    if (action === 'recom-id-return') state.recomSource.id='gall_top_recom';
                    if (action === 'root-replace') {
                        const replacement=source.cloneNode(true); source.replaceWith(replacement);
                        state.source=replacement; state.inserted=replacement.querySelector('.btn_mgall_dcp.native-frame-probe');
                    }
                    if (action === 'root-out-of-scope') document.body.append(source);
                    const node = action.startsWith('recom-') ? state.recom : action === 'wrapped-copy' ? state.copy
                        : ['class-add','class-remove'].includes(action) ? state.button : state.inserted;
                    const read = () => {
                        const style=getComputedStyle(node), before=getComputedStyle(node,'::before');
                        return {before:before.content, beforeDisplay:before.display, width:style.width,
                            maxWidth:style.maxWidth, boxSizing:style.boxSizing, float:style.float, color:style.color};
                    };
                    const immediate=read();
                    const firstFrame=await new Promise(resolve => requestAnimationFrame(() => resolve(read())));
                    return {action, immediate, firstFrame, ...(action === 'root-roundtrip' ? {scopeLoss:state.scopeLoss} : {})};
                }, action);
                await settle(page);
                observations.push(observation);
            }
            assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
            report.sides[side] = observations;
            report.relationExits[side]={};
            for(const exit of ['no-mount','non-list']) {
                await page.evaluate(exit => {
                    if(exit==='no-mount') document.querySelectorAll('.page_head,.list_array_option,.gall_listwrap,.list_wrap').forEach(node => node.remove());
                    else {const view=document.createElement('div'); view.className='view_content_wrap'; document.body.append(view);}
                },exit);
                await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().drawerCount===0);
                await settle(page);
                report.relationExits[side][exit]=await page.evaluate(() => {
                    const relation=document.querySelector('.issue_wrap > #relation_popup');
                    const style=getComputedStyle(relation);
                    return {zIndex:style.zIndex,position:style.position};
                });
            }
            await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
            await settle(page);
            assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(value => value===false || value===0), 'All owner resources close');
            if(side==='candidate') assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-dcuf-header-door-context],[data-dcuf-header-recom-context],[data-dcuf-header-relation-context],[data-dcuf-header-native-parts]'))),false,'Context/provenance closes in the tested mutation mode');
            assertNoRuntimeErrors(await getMetrics(page),session.consoleErrors);
        } finally {await session.close();}
    }
    const differences = side => report.sides[side].flatMap((observation, index) =>
        JSON.stringify(observation.firstFrame) === JSON.stringify(report.sides.control[index].firstFrame)
            ? [] : [{action:observation.action, control:report.sides.control[index].firstFrame, actual:observation.firstFrame}]);
    assert.equal(report.sides.control[0].firstFrame.before, 'none', 'Control suppresses decoration before paint');
    report.differences = differences('candidate');
    report.sameStackDifferences=report.sides.candidate.flatMap((observation,index) =>
        JSON.stringify(observation.immediate)===JSON.stringify(report.sides.control[index].immediate)
            ? [] : [{action:observation.action,control:report.sides.control[index].immediate,actual:observation.immediate}]);
    report.sameStackStylePreservation=report.sameStackDifferences.length ? 'FAIL_BOUNDED_COMPUTED_STYLE' : 'EQUAL_FOR_SELECTED_SAMPLES';
    if (negative) {
        report.negativeDifferences = differences('negative');
        assert.ok(report.negativeDifferences.some(row => row.action === 'class-add' && row.actual.before === '"Native host decoration"'), 'Frozen negative must expose the known first-frame decoration failure');
    }
    assert.deepEqual(report.differences, [], 'Native first-frame computed-style drift');
    if (process.argv.includes('--require-same-stack-preservation')) {
        assert.deepEqual(report.sameStackDifferences, [], 'Native same-stack computed-style drift');
    }
    assert.deepEqual(report.relationExits.candidate,report.relationExits.control,'Still-owned relation styles survive drawer-only owner exits');
    report.status='PASS';
} catch (error) {report.error=error.stack; throw error;}
finally {await browser?.close(); await server.close(); await writeFile(output, JSON.stringify(report,null,2)+'\n');}
console.log(`First-frame PASS: ${report.sides.candidate.length} transitions; negative control ${negative ? 'rejected' : 'not run'}; same-stack ${report.sameStackStylePreservation}; live host measurement UNKNOWN.`);
