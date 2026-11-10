import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../src/targets/mobile/convenience-module.js', import.meta.url), 'utf8');
const load = (overrides = {}) => {
    const context = vm.createContext({ ...overrides });
    vm.runInContext(`${source}\nglobalThis.subject = MobileConvenienceModule;`, context, {
        filename: fileURLToPath(new URL('../src/targets/mobile/convenience-module.js', import.meta.url)),
    });
    return context.subject;
};

test('missing convenience setting enables previews without rewriting explicit saved false', async () => {
    for (const [stored, expected] of [[undefined, true], [{}, true], [{ recentHighlight: false }, true], [{ postPreview: false }, false], [{ postPreview: true }, true]]) {
        let writes = 0;
        const subject = load({ GM_getValue: async (_key, fallback) => stored ?? fallback, GM_setValue: async () => { writes += 1; } });
        await subject.loadSettings();
        assert.equal(subject.isEnabled('postPreview'), expected, JSON.stringify({ stored }));
        assert.equal(writes, 0, 'Reading defaults must not overwrite saved settings');
    }
});

test('native movie acquisition forwards article referrer while retaining same-origin credentials and abort', async () => {
    const signal = new AbortController().signal;
    let observed;
    const subject = load({ fetch: async (url, options) => { observed = { url, options }; return { ok: true, text: async () => '<video></video>' }; } });
    const result = await subject.fetchPreviewHtml('https://gall.dcinside.com/board/movie/movie_view?no=7', {
        signal, referrer: 'https://gall.dcinside.com/board/view/?id=test&no=1',
    });
    assert.equal(result, '<video></video>');
    assert.equal(observed.options.credentials, 'same-origin');
    assert.equal(observed.options.signal, signal);
    assert.equal(observed.options.referrer, 'https://gall.dcinside.com/board/view/?id=test&no=1');
    assert.equal(observed.options.referrerPolicy, 'same-origin');
});
