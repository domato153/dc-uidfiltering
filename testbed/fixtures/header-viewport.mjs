import assert from 'node:assert/strict';

// Public native shape: the host inner.hotgall_tip has min-width:365px,
// overriding its inherited max-width and keeping close x368..382 after
// the outer card shrinks. Preserve its actual offset parent and close rule.
export function withHeaderViewportFixture(html, {dark=false}={}) {
    assert.ok(html.includes('<section class="issue_contentbox"'));
    assert.match(html, /<body\b[^>]*>/);
    html = html.replace(/<body\b([^>]*)>/, '<body$1 style="--dcuf-header-drawer-viewport-width:23px !important">');
    html = html.replace('</head>', `${dark?'<style id="css-darkmode">body{background:#171b22;color:#ddd}</style>':''}<style id="fixture-header-viewport">
        body { min-height: 2000px; }
        #dcuf-testbed-controls { display: none !important; }
        .minor_ranking_box { position: relative; min-height: 180px; border: 1px solid transparent; box-sizing: border-box; }
        #hot_tip_pop { position: absolute; top: 15px; left: 12px; width: calc(100% - 26px); height: 82px; background: white; }
        .pop_tipbox .inner { position: relative; height: 82px; border: 1px solid transparent; }
        .pop_tipbox.minor_tip .inner.hotgall_tip { min-width: 365px; }
        #hot_tip_pop .btn_tipclose { position: absolute; right: 8px; top: 10px; margin-left: 5px; width: 14px; height: 13px; min-width: 0; padding: 0; border: 0; box-sizing: border-box; }
    </style></head>`);
    const marker = '<div class="minor_intro_box">';
    assert.equal(html.split(marker).length, 2);
    html = html.replace(marker, `<div class="minor_ranking_box">
        <button class="btn_mgall_dcp" type="button" onclick="fixture_toggle_tip()">Native tip</button>
        <div id="hot_tip_pop" class="pop_tipbox minor_tip" style="display:none"><div class="inner hotgall_tip"><span>Fixture native tip</span>
            <button class="btn_tipclose" type="button" onclick="fixture_toggle_tip()">×</button>
        </div></div>
    </div>${marker}`);
    return html.replace('</body>', `<script>
        window.__fixtureTipToggles = 0;
        window.fixture_toggle_tip = () => {
            const node = document.getElementById('hot_tip_pop');
            node.style.display = node.style.display === 'none' ? 'block' : 'none';
            window.__fixtureTipToggles++;
        };
    </script></body>`);
}
