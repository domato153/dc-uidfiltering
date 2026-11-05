import assert from 'node:assert/strict';

// Four declared layout changes only. Restore the exact old declaration text
// before historical CSS/artifact checks; never replace an immutable digest.
const changes={
    'header-gnb':[
        ['min-width: 0; height: auto; padding: 0 15px; display: flex !important;','min-width: 0; padding: 0 15px; display: flex !important;'],
        ['display: flex; flex-wrap: wrap; height: auto; justify-content: space-around; width: 100%;','display: flex; flex-wrap: wrap; justify-content: space-around; width: 100%;'],
    ],
    'gallery-page-head':[
        [/width: 100%;(\r?\n[ \t]*)height: auto;\r?\n[ \t]*min-height: 50px;/g,'width: 100%;$1min-height: 50px;'],
        [/margin-left: auto;(\r?\n[ \t]*)display: flex;\r?\n[ \t]*flex-wrap: wrap;/g,'margin-left: auto;$1display: flex;'],
    ],
};
export function restoreHeaderCompositionCss(surface,css) {
    for(const [before,after] of changes[surface]||[]){
        const count=typeof before==='string'?css.split(before).length-1:[...css.matchAll(before)].length;
        assert.equal(count,1,`Exactly one declared ${surface} composition correction`);
        css=css.replace(before,after);
    }
    return css;
}
export function restoreHeaderCompositionSource(source) {
    for(const surface of Object.keys(changes))source=restoreHeaderCompositionCss(surface,source);
    return source;
}
