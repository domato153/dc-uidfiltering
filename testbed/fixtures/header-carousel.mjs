import assert from 'node:assert/strict';

// Public host graph: issue_wrap(z13) competes with nav.gnb(z1001).
// The original recommendation remains inside issuebox and its own scrollbox.
export function withHeaderCarouselFixture(html,{dark=false}={}) {
    const marker='<section class="gall_listwrap list">';
    assert.equal(html.split(marker).length,2);
    html=html.replace('</head>',`${dark?'<style id="css-darkmode">body{background:#171b22;color:#ddd}</style>':''}<style id="fixture-header-carousel">
        body { min-height:2000px; }
        #dcuf-testbed-controls { display:none !important; }
        .dcheader .dchead { height:106px !important; min-height:106px !important; box-sizing:border-box !important; }
        .gnb_bar nav.gnb { position:relative; z-index:1001; height:46px; }
        .gnb_list > li { position:relative; height:46px; }
        .issue_wrap { position:relative; z-index:13; }
        .pageing_box { height:21px; text-align:right; }
        .pageing_box .btn_bluenext { width:21px; height:21px; padding:0; border:0; box-sizing:border-box; }
        #gall_top_recom .concept_img { height:360px; }
        #gall_top_recom .concept_txtlist { height:50px; }
    </style></head>`);
    html=html.replace(marker,`<div class="issue_wrap"><div class="issuebox gallery_box">
        <section id="gall_top_recom" class="concept_wrap"><div class="pageing_box"><span class="page_num">1/3</span><button class="btn_bluenext" type="button" aria-label="Native next page">→</button></div>
        <ul class="concept_txtlist"><li>Native recommendation</li></ul><div class="concept_img">Native image area</div></section>
    </div></div>${marker}`);
    return html.replace('</body>',`<script>
        window.__fixtureCarousel={calls:0,trusted:[]};
        window.__fixtureCarouselHandler=event=>{
            window.__fixtureCarousel.calls++;window.__fixtureCarousel.trusted.push(event.isTrusted);
            document.querySelector('#gall_top_recom .page_num').textContent=(window.__fixtureCarousel.calls%3+1)+'/3';
        };
        document.querySelector('#gall_top_recom .btn_bluenext').addEventListener('click',window.__fixtureCarouselHandler);
    </script></body>`);
}
