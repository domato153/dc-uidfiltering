    // Hoisted because theme composition precedes this presenter object. These
    // inherited host selectors stay unchanged in this zero-delta owner move.
    function __dcufBuildGalleryPageHeadThemeCss(ROOT_ATTRIBUTE) {
        return `
        html[${ROOT_ATTRIBUTE}] body .page_head {
            border-color: var(--dcuf-theme-border-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.gall_search, .gall_search_box, .inner_search) :is(.btn_search, .bnt_search, button[type="submit"]),
        html[${ROOT_ATTRIBUTE}] body .page_head > .fl form :is(.btn_search, .bnt_search, button[type="submit"]) {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(h2, h2 a, .gall_tit, .gall_tit a, .gallery_title, .gallery_title a) {
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.icon_mini, .mini_icon, .gallery_badge) {
            border-color: var(--dcuf-theme-accent) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img,
        html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img {
            display: inline-flex !important;
            width: 26px !important;
            height: 20px !important;
            margin-left: 5px !important;
            align-items: center !important;
            justify-content: center !important;
            border: 2px solid var(--dcuf-theme-accent) !important;
            border-radius: 2px !important;
            background: none !important;
            background-image: none !important;
            background-position: 0 0 !important;
            text-indent: 0 !important;
            overflow: hidden !important;
            color: var(--dcuf-theme-accent) !important;
            font-size: 0 !important;
            line-height: 1 !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img::before {
            content: "m" !important;
            font: 900 12px/1 Arial, sans-serif !important;
            text-transform: lowercase !important;
        }
        html[${ROOT_ATTRIBUTE}] body[data-fixture-variant="mini"] .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body:has(#top.miniwrap) .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .miniwrap .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon.ngall.sp_img::before {
            content: "mi" !important;
            font-size: 10px !important;
        }
`;
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = Object.freeze({
            key: 'gallery-page-head',
            id: 'dcuf-gallery-page-head-style',
            css: `
        [data-dcuf-gallery-page-head-role="root"] {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 15px !important;
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: 50px;
            flex-wrap: wrap;
            gap: 10px;
        }
        [data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="left"], [data-dcuf-gallery-page-head-role="both"]) { float: none !important; }
        [data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="right"], [data-dcuf-gallery-page-head-role="both"]) {
            float: none !important;
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        [data-dcuf-gallery-page-head-role="root"]::after { content: ""; display: table; clear: both; }
`
        });
        return Object.freeze({ style, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
