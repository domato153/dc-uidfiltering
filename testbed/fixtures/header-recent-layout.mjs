import assert from 'node:assert/strict';

// Matching native ancestor classes and declarations observed through public CDP
// common.css?v=260918. This is a scoped cascade fixture, not a full host clone.
export function withHeaderRecentLayoutFixture(html) {
    const root = 'class="dcheader typea fixture-host-chrome"';
    assert.equal(html.split(root).length, 2);
    html = html.replace(root, 'class="dcheader typea fixture-host-chrome visit_bookmark list_wrap width1160"');
    const list = '<ul class="newvisit_list">';
    assert.equal(html.split(list).length, 2);
    // Independent normal-inline positioning input; the original native next
    // handler also writes left. The adapter must retain/restore these values.
    html = html.replace(list, '<ul class="newvisit_list" style="position:absolute;left:-73px;margin-left:11px">');
    return html.replace('</head>', `<style id="fixture-header-recent-layout">
        .newvisit_history { position:relative; height:38px; line-height:38px; padding:0 66px 0 12px; background:#f3f3f3; box-sizing:border-box; }
        .visit_bookmark .newvisit_history { width:100% !important; position:relative !important; }
        .width1160 .newvisit_history { position:absolute; width:1160px; }
        .list_wrap.width1160 .newvisit_history { position:relative; width:840px; }
        .visit_bookmark .newvisit_history .btn_open { position:relative; left:0; top:12px; float:left; display:block; width:15px; height:15px; margin-left:10px; }
        .bnt_visit_prev,.bnt_visit_next { position:absolute; top:12px; }
        .bnt_visit_prev { position:relative; left:0; float:left; margin-left:4px; }
        .newvisit_history .bnt_visit_prev,.newvisit_history .bnt_visit_next { top:13px; }
        .newvisit_history .bnt_visit_prev { margin-left:15px; margin-right:9px; }
    </style></head>`);
}
