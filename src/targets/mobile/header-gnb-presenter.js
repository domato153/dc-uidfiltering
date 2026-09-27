    const __dcufHeaderGnbPresenter = (() => {
        const style = Object.freeze({
            key: 'header-gnb',
            id: 'dcuf-header-gnb-style',
            css: `
        [data-dcuf-header-gnb-role="root"] { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; box-sizing: border-box !important; background: #3b4890 !important; }
        [data-dcuf-header-gnb-role="root"] nav[data-dcuf-header-gnb-role="nav"] { width: auto !important; min-width: 0 !important; padding: 0 15px !important; display: flex !important; justify-content: center !important; }
        [data-dcuf-header-gnb-role="root"] [data-dcuf-header-gnb-role="list"] { display: flex; flex-wrap: wrap; justify-content: space-around; width: 100% !important; }
`
        });
        return Object.freeze({ style });
    })();
    __dcufRoot.__dcufHeaderGnbPresenter = __dcufHeaderGnbPresenter;
