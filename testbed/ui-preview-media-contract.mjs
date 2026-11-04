import assert from 'node:assert/strict';
import { createTestPage, storageKeys } from './harness/runner-utils.mjs';

const nativeInstruction = '갤러리 상단 [설정 > 동영상 설정]에서 자동 재생과 음소거 설정이 가능합니다.';
const tip = '<div id="tip_video" class="tip_box2 tip_video" style="display:none"><p>갤러리 상단 [설정 &gt; 동영상 설정]에서<br>자동 재생과 음소거 설정이 가능합니다.</p><button>닫기</button></div>';

// Public comic_new6/6935018, read 2026-11-04: native hidden tip is a sibling of
// .write_div; WebP uses viewimage.php, and native video uses a movie_view iframe.
// URLs, filenames, IDs and article sentences below are synthetic.
export async function runPreviewSanitizerContract({ browser, server }) {
    const e = await createTestPage(browser, server.baseUrl, { storage: { [storageKeys.threshold]: 0, [storageKeys.personalEnabled]: false } });
    try {
        await e.goto('/board/lists?id=test');
        const result = await e.page.evaluate(({ nativeInstruction, tip }) => {
            const runtime = window.__dcufMobileConvenienceModule;
            const sanitize = html => {
                const output = runtime.sanitizePreviewDocument(html, 'https://gall.dcinside.com/board/view/?id=test&no=1');
                return new DOMParser().parseFromString(output, 'text/html').body;
            };
            const body = sanitize(`<div class="gallview_contents"><div class="writing_view_box">${tip}<div class="write_div"><p>본문의 동영상 설정 안내 인용: ${nativeInstruction}</p><img class="webp-mp4" src="https://dcimg6.dcinside.co.kr/viewimage.php?id=test&amp;no=webp"><img src="/loading.gif" data-original="/animated.gif"><picture><source type="image/webp" srcset="/animated.webp 1x, /animated-large.webp 2x"><img src="/loading.gif"></picture><video autoplay loop muted data-src='/native-animation.webp' data-fileno='7'><source src='/native-animation.mp4' type='video/mp4' onerror='change_gif(this)'></video><video data-src='/not-a-video.webp' autoplay loop onplay="window.bad=1" poster="/poster.webp"><source src="/movie.mp4" type="video/mp4" onerror="window.bad=1"></video><audio src="/sound.ogg" autoplay></audio><video src="javascript:bad()"></video><script>window.bad=1</script><iframe src="https://evil.invalid/embed"></iframe></div><aside>본문 밖 보조 텍스트</aside></div></div>`);
            const fallback = sanitize(`<div class="writing_view_box">${tip}<p>본문 fallback</p></div>`);
            return {
                text: body.textContent.replace(/\s+/g, ' ').trim(),
                fallbackText: fallback.textContent.replace(/\s+/g, ' ').trim(),
                images: [...body.querySelectorAll('img')].map(n => ({ src: n.dataset.dcufPreviewSrc, policy: n.referrerPolicy })),
                media: [...body.querySelectorAll('video,audio')].map(n => ({ tag: n.tagName, src: n.getAttribute('src'), sources: [...n.querySelectorAll('source')].map(s => ({ src: s.src, type: s.type })), poster: n.getAttribute('poster'), autoplay: n.autoplay, controls: n.controls, muted: n.defaultMuted, inline: n.hasAttribute('playsinline') })),
                unsafe: body.querySelectorAll('iframe,script,[onplay],[onerror],[autoplay]').length,
            };
        }, { nativeInstruction, tip });
        assert.equal(result.text.includes('본문 밖 보조 텍스트'), false, 'Select the inner article before its shell');
        assert.equal(result.text.split(nativeInstruction).length - 1, 1, 'Exclude the native instruction node and retain the article quotation');
        assert.equal(result.fallbackText, '본문 fallback', 'Shell fallback removes only the semantic native tip');
        assert.deepEqual(result.images.map(n => n.src), [
            'https://dcimg6.dcinside.co.kr/viewimage.php?id=test&no=webp',
            'https://gall.dcinside.com/animated.gif',
            'https://gall.dcinside.com/animated.webp',
            'https://gall.dcinside.com/native-animation.webp',
        ]);
        assert.ok(result.images.every(n => n.policy === 'origin'), 'Image hosts receive the minimal gallery origin referrer');
        assert.equal(result.unsafe, 0);
        assert.equal(result.media.length, 2, 'Keep supported media and reject javascript media sources');
        assert.equal(result.media[0].src,null,'An image fallback must not override valid child video sources');
        assert.deepEqual(result.media[0].sources, [{ src: 'https://gall.dcinside.com/movie.mp4', type: 'video/mp4' }]);
        assert.equal(result.media[0].poster, 'https://gall.dcinside.com/poster.webp');
        assert.ok(result.media.every(n => n.controls && n.muted && !n.autoplay));
        assert.equal(result.media[0].inline, true);
        return result;
    } finally { await e.close(); }
}

export async function runPreviewNativeMovieContract({ browser, server }) {
    const e = await createTestPage(browser, server.baseUrl, {
        storage: { [storageKeys.threshold]: 0, [storageKeys.personalEnabled]: false, [storageKeys.convenience]: { recentHighlight: true, draftRecovery: true, postPreview: true } },
    });
    try {
        const articleUrl = `${server.baseUrl}/board/view/?id=test&no=preview-native`;
        const movieReferrers = [];
        await e.page.route('**/board/movie/movie_view?no=*', async route => {
            movieReferrers.push(route.request().headers().referer);
            if (route.request().url().endsWith('no=8')) return route.fulfill({ status: 500, body: '' });
            return route.fulfill({ contentType: 'text/html', body: '<script>parent.badMovie=1</script><video id="dc_mv" poster="/poster.webp" autoplay><source src="/media/native.mp4" type="video/mp4"></video>' });
        });
        await e.page.route(articleUrl, route => route.fulfill({ contentType: 'text/html', body: `<div class="writing_view_box">${tip}<div class="write_div"><p>영상 본문</p><iframe id="movieIcon7" src="/board/movie/movie_view?no=7"></iframe><iframe id="movieIcon8" src="/board/movie/movie_view?no=8"></iframe><iframe src="https://evil.invalid/embed"></iframe></div></div>` }));
        await e.page.route('**/media/native.mp4', route => route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));
        await e.page.route('**/poster.webp', route => route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64') }));
        await e.goto('/board/lists?id=test');
        await e.page.evaluate(url => window.__dcufMobileConvenienceModule.openPreview(url, '합성 영상', { mobile: false, x: 20, y: 20 }), articleUrl);
        const root = e.page.locator('#dcuf-post-preview');
        assert.equal(await root.locator('iframe,script').count(), 0, 'Native player scripts and arbitrary embeds never execute');
        assert.equal(await e.page.evaluate(() => window.badMovie), undefined);
        assert.equal(await root.locator('video').count(), 1, 'Native iframe resolves to a sanitized direct video');
        assert.equal(await root.locator('video source').getAttribute('src'), `${server.baseUrl}/media/native.mp4`);
        assert.ok(await root.locator('video').evaluate(n => n.controls && n.defaultMuted && n.muted && !n.autoplay && n.playsInline));
        assert.deepEqual(movieReferrers, [articleUrl, articleUrl]);
        assert.equal(await root.getByText('미디어는 원문에서 보기', { exact: true }).count(), 1, 'A failed native player keeps an original-article fallback');
        await e.page.evaluate(() => window.__dcufMobileConvenienceModule.closePreview());
        assert.equal(await root.count(), 0);
        return { movieReferrers };
    } finally { await e.close(); }
}
