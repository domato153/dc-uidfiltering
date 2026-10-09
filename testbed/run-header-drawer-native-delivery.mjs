import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './server/server.mjs';
import {createTestPage, launchBrowser, getMetrics, assertNoRuntimeErrors, storageKeys} from './harness/runner-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv.includes('--require-runtime-under-test'), 'Guarded source runtime required');
const argument = name => {
    const index = process.argv.indexOf(name);
    assert.ok(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--'), `${name} required`);
    return path.resolve(root, process.argv[index + 1]);
};
const output = argument('--output'), control = argument('--control');
const candidate = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const negative = process.argv.includes('--negative-control') ? argument('--negative-control') : null;
const exitNegative = process.argv.includes('--exit-negative-control') ? argument('--exit-negative-control') : null;
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const report = {kind:'native-drawer-mutation-delivery', status:'PARTIAL', scope:'BOUNDED_NOT_HEADER_ADMISSION',
    observerSha256:sha(await readFile(fileURLToPath(import.meta.url))), inputs:{}, runtimes:{}, sides:{}, differences:[]};
for(const input of ['src/targets/mobile/header-drawer-host-adapter.js','src/targets/mobile/header-drawer-presenter.js',
    'src/targets/mobile/runtime-coordinator.js','testbed/harness/runner-utils.mjs','testbed/harness/userscript-loader.mjs',
    'testbed/harness/runtime-instrumentation.js','testbed/fixtures/pages.mjs','testbed/fixtures/builders.mjs']) {
    report.inputs[input]=sha(await readFile(path.join(root,input)));
}
const settle = page => page.waitForFunction(() => {
    const metrics = window.__dcufTestbedMetrics.snapshot();
    return metrics.activeTimeouts === 0 && metrics.activeAnimationFrames === 0 && metrics.activeIntervals === 0
        && document.getAnimations().every(animation => animation.playState === 'finished' || animation.playState === 'idle');
});
const server = await startServer(); let browser;
try {
    browser = await launchBrowser(); report.browser = browser.version();
    for (const [side,runtime] of Object.entries({control,candidate,...(negative ? {negative} : {}),...(exitNegative ? {exitNegative} : {})})) {
        const bytes = await readFile(runtime); report.runtimes[side]={path:runtime,sha256:sha(bytes)};
        if(side==='control') assert.equal(sha(bytes),'2AA122E15EE3521500C06BCFCDA5FE280EDF54EE05571A32ADE2C88D29C7FD56');
        if(side==='negative') assert.equal(sha(bytes),'4225DFC52C27BA64332015FE70F304543C0CC61D1DF9E434049E37D815C3EE0A');
        if(side==='exitNegative') assert.equal(sha(bytes),'E9237687695C27C2BE58E0108FAE236261152EBFC2BDF763B4A0C204EA9BA5AD');
        process.env.DCUF_TESTBED_USERSCRIPT=runtime; process.env.DCUF_TESTBED_TARGET='mobile';
        report.sides[side]={};
        for(const mode of ['shared','fallback']) {
            const session = await createTestPage(browser,server.baseUrl,{viewport:{width:390,height:900},storage:{
                [storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.personalEnabled]:true,
                [storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}});
            const page=session.page, observations={phases:[],relation:[]};
            report.sides[side][mode]=observations;
            try {
                await session.goto('/mgallery/board/lists?id=test');
                await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers===1);
                if(mode==='fallback') await page.evaluate(() => {
                    const coordinator=window.__dcufRuntimeCoordinator,subscribe=coordinator.subscribeMutations;
                    window.__dcufHeaderDrawerHostAdapter.dispose(); coordinator.subscribeMutations=undefined;
                    try {window.__dcufHeaderDrawerHostAdapter.connect();}
                    finally {coordinator.subscribeMutations=subscribe;}
                });
                await settle(page); await page.locator('.dcuf-header-drawer__toggle').click(); await settle(page);
                await page.evaluate(() => {
                    const button=document.createElement('button'); button.type='button'; button.textContent='Native delivery probe';
                    document.querySelector('.minor_intro_box').append(button); window.__deliveryButton=button;
                });
                await settle(page);
                for(const action of ['class-add','class-remove','style','text','ancestor-loss','ancestor-return','mixed']) {
                    await page.evaluate(action => {
                        const body=document.querySelector('.dcuf-header-drawer__body'), source=document.querySelector('.issue_contentbox');
                        const trace=[],restore=[];
                        for(const [object,name,kind] of [[body.style,'setProperty','write'],[source,'getBoundingClientRect','read']]) {
                            const descriptor=Object.getOwnPropertyDescriptor(object,name), original=object[name];
                            Object.defineProperty(object,name,{configurable:true,value(...args){trace.push([kind,...(kind==='write' ? args : [])]);return original.apply(this,args);}});
                            restore.push(() => descriptor ? Object.defineProperty(object,name,descriptor) : delete object[name]);
                        }
                        window.__deliveryTrace=trace; window.__deliveryRestore=() => restore.reverse().forEach(run => run());
                        const button=window.__deliveryButton;
                        if(action==='class-add') button.classList.add('btn_mgall_dcp');
                        if(action==='class-remove') button.classList.remove('btn_mgall_dcp');
                        if(action==='style') button.style.marginLeft='1px';
                        if(action==='text') button.firstChild.data='Changed native delivery text';
                        if(action==='ancestor-loss') source.closest('.issue_wrap').classList.remove('issue_wrap');
                        if(action==='ancestor-return') source.parentElement.classList.add('issue_wrap');
                        if(action==='mixed') {
                            button.classList.add('btn_mgall_dcp');
                            document.querySelector('.page_head').classList.add('delivery-mixed');
                        }
                    },action);
                    await settle(page);
                    const trace=await page.evaluate(() => {window.__deliveryRestore();return window.__deliveryTrace;});
                    observations.phases.push({action,trace});
                }
                observations.exitFrame=await page.evaluate(() => {
                    const view=document.createElement('div');view.className='view_content_wrap';document.body.append(view);
                    const relation=document.querySelector('.issue_wrap > #relation_popup');
                    window.__deliveryRelation={relation,wrap:relation.parentElement,cached:relation.cloneNode(true)};
                    // Insertion of a view root alone is not a legacy drawer callback.
                    // Deliver a normal page-head mutation to exercise the real non-list exit.
                    document.querySelector('.page_head').classList.add('delivery-view-route');
                    const source=window.__deliveryButton.closest('.issue_contentbox');
                    return new Promise(resolve => requestAnimationFrame(() => {
                        const style=getComputedStyle(source);
                        resolve({position:style.position,display:style.display,left:style.left,top:style.top,width:style.width,visibility:style.visibility});
                    }));
                });
                await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().drawerCount===0);await settle(page);
                for(const action of ['ancestor-loss','ancestor-return','id-loss','id-return','reparent','return','wrapped-copy','cached-copy']) {
                    const firstFrame=await page.evaluate(async action => {
                        const state=window.__deliveryRelation,relation=state.relation;let node=relation;
                        if(action==='ancestor-loss') state.wrap.classList.remove('issue_wrap');
                        if(action==='ancestor-return') state.wrap.classList.add('issue_wrap');
                        if(action==='id-loss') relation.id='native-relation-renamed';
                        if(action==='id-return') relation.id='relation_popup';
                        if(action==='reparent') document.body.append(relation);
                        if(action==='return') state.wrap.append(relation);
                        if(action==='wrapped-copy' || action==='cached-copy') {
                            const wrapper=document.createElement('div');node=action==='cached-copy' ? state.cached : relation.cloneNode(true);
                            wrapper.append(node);document.body.append(wrapper);state.copyWrapper=wrapper;
                        }
                        return new Promise(resolve => requestAnimationFrame(() => {const style=getComputedStyle(node);resolve({position:style.position,zIndex:style.zIndex});}));
                    },action);
                    await settle(page);
                    const settled=await page.evaluate(action => {
                        const state=window.__deliveryRelation,node=action.endsWith('copy') ? state.copyWrapper.firstElementChild : state.relation;
                        const style=getComputedStyle(node),result={position:style.position,zIndex:style.zIndex};
                        if(action.endsWith('copy')) state.copyWrapper.remove();return result;
                    },action);
                    await settle(page);observations.relation.push({action,firstFrame,settled});
                }
                await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());await settle(page);
                assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(value => value===false || value===0),'Owner resources close');
                assertNoRuntimeErrors(await getMetrics(page),session.consoleErrors);
                report.sides[side][mode]=observations;
            } finally {await session.close();}
        }
    }
    const differences = side => ['shared','fallback'].flatMap(mode => [
        ...(JSON.stringify(report.sides[side][mode].exitFrame)===JSON.stringify(report.sides.control[mode].exitFrame) ? []
            : [{mode,kind:'exitFrame',control:report.sides.control[mode].exitFrame,actual:report.sides[side][mode].exitFrame}]),
        ...['phases','relation'].flatMap(kind => report.sides[side][mode][kind].flatMap((actual,index) => {
            const control=report.sides.control[mode][kind][index];
            return JSON.stringify(actual)===JSON.stringify(control) ? [] : [{mode,kind,action:actual.action,control,actual}];
        }))]);
    assert.ok(report.sides.control.shared.phases.filter(row => row.action!=='mixed').every(row => row.trace.length===0),'Control ordinary callback ignores generic descendant and ancestor-only changes');
    assert.ok(report.sides.control.shared.phases.find(row => row.action==='mixed').trace.some(row => row[0]==='read'),'Mixed positive control retains ordinary geometry delivery');
    assert.ok(report.sides.control.shared.relation.some(row => row.action==='ancestor-loss' && row.settled.zIndex==='auto'),'Control relation applicability changes');
    report.differences=differences('candidate');
    if(negative) {
        report.negativeDifferences=differences('negative');
        assert.ok(report.negativeDifferences.some(row => row.mode==='shared' && row.kind==='phases' && row.action==='class-add'),'Negative exposes expanded geometry delivery');
        assert.ok(report.negativeDifferences.some(row => row.mode==='shared' && row.kind==='relation' && row.action==='ancestor-loss'),'Negative exposes stale post-exit relation context');
        assert.ok(report.negativeDifferences.some(row => row.mode==='fallback' && row.kind==='relation' && row.action==='id-loss'),'Negative exposes fallback ID loss');
    }
    if(exitNegative) {
        report.exitNegativeDifferences=differences('exitNegative');
        assert.ok(report.exitNegativeDifferences.some(row => row.mode==='fallback' && row.kind==='exitFrame'),'Negative exposes premature native applicability withdrawal');
    }
    assert.deepEqual(report.differences,[],'Native mutation delivery drift');report.status='PASS';
} catch(error) {report.error=error.stack;throw error;}
finally {await browser?.close();await server.close();await writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log('Native delivery PASS: seven ordinary phases and eight post-exit relation transitions in each mutation mode; exact control/candidate contexts.');
