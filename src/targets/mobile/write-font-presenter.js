    const __dcufWriteFontPresenter = (() => {
        const STYLE_ID = 'dcuf-write-font-presenter';
        const ROOT_CLASS = 'dcuf-write-font-menu';
        const FONT_NAMES = Object.freeze([
            '맑은 고딕', '굴림체', '굴림', '바탕체', '바탕', '궁서',
            'helvetica', 'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
            'Impact', 'Tahoma', 'Times New Roman', 'Verdana', 'MS Gothic',
            'MS PGothic', 'MS UI Gothic',
        ]);
        const mounted = new Map();
        let styleElement = null;
        let ownsStyle = false;

        const ensureStyle = (ownerDocument) => {
            if (!ownerDocument?.head) return null;
            if (styleElement?.isConnected) return styleElement;
            const existing = ownerDocument.getElementById(STYLE_ID);
            if (existing) {
                styleElement = existing;
                ownsStyle = false;
                return existing;
            }
            const style = ownerDocument.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                [data-dcuf-surface="write-font-menu"][data-dcuf-role="host-font-menu"] > [data-dcuf-role="native-font-option"] {
                    display: none !important;
                }
                .${ROOT_CLASS} {
                    display: contents;
                }
            `;
            ownerDocument.head.appendChild(style);
            styleElement = style;
            ownsStyle = true;
            return style;
        };

        const updateSelection = (root, selectedValue) => {
            root?.querySelectorAll?.('[data-dcuf-font-value]').forEach((item) => {
                item.classList.toggle('checked', item.getAttribute('data-dcuf-font-value') === selectedValue);
            });
        };

        const createItem = (ownerDocument, fontName) => {
            const item = ownerDocument.createElement('a');
            item.className = 'note-dropdown-item dcuf-write-font-item';
            item.href = '#';
            item.setAttribute('data-value', fontName);
            item.setAttribute('data-dcuf-font-value', fontName);
            item.setAttribute('role', 'listitem');
            item.setAttribute('aria-label', fontName);
            const check = ownerDocument.createElement('i');
            check.className = 'note-icon-menu-check';
            const text = ownerDocument.createElement('span');
            text.textContent = fontName;
            text.style.fontFamily = fontName;
            item.append(check, ownerDocument.createTextNode(' '), text);
            return item;
        };

        const mount = (menu, { selectedValue = '', onIntent = null } = {}) => {
            const ownerDocument = menu?.ownerDocument;
            if (!ownerDocument || typeof menu.appendChild !== 'function') return null;
            ensureStyle(ownerDocument);
            const previous = mounted.get(menu);
            menu.querySelectorAll?.(`:scope > .${ROOT_CLASS}`).forEach((candidate) => {
                if (candidate !== previous?.root) candidate.remove();
            });
            if (previous?.root?.isConnected) {
                previous.onIntent = typeof onIntent === 'function' ? onIntent : null;
                updateSelection(previous.root, selectedValue);
                return previous.root;
            }

            const root = ownerDocument.createElement('div');
            root.className = ROOT_CLASS;
            root.setAttribute('data-dcuf-owned-root', 'write-font-menu');
            root.setAttribute('data-dcuf-surface', 'write-font-menu');
            root.setAttribute('data-dcuf-role', 'font-options');
            FONT_NAMES.forEach((fontName) => root.appendChild(createItem(ownerDocument, fontName)));
            const state = { root, onIntent: typeof onIntent === 'function' ? onIntent : null };
            const handleMouseDown = (event) => {
                if (event.target?.closest?.('[data-dcuf-font-value]')) event.preventDefault();
            };
            const handleClick = (event) => {
                const item = event.target?.closest?.('[data-dcuf-font-value]');
                if (!item || !root.contains(item)) return;
                event.preventDefault();
                event.stopPropagation();
                const value = item.getAttribute('data-dcuf-font-value') || '';
                if (!value) return;
                updateSelection(root, value);
                state.onIntent?.(Object.freeze({ type: 'select-font', value }));
            };
            root.addEventListener('mousedown', handleMouseDown);
            root.addEventListener('click', handleClick);
            state.dispose = () => {
                root.removeEventListener('mousedown', handleMouseDown);
                root.removeEventListener('click', handleClick);
                root.remove();
            };
            updateSelection(root, selectedValue);
            menu.appendChild(root);
            mounted.set(menu, state);
            return root;
        };

        const dispose = (menu = null) => {
            const targets = menu ? [[menu, mounted.get(menu)]] : Array.from(mounted.entries());
            targets.forEach(([target, state]) => {
                state?.dispose?.();
                mounted.delete(target);
            });
            if (mounted.size === 0 && ownsStyle && styleElement?.isConnected) styleElement.remove();
            if (mounted.size === 0) {
                styleElement = null;
                ownsStyle = false;
            }
        };

        const snapshotResources = () => Object.freeze({
            roots: Array.from(mounted.values()).filter((state) => state.root?.isConnected).length,
            listeners: Array.from(mounted.values()).filter((state) => state.root?.isConnected).length * 2,
            styleOwners: styleElement?.isConnected ? 1 : 0,
        });

        return Object.freeze({
            STYLE_ID,
            ROOT_CLASS,
            FONT_NAMES,
            mount,
            dispose,
            updateSelection,
            snapshotResources,
        });
    })();
    __dcufRoot.__dcufWriteFontPresenter = __dcufWriteFontPresenter;
