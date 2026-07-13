(() => {
    const SECTION_SELECTOR = '.view_comment.image_comment, .img_comment:has(.comment_box.img_comment_box)';
    const BOX_SELECTOR = '.comment_box.img_comment_box';
    const ITEM_SELECTOR = '.comment_box.img_comment_box .cmt_list > li, .comment_box.img_comment_box .reply_list > li';
    const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const describe = (element) => element instanceof Element ? {
        tag: element.tagName.toLowerCase(),
        id: element.id || '',
        classes: Array.from(element.classList),
        childElements: element.children.length,
        display: getComputedStyle(element).display,
        attributes: Array.from(element.attributes).map((attribute) => attribute.name)
    } : null;
    const sanitizeSection = (section) => {
        if (!(section instanceof Element)) return null;
        const clone = section.cloneNode(true);
        clone.querySelectorAll('script, style, iframe').forEach((element) => element.remove());
        clone.querySelectorAll('*').forEach((element) => {
            ['data-uid', 'data-nick', 'data-ip', 'value'].forEach((name) => {
                if (element.hasAttribute(name)) element.setAttribute(name, `[redacted-${name}]`);
            });
            ['href', 'src', 'action'].forEach((name) => {
                if (element.hasAttribute(name)) element.setAttribute(name, `[redacted-${name}]`);
            });
        });
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach((node) => {
            if (normalizeText(node.nodeValue)) node.nodeValue = '[text]';
        });
        return clone.outerHTML;
    };
    const collect = () => {
        const section = document.querySelector(SECTION_SELECTOR);
        const box = section?.querySelector(BOX_SELECTOR) || document.querySelector(BOX_SELECTOR);
        const items = Array.from(document.querySelectorAll(ITEM_SELECTOR));
        return {
            probe: 'DCUF_IMAGE_COMMENT_PROBE_V1',
            capturedAt: new Date().toISOString(),
            page: { href: location.href, pathname: location.pathname, readyState: document.readyState },
            userscript: {
                uiReady: document.documentElement.classList.contains('script-ui-ready'),
                customPosts: document.querySelectorAll('.custom-post-item').length
            },
            counts: {
                sections: document.querySelectorAll(SECTION_SELECTOR).length,
                boxes: document.querySelectorAll(BOX_SELECTOR).length,
                items: items.length,
                replies: items.filter((item) => item.id.startsWith('reply_li_')).length,
                writers: box?.querySelectorAll('.gall_writer, .ub-writer').length || 0,
                writeForms: section?.querySelectorAll('.cmt_write_box').length || 0,
                deletePopups: section?.querySelectorAll('.cmt_delpw_box, [id$="_delpw_box"]').length || 0
            },
            section: describe(section),
            box: describe(box),
            items: items.slice(0, 10).map((item) => ({
                element: describe(item),
                idPattern: (item.id || '').replace(/\d+/g, '#'),
                hasWriter: Boolean(item.querySelector('.gall_writer, .ub-writer')),
                hasImage: Boolean(item.querySelector('img')),
                hasReplyInfo: Boolean(item.querySelector('.reply_info')),
                hasDeletePopup: Boolean(item.querySelector('.cmt_delpw_box, [id$="_delpw_box"]'))
            })),
            sanitizedSectionHtml: sanitizeSection(section)
        };
    };
    const download = () => {
        const report = collect();
        const variant = location.pathname.startsWith('/mgallery/') ? 'minor' : 'major';
        const filename = `${variant}-image-comment-probe.json`;
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { filename, counts: report.counts };
    };
    window.DCUFImageCommentProbe = { collect, download };
    console.log('DCUF 이미지댓글 수집기 준비 완료. 실행: DCUFImageCommentProbe.download()');
})();
