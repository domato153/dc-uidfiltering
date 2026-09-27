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
        return Object.freeze({ style });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
