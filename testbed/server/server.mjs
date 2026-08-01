import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankPage, listPage, viewPage } from '../fixtures/pages.mjs';
import { deletePasswordPage, modifyPasswordPage, nativeWritePage, writePage } from '../fixtures/write-pages.mjs';
import {
    hostDeleteConfirmPage,
    hostPasswordPage,
    hostPumxPage,
    hostRecommendationPage
} from '../fixtures/host-compatibility.mjs';
import { loadHarnessSource } from '../harness/userscript-loader.mjs';

const testbedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(testbedDir, 'public');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readBody = async (request) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
};
const send = (response, status, body, type = 'text/plain; charset=utf-8', headers = {}) => {
    response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers });
    response.end(body);
};

export async function startServer({ port = 0 } = {}) {
    let manualHarnessSource = null;
    const withManualHarness = async (html, url) => {
        if (url.searchParams.get('harness') !== '1') return html;
        manualHarnessSource ||= await loadHarnessSource({
            storage: {
                dcinside_threshold: 0,
                dcinside_ratio_filter_enabled: false,
                dcinside_personal_block_enabled: true,
                dcinside_personal_block_list: { uids: [], nicknames: [], ips: [] }
            }
        });
        return html.replace('</head>', `<script>${manualHarnessSource.replaceAll('</script>', '<\\/script>')}</script></head>`);
    };
    const state = {
        apiMode: 'normal',
        apiDelayMs: 0,
        uidRequests: [],
        writeSubmissions: [],
        requests: []
    };
    const server = http.createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://127.0.0.1');
            state.requests.push({ method: request.method, pathname: url.pathname, ts: Date.now() });

            if (url.pathname === '/__testbed/reset' && request.method === 'POST') {
                state.apiMode = 'normal';
                state.apiDelayMs = 0;
                state.uidRequests.length = 0;
                state.writeSubmissions.length = 0;
                send(response, 204, '');
                return;
            }
            if (url.pathname === '/__testbed/api-mode' && request.method === 'POST') {
                const data = JSON.parse((await readBody(request)) || '{}');
                state.apiMode = ['normal', 'delay', 'fail'].includes(data.mode) ? data.mode : 'normal';
                state.apiDelayMs = Math.max(0, Number(data.delayMs) || 0);
                send(response, 200, JSON.stringify({ mode: state.apiMode, delayMs: state.apiDelayMs }), 'application/json');
                return;
            }
            if (url.pathname === '/__testbed/metrics') {
                send(response, 200, JSON.stringify(state), 'application/json');
                return;
            }
            if (url.pathname === '/api/gallog_user_layer/gallog_content_reple/' && request.method === 'POST') {
                const body = await readBody(request);
                const params = new URLSearchParams(body);
                const uid = params.get('user_id') || '';
                state.uidRequests.push({ uid, body, mode: state.apiMode, ts: Date.now() });
                if (state.apiDelayMs > 0 || state.apiMode === 'delay') await sleep(state.apiDelayMs || 1200);
                if (state.apiMode === 'fail' || uid.startsWith('fail-')) {
                    send(response, 503, 'fixture failure');
                    return;
                }
                const blocked = uid.includes('blocked');
                send(response, 200, blocked ? '1,1' : '120,80');
                return;
            }
            if (url.pathname === '/__testbed/write-submit' && request.method === 'POST') {
                const body = await readBody(request);
                const values = Object.fromEntries(new URLSearchParams(body));
                state.writeSubmissions.push({ values, ts: Date.now() });
                send(response, 200, JSON.stringify({ ok: true, count: state.writeSubmissions.length }), 'application/json');
                return;
            }
            if (url.pathname === '/__testbed/fixture.css') {
                send(response, 200, await readFile(path.join(publicDir, 'fixture.css')), 'text/css; charset=utf-8');
                return;
            }
            if (url.pathname === '/__testbed/fixture-client.js') {
                send(response, 200, await readFile(path.join(publicDir, 'fixture-client.js')), 'text/javascript; charset=utf-8');
                return;
            }
            if (url.pathname === '/__testbed/ad-frame.html') {
                send(response, 200, await readFile(path.join(publicDir, 'ad-frame.html')), 'text/html; charset=utf-8');
                return;
            }

            const headers = { 'set-cookie': 'ci_t=dcuf-testbed-cookie; Path=/; SameSite=Lax' };
            const variant = url.pathname.startsWith('/mini/') ? 'mini' : (url.pathname.startsWith('/mgallery/') ? 'minor' : 'major');
            if (url.pathname === '/__testbed/native-write') {
                send(response, 200, nativeWritePage(), 'text/html; charset=utf-8', headers);
                return;
            }
            if (url.pathname.includes('/board/delete')) {
                if (url.searchParams.get('host-compat') === 'delete-confirm') {
                    send(response, 200, hostDeleteConfirmPage({ variant }), 'text/html; charset=utf-8', headers);
                    return;
                }
                if (url.searchParams.get('host-compat') === 'password') {
                    send(response, 200, hostPasswordPage({ kind: 'delete', variant }), 'text/html; charset=utf-8', headers);
                    return;
                }
                send(response, 200, deletePasswordPage(), 'text/html; charset=utf-8', headers);
                return;
            }
            if (url.pathname.includes('/board/modify')) {
                if (url.searchParams.get('host-compat') === 'password') {
                    send(response, 200, hostPasswordPage({ kind: 'modify', variant }), 'text/html; charset=utf-8', headers);
                    return;
                }
                const page = url.searchParams.get('stage') === 'editor'
                    ? writePage({ variant, formMode: 'modify' })
                    : modifyPasswordPage();
                send(response, 200, await withManualHarness(page, url), 'text/html; charset=utf-8', headers);
                return;
            }
            if (url.pathname.includes('/board/write')) {
                if (url.searchParams.get('host-compat') === 'pumx') {
                    send(response, 200, hostPumxPage({
                        variant,
                        buttonDelayMs: Number(url.searchParams.get('button-delay')) || 0,
                        handlerDelayMs: Number(url.searchParams.get('handler-delay')) || 0,
                        alreadyActive: url.searchParams.get('active') === '1',
                        omitButton: url.searchParams.get('omit-button') === '1'
                    }), 'text/html; charset=utf-8', headers);
                    return;
                }
                send(response, 200, await withManualHarness(writePage({ variant, showGuide: url.searchParams.get('guide') === '1' }), url), 'text/html; charset=utf-8', headers);
                return;
            }
            if (url.pathname.includes('/board/lists')) {
                send(response, 200, await withManualHarness(listPage({ variant }), url), 'text/html; charset=utf-8', headers);
                return;
            }
            if (url.pathname.includes('/board/view')) {
                if (url.searchParams.get('host-compat') === 'recommend') {
                    send(response, 200, hostRecommendationPage({
                        variant,
                        captcha: url.searchParams.get('captcha') === '1'
                    }), 'text/html; charset=utf-8', headers);
                    return;
                }
                send(response, 200, await withManualHarness(viewPage({
                    variant,
                    long: url.searchParams.get('long') === '1',
                    massComments: Number(url.searchParams.get('comments')) || 0,
                    darkAtStart: url.searchParams.get('dark-start') === '1',
                    brokenTheme: url.searchParams.get('broken-theme') === '1'
                }), url), 'text/html; charset=utf-8', headers);
                return;
            }
            send(response, 200, blankPage(), 'text/html; charset=utf-8', headers);
        } catch (error) {
            send(response, 500, error?.stack || String(error));
        }
    });

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    return {
        baseUrl,
        state,
        reset() {
            state.apiMode = 'normal';
            state.apiDelayMs = 0;
            state.uidRequests.length = 0;
            state.writeSubmissions.length = 0;
        },
        close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    };
}
