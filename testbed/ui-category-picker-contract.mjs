import assert from 'node:assert/strict';
import {createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {installLiveControlFixture} from './ui-live-control-contract.mjs';

const toolbar = '[data-dcuf-surface="list-toolbar"]';
const invoker = `${toolbar} [data-dcuf-role="category-invoker"]`;
const shell = `${toolbar} [data-dcuf-role="category-shell"]`;
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const hit = async locator => {
    await locator.scrollIntoViewIfNeeded();
    return locator.evaluate(node => {
        const box = node.getBoundingClientRect();
        const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.width > 0 && box.height > 0 && (target === node || node.contains(target));
    });
};

function installCategoryReceipts() {
    const root = document.querySelector('.list_array_option .center_box > .inner');
    const links = [...root.querySelectorAll(':scope > ul > li > a, :scope > .subject_morelist > ul > li > a')];
    window.__categoryPickerCalls = [];
    links.forEach((link, index) => {
        link.href = `#native-category-${index}`;
        link.onclick = event => {
            event.preventDefault();
            window.__categoryPickerCalls.push({index, openDuringCallback: root.matches(':popover-open')});
            links.forEach(candidate => candidate.classList.toggle('on', candidate === link));
            window.__categoryPickerFocusTarget?.focus();
        };
    });
    window.__categoryPickerOriginals = [root, ...root.querySelectorAll('*')].map(node => ({
        node, parent: node.parentNode, onclick: node.onclick, href: node.getAttribute('href'),
    }));
}

async function openPicker(page) {
    const button = page.locator(invoker).first();
    await button.click();
    await page.waitForFunction(selector => document.querySelector(selector)?.matches(':popover-open'), shell);
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-expanded') === 'true', invoker);
    return page.locator(shell).first();
}

async function waitClosed(page) {
    await page.waitForFunction(selector => !document.querySelector(selector)?.matches(':popover-open'), shell);
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-expanded') === 'false', invoker);
}

function refreshCategoryToolbar() {
    const owner = document.querySelector('[data-dcuf-controls-ready="1"]');
    const nativeToolbar = document.querySelector('.list_array_option');
    window.__dcufListHostAdapter.refresh({listWrap: owner, toolbar: nativeToolbar});
}

async function checkRecovery(page) {
    const before = await page.locator(shell).evaluate(node => ({id: node.id, anchor: node.style.getPropertyValue('--dcuf-category-anchor')}));
    await page.evaluate(() => {
        const original = document.querySelector('.list_array_option');
        const copy = original.cloneNode(true);
        const copiedInvoker = copy.querySelector('[data-dcuf-category-invoker]');
        copiedInvoker.after(copiedInvoker.cloneNode(true));
        original.replaceWith(copy);
        window.__categoryCloneOriginals = [...copy.querySelector('.center_box > .inner').querySelectorAll('*')].map(node => ({node, parent: node.parentNode}));
    });
    await page.evaluate(refreshCategoryToolbar);
    await page.waitForFunction(() => document.querySelectorAll('.list_array_option [data-dcuf-category-invoker]').length === 1);
    const recovery = await page.locator(shell).evaluate(node => ({id: node.id, anchor: node.style.getPropertyValue('--dcuf-category-anchor'), popover: node.getAttribute('popover')}));
    assert.notEqual(recovery.id, before.id, 'A copied injected id is recovered before the replacement gets its own target');
    assert.notEqual(recovery.anchor, before.anchor, 'A replacement gets its own CSS anchor');
    assert.equal(recovery.popover, 'auto');
    assert.ok(await page.evaluate(() => __categoryCloneOriginals.every(({node, parent}) => node.parentNode === parent)), 'Clone recovery retains every native descendant parent');
    await openPicker(page);
    await page.keyboard.press('Escape');
    await waitClosed(page);

    const independent = await page.evaluate(() => {
        const owner = document.createElement('section');
        const copy = document.querySelector('.list_array_option').cloneNode(true);
        owner.append(copy);
        document.body.append(owner);
        const nativeShell = copy.querySelector('.center_box > .inner');
        window.__dcufListHostAdapter.refresh({listWrap: owner, toolbar: copy});
        const button = copy.querySelector('[data-dcuf-category-invoker]');
        const result = {
            id: nativeShell.id,
            anchor: nativeShell.style.getPropertyValue('--dcuf-category-anchor'),
            buttonAnchor: button.style.anchorName,
            target: button.getAttribute('popovertarget'),
        };
        window.__dcufListHostAdapter.dispose(owner);
        result.restored = !nativeShell.hasAttribute('popover') && !nativeShell.hasAttribute('id')
            && !nativeShell.style.getPropertyValue('--dcuf-category-anchor')
            && !nativeShell.hasAttribute('data-dcuf-category-baseline') && !copy.querySelector('[data-dcuf-category-invoker]');
        owner.remove();
        return result;
    });
    assert.notEqual(independent.id, recovery.id, 'Simultaneous toolbars have distinct native popover targets');
    assert.notEqual(independent.anchor, recovery.anchor, 'Simultaneous toolbars do not share an anchor name');
    assert.equal(independent.buttonAnchor, independent.anchor);
    assert.equal(independent.target, independent.id);
    assert.ok(independent.restored, 'Disposal restores the recovered native baseline and removes the owned invoker');

    const fallback = await page.evaluate(() => {
        const owner = document.createElement('section');
        owner.innerHTML = '<div class="list_array_option"><div class="center_box"><div class="inner"><ul><li><a href="#fallback">원래 말머리</a></li></ul></div></div></div>';
        document.body.append(owner);
        const nativeToolbar = owner.querySelector('.list_array_option');
        const nativeShell = nativeToolbar.querySelector('.inner');
        const nativeList = nativeShell.firstElementChild;
        nativeShell.showPopover = undefined;
        window.__dcufListHostAdapter.refresh({listWrap: owner, toolbar: nativeToolbar});
        const result = !nativeShell.hasAttribute('popover') && !owner.querySelector('[data-dcuf-category-invoker]')
            && nativeList.parentNode === nativeShell && nativeList.getClientRects().length > 0;
        window.__dcufListHostAdapter.dispose(owner);
        owner.remove();
        return result;
    });
    assert.ok(fallback, 'Without native Popover support the original inline category controls stay intact');
    return {recovery, independent, fallback};
}

export async function runCategoryPickerContract({browser, server}) {
    const records = [];
    for (const state of [{width: 1536, height: 1024}, {width: 980, height: 900, dark: true}, {width: 390, height: 700}, {width: 390, height: 700, dark: true}]) {
        const e = await createTestPage(browser, server.baseUrl, {
            viewport: {width: state.width, height: state.height},
            storage: {[storageKeys.threshold]: 0, [storageKeys.palette]: 'teal'},
        });
        const page = e.page;
        try {
            await mountB1NativeFixture(e, server.baseUrl, {dark: state.dark});
            await page.evaluate(installLiveControlFixture);
            await page.evaluate(installCategoryReceipts);
            await page.waitForSelector(invoker);
            const button = page.locator(invoker).first();
            assert.equal(await button.innerText(), '일반', 'Compact invoker exposes the selected native label');
            assert.equal(await button.getAttribute('aria-label'), '말머리 선택: 일반');
            assert.equal(await page.locator(shell).evaluate(node => node.parentElement.dataset.dcufRole), 'toolbar-categories');
            assert.equal(await page.locator(shell).evaluate(node => node.previousElementSibling?.dataset.dcufRole), 'category-invoker');
            assert.equal(await page.locator(shell).evaluate(node => node.getClientRects().length), 0, 'Closed original shell does not occupy the toolbar');
            assert.ok(await hit(button), 'Compact category label is a positive, reachable target');
            await page.evaluate(() => document.querySelectorAll('.list_array_option .center_box a.on').forEach(node => node.classList.remove('on')));
            await page.evaluate(refreshCategoryToolbar);
            assert.equal(await button.innerText(), '말머리 전체', 'Unselected native categories have a useful default caption');

            const picker = await openPicker(page);
            const geometry = await picker.evaluate(node => ({box: node.getBoundingClientRect().toJSON(), viewport: {width: innerWidth, height: innerHeight}}));
            assert.ok(geometry.box.width > 0 && geometry.box.height > 0, 'Original category shell opens with positive area');
            assert.ok(geometry.box.left >= -1 && geometry.box.right <= geometry.viewport.width + 1
                && geometry.box.top >= -1 && geometry.box.bottom <= geometry.viewport.height + 1, 'Picker stays within the viewport: ' + JSON.stringify(geometry));
            assert.ok(await hit(picker.locator(':scope > ul a').first()), 'Original inline category remains reachable inside the picker');
            const arrow = picker.locator('[data-dcuf-role="category-toggle"]');
            const popup = picker.locator('[data-dcuf-role="category-popup"]');
            assert.equal(await popup.evaluate(node => node.style.display), 'none');
            assert.ok(await hit(arrow), 'Original overflow button is reachable inside the picker');
            await arrow.click();
            assert.equal(await popup.evaluate(node => node.style.display), 'block', 'Original overflow callback still owns its display');
            assert.ok(await picker.evaluate(node => node.matches(':popover-open')), 'Overflow expansion remains within the category picker');
            assert.ok(await hit(popup.locator('a').last()), 'Last overflow destination is reachable');
            const nested = await popup.evaluate(node => {
                const outer = node.closest('[data-dcuf-role="category-shell"]').getBoundingClientRect();
                const inner = node.getBoundingClientRect();
                return inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
            });
            assert.ok(nested, 'Native overflow panel stays horizontally within the category shell');
            assert.ok(await picker.evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight), 'Expanded overflow remains vertically contained');
            await arrow.click();
            assert.equal(await popup.evaluate(node => node.style.display), 'none');
            await page.keyboard.press('Escape');
            await waitClosed(page);
            assert.ok(await button.evaluate(node => document.activeElement === node), 'Escape returns focus to the invoker: '+JSON.stringify(await button.evaluate(n=>({width:innerWidth,y:scrollY,hidden:n.hidden,mode:n.closest('[data-dcuf-scroll]')?.getAttribute('data-dcuf-scroll'),focus:document.activeElement?.outerHTML.slice(0,160)}))));

            await openPicker(page);
            await page.mouse.click(2, 2);
            await waitClosed(page);
            const destinations = await page.locator(`${shell} a`).count();
            for (let index = 0; index < destinations; index++) {
                await openPicker(page);
                const action = picker.locator('a').nth(index);
                if (await action.evaluate(node => !!node.closest('.subject_morelist') && getComputedStyle(node.closest('.subject_morelist')).display === 'none')) await arrow.click();
                assert.ok(await hit(action), `Native category destination ${index} has a hit target`);
                await action.click();
                await waitClosed(page);
                assert.ok(await button.evaluate(node => document.activeElement === node), 'Selecting the focused native action returns focus to the invoker');
                assert.equal(await button.innerText(), await action.innerText(), 'Caption follows the native selected label after its callback');
            }
            const semantic = await page.evaluate(() => ({
                originals: __categoryPickerOriginals.every(({node, parent, onclick, href}) => node.isConnected && node.parentNode === parent && node.onclick === onclick && node.getAttribute('href') === href),
                calls: __categoryPickerCalls,
                overflowCalls: __liveNative.categoryClicks,
                nativeDisplay: document.querySelector('.subject_morelist').style.display,
            }));
            assert.ok(semantic.originals, 'Every original native node, parent, callback and destination survives adaptation');
            assert.deepEqual(semantic.calls.map(call => call.index), Array.from({length: destinations}, (_, index) => index));
            assert.ok(semantic.calls.every(call => call.openDuringCallback), 'Native callbacks execute before picker dismissal');
            assert.equal(semantic.overflowCalls, 8);
            assert.equal(semantic.nativeDisplay, 'block', 'Closing the picker does not rewrite native overflow display state');

            await page.evaluate(() => { window.__categoryPickerFocusTarget = document.querySelector('.array_tab button'); });
            await openPicker(page);
            await picker.locator(':scope > ul a').first().click();
            await waitClosed(page);
            assert.ok(await page.evaluate(() => document.activeElement === __categoryPickerFocusTarget), 'A callback that moves focus keeps its chosen target');
            await page.evaluate(() => { window.__categoryPickerFocusTarget = null; });
            await openPicker(page);
            await page.evaluate(() => scrollTo(0, 600));
            await settle(page);
            assert.ok(await page.locator(toolbar).first().evaluate(node => node.hasAttribute('data-dcuf-popup-open') && node.dataset.dcufScroll !== 'hidden'), 'Open category shell participates in the existing toolbar popup hold');
            await page.keyboard.press('Escape');
            await waitClosed(page);
            await page.waitForFunction(selector=>document.querySelector(selector)?.hidden===true,invoker);
            assert.equal(await popup.isVisible(),false,'A previously expanded page-top submenu cannot appear spontaneously in the floating strip');
            await arrow.click();assert.ok(await popup.isVisible(),'Floating overflow still opens through one original native click');
            if(await popup.isVisible()){await arrow.click();await settle(page);}
            await picker.locator(':scope > ul a').first().focus();
            await page.evaluate(() => scrollTo(0, 0));
            await settle(page);
            assert.ok(await button.evaluate(node=>document.activeElement===node&&!node.hidden),'Returning to page top moves focus from the inline category into its visible invoker');
            const recovery = state.width === 980 ? await checkRecovery(page) : null;
            assertNoRuntimeErrors(await getMetrics(page), e.consoleErrors);
            records.push({state, destinations, geometry, semantic, recovery});
        } finally {
            await e.close();
        }
    }
    return records;
}
