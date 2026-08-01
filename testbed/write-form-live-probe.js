(() => {
    const redactUrlAttrs = new Set(['href', 'src', 'action', 'formaction']);
    const privateAttrs = new Set(['value', 'data-uid', 'data-nick', 'data-ip']);
    const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
            x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height),
            display: style.display, visibility: style.visibility, position: style.position,
            overflowX: style.overflowX, overflowY: style.overflowY, fontSize: style.fontSize
        };
    };
    const describe = (element) => element instanceof Element ? {
        tag: element.tagName.toLowerCase(), id: element.getAttribute('id') || '', classes: Array.from(element.classList),
        name: element.getAttribute('name') || '', type: element.getAttribute('type') || '',
        placeholder: element.getAttribute('placeholder') || '', autocomplete: element.getAttribute('autocomplete') || '',
        inputmode: element.getAttribute('inputmode') || '', enterkeyhint: element.getAttribute('enterkeyhint') || '',
        readonly: element.hasAttribute('readonly'), disabled: element.hasAttribute('disabled'),
        attributes: Array.from(element.attributes).map((attribute) => attribute.name), rect: rect(element)
    } : null;
    const sanitize = (element) => {
        if (!(element instanceof Element)) return null;
        const clone = element.cloneNode(true);
        clone.querySelectorAll('script, style, iframe').forEach((node) => node.remove());
        [clone, ...clone.querySelectorAll('*')].forEach((node) => {
            Array.from(node.attributes).forEach((attribute) => {
                if (redactUrlAttrs.has(attribute.name)) node.setAttribute(attribute.name, `[redacted-${attribute.name}]`);
                if (privateAttrs.has(attribute.name)) node.setAttribute(attribute.name, `[redacted-${attribute.name}]`);
                if (/token|captcha|password|secret/i.test(attribute.name)) node.setAttribute(attribute.name, `[redacted-${attribute.name}]`);
            });
            if (node instanceof HTMLInputElement) node.setAttribute('value', '[redacted-value]');
            if (node instanceof HTMLTextAreaElement) node.textContent = '[redacted-editor-text]';
            if (node.hasAttribute('contenteditable')) node.textContent = '[redacted-editor-text]';
        });
        return clone.outerHTML.slice(0, 250000);
    };
    const scoreForm = (form) => {
        if (!(form instanceof HTMLFormElement)) return 0;
        return form.querySelectorAll('textarea, iframe, [contenteditable], input[type="text"], input[type="password"]').length
            + form.querySelectorAll('button, input[type="submit"]').length * 2;
    };
    const findWriteRoot = () => {
        const forms = Array.from(document.forms).sort((left, right) => scoreForm(right) - scoreForm(left));
        return forms[0]
            || document.querySelector('.write_wrap, .write_content, .editor_wrap, main, #container')
            || document.body;
    };
    const inspectFrame = (frame) => {
        const report = { element: describe(frame), sameOrigin: false, body: null, editableCount: 0, sanitizedBodyHtml: null };
        try {
            const doc = frame.contentDocument;
            if (!doc) return report;
            report.sameOrigin = true;
            report.body = describe(doc.body);
            report.editableCount = doc.querySelectorAll('[contenteditable="true"], textarea').length;
            report.sanitizedBodyHtml = sanitize(doc.body);
        } catch (error) {
            report.error = String(error?.message || error);
        }
        return report;
    };
    const collect = () => {
        const root = findWriteRoot();
        const controls = Array.from(root.querySelectorAll('input, textarea, select, button, [contenteditable], iframe'));
        const selectorCounts = Object.fromEntries([
            'form', 'input[type="text"]', 'input[type="password"]', 'input[name*="subject"]', 'input[name*="title"]',
            'textarea', '[contenteditable="true"]', 'iframe', '.write_subject', '.write_wrap', '.editor_wrap',
            '.tx-toolbar', '.cmt_write_box', '.captcha', '[class*="captcha"]', '[class*="editor"]', '[class*="toolbar"]'
        ].map((selector) => [selector, document.querySelectorAll(selector).length]));
        return {
            probe: 'DCUF_WRITE_FORM_PROBE_V1',
            capturedAt: new Date().toISOString(),
            page: {
                href: location.href, hostname: location.hostname, pathname: location.pathname, readyState: document.readyState,
                viewport: { innerWidth, innerHeight, devicePixelRatio },
                visualViewport: window.visualViewport ? {
                    width: visualViewport.width, height: visualViewport.height,
                    offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale
                } : null,
                horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
            },
            userscript: {
                uiReady: document.documentElement.classList.contains('script-ui-ready'),
                runtimeLoaded: Boolean(window.__dcufRuntimeLoaded)
            },
            root: describe(root),
            selectorCounts,
            controls: controls.slice(0, 160).map((control) => ({
                ...describe(control),
                label: normalizeText(control.labels?.[0]?.textContent || control.getAttribute('aria-label') || '').slice(0, 80),
                text: control.matches('button, [role="button"]') ? normalizeText(control.textContent).slice(0, 80) : ''
            })),
            frames: Array.from(root.querySelectorAll('iframe')).map(inspectFrame),
            sanitizedRootHtml: sanitize(root)
        };
    };
    const download = () => {
        const report = collect();
        const isNativeMobile = /^(m|mobile)\./i.test(location.hostname);
        const variant = location.pathname.startsWith('/mgallery/') ? 'minor' : 'major';
        const filename = isNativeMobile ? 'native-mobile-write-form-probe.json' : `${variant}-write-form-probe.json`;
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { filename, controls: report.controls.length, frames: report.frames.length, selectors: report.selectorCounts };
    };
    window.DCUFWriteFormProbe = { collect, download };
    console.log('DCUF 글쓰기 수집기 준비 완료. 실행: DCUFWriteFormProbe.download()');
})();
