import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../src/targets/mobile/convenience-host-adapter.js', import.meta.url), 'utf8');
const articleUrl = 'https://gall.dcinside.com/board/view/?id=test&no=1';

// Acquisition scheduling needs only an inert parser boundary. Browser contracts
// separately exercise the actual HTML parser, source selection and sanitization.
function acquisition(fetchPreviewHtml) {
    const frames = [7, 8].map(no => ({
        getAttribute: () => `/board/movie/movie_view?no=${no}`,
        replaceWith(node) { this.replacement = node; },
    }));
    class Element {}
    const root = new Element();
    root.querySelectorAll = () => frames;
    const document = {
        querySelector: () => root,
        createElement: () => ({ href: '', textContent: '' }),
        documentElement: { get outerHTML() { return frames.map(frame => frame.replacement?.textContent || 'unresolved').join('|'); } },
    };
    const timers = new Map();
    const context = vm.createContext({
        Element, URL, URLSearchParams, AbortController, DOMException,
        DOMParser: class { parseFromString(html) { return html === 'article' ? document : { querySelector: () => null }; } },
        __dcufCreateConveniencePresentation: () => ({}),
        DCUF_UI_CONTRACTS: { createHostSurfaceAdapter: value => value },
        MobileConvenienceModule: {},
        window: {
            setTimeout(fn, delay) { const id = {}; timers.set(id, { fn, delay }); return id; },
            clearTimeout(id) { timers.delete(id); },
        },
    });
    vm.runInContext(`${source}\nglobalThis.adapter = __dcufConvenienceHostAdapter;`, context);
    return {
        timers,
        run: signal => context.adapter.invokeNative('resolvePreviewMovies', { fetchPreviewHtml }, 'article', articleUrl, { signal }),
    };
}

test('native player acquisition never has two requests in flight', async () => {
    let active = 0, peak = 0, requests = 0;
    const subject = acquisition(async () => {
        active += 1; requests += 1; peak = Math.max(peak, active);
        await new Promise(resolve => setImmediate(resolve));
        active -= 1;
        return 'empty player';
    });
    await subject.run();
    assert.equal(requests, 2);
    assert.equal(peak, 1);
    assert.equal(subject.timers.size, 0);
});

test('one total resolution deadline aborts the hung player and falls back without fetching remaining frames', async () => {
    let requests = 0;
    const subject = acquisition(async (_url, { signal }) => {
        requests += 1;
        return new Promise((resolve, reject) => {
            const deadline = [...subject.timers.values()][0];
            if (!deadline) { reject(new Error('No resolution deadline')); return; }
            assert.equal(deadline.delay, 4000);
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            queueMicrotask(deadline.fn);
        });
    });
    const result = await subject.run();
    assert.equal(requests, 1);
    assert.equal(result, '미디어는 원문에서 보기|미디어는 원문에서 보기');
    assert.equal(subject.timers.size, 0);
});

test('caller abort propagates AbortError and stops acquisition before the next frame', async () => {
    const caller = new AbortController();
    let requests = 0;
    const subject = acquisition(async (_url, { signal }) => {
        requests += 1;
        return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            queueMicrotask(() => caller.abort());
        });
    });
    await assert.rejects(subject.run(caller.signal), { name: 'AbortError' });
    assert.equal(requests, 1);
    assert.equal(subject.timers.size, 0);
    assert.equal(getEventListeners(caller.signal, 'abort').length, 0);
});

test('a previously aborted preview starts no player request and leaves no deadline or listener', async () => {
    const caller = new AbortController(); caller.abort();
    let requests = 0;
    const subject = acquisition(async () => { requests += 1; return 'empty player'; });
    await assert.rejects(subject.run(caller.signal), { name: 'AbortError' });
    assert.equal(requests, 0);
    assert.equal(subject.timers.size, 0);
    assert.equal(getEventListeners(caller.signal, 'abort').length, 0);
});
