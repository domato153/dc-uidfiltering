    const __dcufUiRuntime = DCUF_UI_CONTRACTS.createUiPortRuntime({
        palette: Object.freeze({ value: 'blue', status: 'idle' }),
        filterSettings: null,
        personalBlock: null,
        surfaces: Object.freeze({}),
    });
    const __dcufUiPort = __dcufUiRuntime.port;
    const __dcufUiApplication = __dcufUiRuntime.control;
    const __dcufPaletteStorageKey = 'dcuf_mobile_ui_palette';
    const __dcufValidUiString = (value) => typeof value === 'string' && value.trim().length > 0;
    let __dcufPaletteWriteRevision = 0;

    __dcufUiApplication.registerIntentHandler(DCUF_UI_CONTRACTS.UI_INTENT_TYPES.PALETTE_LOAD, async (intent, context) => {
        const revisionAtStart = __dcufPaletteWriteRevision;
        const value = await GM_getValue(__dcufPaletteStorageKey, intent.defaultValue || 'blue');
        if (__dcufPaletteWriteRevision !== revisionAtStart) {
            return { ok: true, code: 'palette-load-superseded' };
        }
        context.commit({ palette: { value, status: 'ready' } }, 'palette-load');
        return { ok: true, code: 'palette-loaded' };
    });
    __dcufUiApplication.registerIntentHandler(DCUF_UI_CONTRACTS.UI_INTENT_TYPES.PALETTE_COMMIT, async (intent, context) => {
        if (!__dcufValidUiString(intent.value)) return { ok: false, code: 'invalid-palette' };
        await GM_setValue(__dcufPaletteStorageKey, intent.value);
        __dcufPaletteWriteRevision += 1;
        context.commit({ palette: { value: intent.value, status: 'ready' } }, 'palette-commit');
        return { ok: true, code: 'palette-committed' };
    });
    __dcufUiApplication.registerIntentHandler(DCUF_UI_CONTRACTS.UI_INTENT_TYPES.SURFACE_OPEN, async (intent, context) => {
        if (!__dcufValidUiString(intent.surface)) return { ok: false, code: 'invalid-surface' };
        const surfaces = { ...(context.getSnapshot().surfaces || {}), [intent.surface]: true };
        context.commit({ surfaces }, `surface-open:${intent.surface}`);
        return { ok: true, code: 'surface-opened' };
    });
    __dcufUiApplication.registerIntentHandler(DCUF_UI_CONTRACTS.UI_INTENT_TYPES.SURFACE_CLOSE, async (intent, context) => {
        if (!__dcufValidUiString(intent.surface)) return { ok: false, code: 'invalid-surface' };
        const surfaces = { ...(context.getSnapshot().surfaces || {}), [intent.surface]: false };
        context.commit({ surfaces }, `surface-close:${intent.surface}`);
        return { ok: true, code: 'surface-closed' };
    });

    window.__dcufUiPort = __dcufUiPort;
    if (__dcufRoot.__DCUF_TESTBED_CONFIG__) {
        window.__dcufUiPortDebug = Object.freeze({
            listenerCount: () => __dcufUiApplication.listenerCount,
            handlerCount: () => __dcufUiApplication.handlerCount,
            createDisposableScope: DCUF_UI_CONTRACTS.createDisposableScope,
            createUiSurface: DCUF_UI_CONTRACTS.createUiSurface,
        });
    }
