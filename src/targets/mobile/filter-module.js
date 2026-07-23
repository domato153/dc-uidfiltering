    const __dcufFilterPageContext = window.__dcufPageContext || {
        type: 'other',
        isList: false,
        isView: false,
        hasListSurface: false,
        hasComments: false
    };
    const __dcufAllFilterCss = `
        :root {
            --dcuf-article-title-font-size: 21px;
            --dcuf-article-body-font-size: 26px;
            --dcuf-article-body-line-height: 1.9;
        }

        /* [최종 해결] 링크 미리보기 텍스트 박스 스타일 재정의 */
        .thum-txtin {
            box-sizing: border-box !important;  /* [핵심] 너비 계산 방식을 올바르게 수정 */
            width: 100% !important;            /* 부모 너비에 꽉 채우도록 설정 */
            overflow: visible !important;      /* 내용이 잘리는 것을 원천 방지 */
        }

        /* [v2.2.7 추가] 즉시 나타나는 커스텀 툴팁 스타일 */
        #custom-instant-tooltip {
            position: fixed; /* 화면 기준으로 위치 고정 */
            display: none; /* 평소에는 숨김 */
            z-index: 2147483647; /* 모든 요소 위에 표시 */
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
            white-space: nowrap; /* 툴팁 내용이 길어도 줄바꿈 안 함 */
            pointer-events: none; /* 툴팁이 마우스 이벤트를 방해하지 않도록 설정 (중요!) */
        }


        /* 초기 로딩 잠금과 로딩 팝업은 상단 injectInitialLockStyle()에서 즉시 주입합니다. */


        /* [수정] FOUC(화면 깜빡임) 방지 및 원본 테이블 숨김 강화 */
        table.gall_list {
            visibility: hidden !important; position: absolute !important;
            top: -9999px !important; left: -9999px !important;
            height: 0 !important; overflow: hidden !important;
        }


        /* [수정] 불필요한 PC버전 요소 및 사이트 광고 아이콘 숨김 */
        #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .dc_ft, .info_policy, .copyrigh, .ad_bottom_list, .bottom_paging_box + div, .intro_bg, .fixed_write_btn, .bottom_movebox, #zzbang_ad ,#zzbang_div,#zzbang_div .my_zzal, .my_dccon, .issue_contentbox, #gall_top_recom.concept_wrap,
        .gall_exposure, .stickyunit, #kakao_search, .banner_box, #ad-layer,#ad-layer-closer, #ad_floating, .__dcNewsWidgetTypeB__, .dctrend_ranking, .cm_ad, .con_banner.writing_banbox, [id^="criteo-"], .ad_left_wing_right_top._BTN_AD_, .ad_left_wing_list_top._BTN_AD_,
        .ad_left_wing_list_top, div:has(> script[src*="list@right_wing_game"]),
        .adv_bottom_write, ins.kakao_ad_area, em.icon_ad {
            display: none !important;
        }


        /* --- 기본 레이아웃 재정의 --- */
        /* [개선] 마이너 갤러리 상단 링크 영역 모바일 최적화 */
        .minor_intro_area {
            display: block !important; /* 숨김 처리를 확실히 무효화 */
            padding: 10px 15px !important;
            background: #f8f9fa !important;
            border-bottom: 1px solid #e5e5e5;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .minor_intro_area .user_wrap {
            display: flex !important;
            justify-content: space-around !important;
            align-items: center !important;
            gap: 10px;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 500px; /* 링크들이 너무 퍼지지 않게 중앙 정렬 효과 */
        }


        body { background: #fff !important; }
        html, body { overflow-x: hidden !important; }


        html, body, #top, .dcheader, .gnb_bar, #container, .wrap_inner, .visit_bookmark,
        .list_array_option, .left_content,
        .view_content_wrap, .gall_content, .gall_comment, .comment_box {
            width: 100% !important; /* 100vw 대신 100% 사용 */
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
        #container { padding-top: 5px; }


        /* [수정] dcheader(상단 전체) 및 dchead(내부 컨테이너) 반응형 스타일 */
        .dcheader.typea { min-width: 0 !important; width: 100% !important; height: auto !important; background: #fff; border-bottom: 1px solid #e5e5e5; }
        .dchead {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 8px 15px !important;
            gap: 15px !important;
            min-width: 320px;
            box-sizing: border-box !important;
            width: 100% !important;
        }


        .dchead h1.dc_logo { flex-shrink: 0 !important; margin: 0 !important; display: block !important; }
        .dchead h1.dc_logo img.logo_img { height: 22px !important; width: auto !important; }
        .dchead h1.dc_logo img.logo_img2 { display: none !important; }


        .dchead .wrap_search { flex-grow: 1 !important; min-width: 100px !important; max-width: 600px; }
        .dchead .top_search { width: 100% !important; }


        .dchead .area_links { display: block !important; flex-shrink: 0 !important; white-space: nowrap !important; }


        /* [추가] 갤러리 헤더(제목, 설정 버튼 등) 반응형 스타일 */
        .page_head {
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
        /* [수정됨] .fr 오른쪽 정렬을 위해 margin-left: auto 사용 */
        .page_head > .fl { float: none !important; }
        .page_head > .fr {
            float: none !important;
            margin-left: auto; /* 핵심: 이 속성으로 오른쪽 끝으로 밀어냄 */
            display: flex;
            align-items: center;
            gap: 8px; /* 버튼 등 내부 요소간 간격 */
        }


        /* [추가] Clearfix: float으로 인한 부모 요소의 높이 붕괴 방지 */
        .page_head::after, .list_array_option::after {
            content: ""; display: table; clear: both;
        }


        /* [추가] 일반/마이너 갤러리 글 목록 상단 공통 여백 */
        .list_array_option {
            margin-bottom: 10px !important;
        }


        /* [수정] gnb_bar (메인 GNB) 반응형 스타일 개선 */
        .gnb_bar { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; box-sizing: border-box !important; background: #3b4890 !important; }
        .gnb_bar nav.gnb { width: auto !important; min-width: 0 !important; padding: 0 15px !important; display: flex !important; justify-content: center !important; }
        .gnb_bar .gnb_list { display: flex; flex-wrap: wrap; justify-content: space-around; width: 100% !important; }


        /* [개선] newvisit_history (최근 방문 갤러리) 상/하단 선 모두 제거 */
        .newvisit_history { display: flex !important; align-items: center; width: 100% !important; min-width: 0 !important; height: auto !important; padding: 8px 10px !important; background: #f8f9fa !important; border: none !important; box-sizing: border-box !important; gap: 5px; }
        .newvisit_history::before { display: none !important; }
        .newvisit_history > .tit { flex-shrink: 0; margin: 0 !important; padding-right: 5px; font-size: 14px !important; font-weight: bold; color: #333; }
        .newvisit_history > .newvisit_box { flex: 1; min-width: 0; overflow: hidden; }
        .newvisit_history .newvisit_list { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100% !important; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .newvisit_history .newvisit_list::-webkit-scrollbar { display: none; }
        .newvisit_history .newvisit_list li { white-space: nowrap; flex-shrink: 0; }
        .newvisit_history > :is(.btn_open,.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next,.btn_newvisit_more,.bnt_newvisit_more) { display: inline-flex !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none !important; margin: 0 !important; padding: 0 4px; overflow: visible !important; }
        .newvisit_history > :is(.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next) { min-width: 22px; min-height: 24px; }


        /* [최종 수정] 마이너 갤러리 전용 탭/말머리 레이아웃 (v1.0.5) */
        .is-mgallery .list_array_option {
            display: flex !important;
            align-items: center !important; /* 세로 중앙 정렬 */
            flex-wrap: nowrap !important; /* 자식 요소들이 줄바꿈되지 않도록 강제 */
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 10px 15px !important;
            margin-bottom: 10px !important;
            gap: 10px; /* 요소들 사이의 간격 */
        }


        /* 모든 자식 div의 float 속성 원천 차단 및 기본 너비 설정 */
        .is-mgallery .list_array_option > div {
            float: none !important;
            width: auto !important; /* [핵심] 원본 CSS의 width: 1% 덮어쓰기 */
            flex-shrink: 0; /* 기본적으로 내용물 크기 유지 */
        }


        /* [신규] '전체글/개념글' 탭 컨테이너(.array_tab) 직접 스타일링 */
        .is-mgallery .list_array_option .array_tab {
            display: flex !important;
            white-space: nowrap; /* 버튼 줄바꿈 방지 */
            gap: 4px; /* 버튼 사이 간격 */
        }

        /* [최종 수정] 마이너 갤러리 탭 버튼 크기 및 너비 축소 */
        .is-mgallery .list_array_option .array_tab button {
            width: auto !important;        /* 고정 너비 해제 */
            height: auto !important;       /* 고정 높이 해제 */
            font-size: 12px !important;    /* 글자 크기 줄이기 */
            padding: 6px 12px !important;  /* 상하, 좌우 내부 여백 줄이기 */
            line-height: 1.4 !important;   /* 줄 간격 조정 */
        }

        /* 중앙 요소 (주로 말머리) - 남는 공간 모두 차지 */
        .is-mgallery .list_array_option > .center_box {
            flex-grow: 1; /* 남는 공간을 모두 차지 */
            flex-shrink: 1; /* 공간 부족 시 줄어들도록 허용 */
            min-width: 0; /* 내용이 길어도 줄어들 수 있도록 설정 */
            justify-content: center !important; /* 내부 아이템 중앙 정렬 */
            display: flex !important;
            flex-wrap: wrap;
            gap: 5px;
            background: none !important;
            padding: 0 !important;
            border: none !important;
            margin: 0 !important;
        }


        /* 오른쪽 요소 (글쓰기 버튼 등) - 오른쪽 끝으로 정렬 */
        .is-mgallery .list_array_option > .right_box {
            margin-left: auto; /* 왼쪽 요소들과 최대한 멀리 떨어지도록 설정 */
        }
        /* --- 마이너 갤러리 레이아웃 수정 완료 --- */


        /* [해결] 마이너 갤러리에서 헤더와 글 목록 겹침 현상 방지 */
        .is-mgallery .gall_listwrap {
            margin-top: 0 !important; /* 위에서 list_array_option의 margin-bottom으로 간격을 조절하므로 0으로 초기화 */
        }


        /* --- 커스텀 모바일 리스트 UI --- */
        .custom-mobile-list {
            border-top: 1px solid #ddd;
            background: #fff;
        }

        /* [이식된 기능] 광고 게시물 기본 숨김 처리 */
        .custom-post-item.is-ad-post {
            display: none !important;
        }

        .custom-post-item.notice + .custom-post-item:not(.notice):not(.concept),
        .custom-post-item.concept + .custom-post-item:not(.notice):not(.concept) { border-top: 1px solid var(--dcuf-theme-accent, #4263eb) !important; }
        .custom-post-item { display: block; padding: 15px 18px; border-bottom: 1px solid #e6e6e6; text-decoration: none; color: #333; }
        .custom-post-item:hover { background-color: #f8f9fa; }
        .custom-post-item .author { cursor: pointer; }
        .custom-post-item.notice, .custom-post-item.concept { background-color: #f8f9fa; position: relative; padding-left: 60px; }
        .custom-post-item.notice::before { content: '공지'; background-color: #e03131; position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: #fff; padding: 4px 9px; border-radius: 4px; }
        .custom-post-item.concept::before { content: '개념'; background-color: var(--dcuf-theme-accent-strong, #4263eb); position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: var(--dcuf-theme-on-accent, #fff); padding: 4px 9px; border-radius: 4px; }


                /* [v2.2.0 이식] 게시글 목록: 제목, 말머리, 댓글수 */
        .post-title {
            font-weight: 500;
            color: #333;
            margin-bottom: 10px;
            word-break: break-all;
            line-height: 1.5 !important;
            display: flex !important;
            align-items: center !important;
            font-size: 24px !important; /* [핵심 수정] 제목/말머리 크기 기준을 부모로 이동 */
        }
        .post-title a {
            color: inherit;
            text-decoration: none;
            display: flex;
            align-items: center;
            /* [핵심 수정] font-size 제거, 부모 크기를 상속받음 */
        }
        .post-title a:visited { color: #770088; }
        .post-title .gall_subject {
            font-weight: bold !important;
            margin-right: 8px; /* 간격 살짝 조정 */
            flex-shrink: 0; /* 말머리가 줄어들지 않도록 설정 */
            border: none !important; /* [요청 수정] 글머리 테두리 제거 */
        }
        .post-title .reply_num {
            color: var(--dcuf-theme-accent, #4263eb) !important;
            font-weight: bold !important;
            margin-left: 8px !important; /* 간격 조정 */
            cursor: pointer;
            flex-shrink: 0 !important;
        }
        .post-title > .dcuf-title-decoration {
            flex-shrink: 0 !important;
            color: var(--dcuf-theme-accent, #4263eb) !important;
        }
        .post-title > .dcuf-title-decoration > * {
            color: inherit !important;
        }


        /* [v2.2.0 이식] 게시글 목록: 작성자, 통계 */
        .post-meta { display: flex; justify-content: space-between; align-items: center; color: #888; }
        .post-meta .author { display: flex; align-items: center; }
        .post-meta .author .gall_writer { display: inline !important; padding: 0 !important; text-align: left !important; border: none !important; }
        .post-meta .author .nickname {
            color: #555 !important;
            font-size: 15px !important; /* 폰트 크기 키움 */
            font-weight: 500 !important;
        }
        .post-meta .author .ip { color: #555 !important; }
        .post-meta .stats {
            display: flex;
            gap: 10px;
            font-size: 15px !important; /* 폰트 크기 키움 */
        }


        /* --- 커스텀 하단 컨트롤 UI --- */
        .custom-bottom-controls { display: flex; flex-direction: column; align-items: center; padding: 15px; background: #fff; }
        .custom-bottom-controls form[name="frmSearch"] { display: flex !important; width: 100%; max-width: 500px; box-sizing: border-box !important; margin: 15px 0 !important; gap: 5px; flex-wrap: nowrap !important; }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box { flex: 0 1 auto; }
        .custom-bottom-controls form[name="frmSearch"] .search_right_box { display: flex; flex: 1 1 0; }
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] { width: 100% !important; min-width: 100px; }
        .custom-button-row { width: 100%; }
        .custom-button-row .list_bottom_btnbox {
            border: 1px solid var(--dcuf-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
            padding: 10px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] {
            display: block !important;
            width: 100% !important;
            max-width: 520px;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] fieldset {
            display: block !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] legend {
            display: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search_wrap,
        .custom-bottom-controls form[name="frmSearch"] .buttom_search_wrap {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            width: fit-content !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array,
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            float: none !important;
            margin: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array {
            width: 125px !important;
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area {
            width: 117px !important;
            height: 30px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area .inner {
            width: 34px !important;
            height: 30px !important;
            right: 0 !important;
            top: 0 !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            display: flex !important;
            align-items: center !important;
            width: 320px !important;
            height: 38px !important;
            min-width: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .inner_search {
            width: 278px !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] input.in_keyword,
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            width: 100% !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 9px !important;
            border: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #333 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bnt_search,
        .custom-bottom-controls form[name="frmSearch"] button.sp_img.bnt_search {
            flex: none !important;
            width: 37px !important;
            min-width: 37px !important;
            height: 36px !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls .page_box {
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.85) !important;
            padding: 8px 10px;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
        }
        .comment_box .all_comment {
            display: flex !important;
            align-items: flex-start !important;
            padding: 8px 15px !important;
            border-bottom: 1px solid #eee;
            gap: 15px !important; /* 작성자와 내용 사이 간격 */
        }
        .comment_box .usertxt {
            flex: 1 !important;
            min-width: 0 !important;
            /* [v2.6.8] font-size는 JS scaleAllFontSizes()에서 배율 적용으로 설정됩니다 */
            line-height: 1.7 !important;
            word-break: break-all !important;
            color: #333 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* --- 글 보기/댓글 UI --- */
        /* DCUF_VIEW_SURFACE_START */
        .gall_content, .gall_tit_box, .gall_writer_info, .btn_recommend_box, .view_bottom, .gall_comment {
            background: #fff !important;
            padding: 15px !important;
            border-bottom: 1px solid #ddd;
        }


        /* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */
        /* [최종 수정] 이미지 댓글 UI 가로 배치 및 모든 문제 해결 */
        
        /* 1. 부모 컨테이너 너비 100%로 확보 */
        .writing_view_box .img_area,
        .writing_view_box .img_comment {
            width: 100% !important;
            box-sizing: border-box !important;
        }

        .writing_view_box .img_comment {
            padding: 15px !important;
            border-top: 1px solid #ddd !important;
            margin-top: 10px !important;
        }

        /* 2. float-flex 충돌 방지 */
        .writing_view_box .img_comment .fl {
            float: none !important;
        }

        /* 3. 텍스트 컨테이너가 남은 공간을 모두 차지하도록 강제 */
        .writing_view_box .img_comment .cmt_txt_cont {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            display: flex !important; /* 자식들을 가로(기본값)로 배치 */
            align-items: stretch !important; /* 자식들의 높이를 통일 */
        }
        
        /* 4. textarea를 감싸는 div가 남은 가로 공간을 모두 차지하도록 설정 (핵심 수정) */
        .writing_view_box .img_comment .cmt_write {
            flex-grow: 1 !important; /* 가로 방향으로 남은 공간 차지 */
            display: flex !important;
        }

        /* 5. textarea가 부모 공간을 꽉 채우도록 설정 */
        .writing_view_box .img_comment textarea {
            width: 100% !important;
            flex-grow: 1 !important;
            box-sizing: border-box !important;
            resize: none !important;
        }

        /* 6. 등록 버튼 영역이 고정된 크기를 갖도록 설정 */
        .writing_view_box .img_comment .cmt_cont_bottm {
            flex-shrink: 0 !important; /* 공간이 부족해도 줄어들지 않음 */
            padding-left: 5px !important; /* textarea와 간격 추가 */
            display: flex;
            align-items: flex-end; /* 버튼을 아래쪽에 정렬 */
        }
                    /* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */
        /* [v2.6.8 수정] 댓글창과 게시글 목록 모두 닉네임 팝업이 잘리지 않도록 overflow 해제 */
        /* [v2.6.9] 댓글 리스트 열맞춤을 위해 cmt_nickbox에 최소 너비 및 정렬 설정 */
        .cmt_nickbox, .author {
            display: inline-flex !important;
            align-items: center !important;
            position: relative !important; /* 팝업 위치 기준점 */
            width: auto !important;
            min-width: 140px !important; /* 작성자 영역 최소 너비 확보로 열맞춤 */
            max-width: none !important;
            overflow: visible !important; /* 팝업 노출 허용 */
            white-space: nowrap !important;
            vertical-align: middle !important;
            line-height: normal !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
        }
        /* 게시글 목록(.author)은 고정 너비 불필요하므로 해제 */
        .author { min-width: 0 !important; }

        .nickname, .ip {
            display: inline-block !important;
            max-width: 240px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        .gall_writer { max-width: none !important; }
        .nickname { max-width: 240px !important; }
        
        /* 게시글 목록 내 닉네임 텍스트 크기 조정 */
        .author .nickname { font-size: 15px !important; }

        /* [v2.6.8] 유저 데이터 레이어(작성글 검색 등) 위치 최적화 */
        #user_data_lyr {
            position: absolute !important;
            top: 100% !important; /* 닉네임 바로 아래에서 시작 */
            left: 0 !important;   /* 왼쪽 정렬 */
            margin-top: 5px !important;
            z-index: 10001 !important;
            background: #fff !important;
            border: 1px solid #ccc !important;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.2) !important;
            display: none; /* 기본은 숨김 (JS에서 제어) */
        }
        /* 이미지 댓글 내에서의 위치 미세 조정 */
        .img_comment #user_data_lyr {
            top: 25px !important;
        }
        /* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */
        /* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */

        .gallview_contents img:not(.pop_wrap *),
        .gallview_contents video:not(.pop_wrap *) { max-width: 100% !important; height: auto !important;  }


        /* [v2.2.0 이식] 글 본문 가독성 개선 */
        .view_content_wrap .title_subject {
            font-size: var(--dcuf-article-title-font-size, 21px) !important;
            font-weight: 500 !important;
        }
        .gallview_contents {
            font-size: var(--dcuf-article-body-font-size, 26px) !important;
            line-height: var(--dcuf-article-body-line-height, 1.9) !important;
            word-break: break-all !important;
            /* [최종 해결] 댓글과 동일한 원리로 box-sizing 속성 추가 */
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .gallview_contents p:not(.pop_wrap *),
        .gallview_contents div:not(.pop_wrap):not(.pop_wrap *),
        .gallview_contents span:not(.pop_wrap *) {
            /* [v2.6.8 수정] font-size: inherit 제거 → JS 배율 스케일링으로 대체하여 원본 서식 유지 */
            line-height: inherit !important;
            color: inherit !important;
        }


        /* [v2.2.0 이식] 댓글 가독성 개선 (box-sizing 추가를 위해 위치 이동) */
        .comment_box .date_time {
            font-size: 15px !important;
        }


        /* [v2.2.0 이식] 추천/비추천 버튼 UI 개선 */
        /* [v2.6.8] 고정닉 추천수 및 아이콘 노출 (위치 조정) */
        .btn_recommend_box .writer_nikcon { display: inline-block !important; margin-right: 2px !important; vertical-align: middle !important; }
        .btn_recommend_box .writer_nikcon img { width: 14px !important; height: 14px !important; vertical-align: middle !important; }
        .btn_recommend_box .font_blue.smallnum {
            display: inline-block !important; font-size: 11px !important; color: var(--dcuf-theme-accent, #4263eb) !important; vertical-align: middle !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent, #4263eb) 8%, transparent); padding: 1px 4px; border-radius: 3px; font-weight: normal !important;
        }
        .btn_recommend_box {
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 5px 8px !important;
            border: none !important;
            padding: 10px !important;
        }
        .btn_recommend_box .inner_box,
        .btn_recommend_box .recom_bottom_box {
            display: contents !important;
        }
        .btn_recommend_box .inner_box > .inner {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            border: 1px solid #ddd;
            padding: 8px 12px;
            border-radius: 5px;
            background-color: #f8f9fa;
        }
        .btn_recommend_box button:not(.pop_wrap *),
        .btn_recommend_box .up_num_box,
        .btn_recommend_box .down_num_box {
            position: static !important;
            float: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            background: none !important;
        }
        .btn_recommend_box .up_num_box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 2px !important;
        }
        .btn_recommend_box .up_num,
        .btn_recommend_box .down_num {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #333 !important;
            line-height: 1 !important;
        }
        .btn_recommend_box .sup_num {
            display: inline-flex !important;
            align-items: center !important;
            margin: 0 !important;
        }


        .cmt_write_box { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; padding: 10px !important; }
        .cmt_write_box > .fl { float: none !important; flex-basis: 200px; flex-shrink: 1; min-width: 180px; }
        .cmt_write_box > .fl .usertxt { display: flex; flex-direction: column; gap: 5px; }
        .cmt_write_box > .fl .usertxt input { width: 100% !important; box-sizing: border-box; }
        .cmt_write_box .cmt_txt_cont { flex: 1; min-width: 250px; padding: 0 !important; }
        .cmt_write_box .cmt_txt_cont textarea { width: 100% !important; height: 85px !important; box-sizing: border-box !important; resize: vertical; }
        .cmt_write_box .cmt_cont_bott { width: 100%; padding: 0 !important; }
        .cmt_write_box .cmt_btn_bot { display: flex; justify-content: flex-end; }
        @media screen and (max-width: 600px) {
            .cmt_write_box { flex-direction: column !important; }
            .cmt_write_box > .fl, .cmt_write_box .cmt_txt_cont { flex-basis: auto; width: 100% !important; min-width: 100%; }
        }
        /* --- [v2.3.2 수정] 개인 차단 기능 UI --- */
        /* DCUF_SHARED_FILTER_UI_START */
        #dc-personal-block-controls {
            --dcuf-fab-width: 152px;
            --dcuf-fab-height: 76px;
            --dcuf-fab-padding-x: 28px;
            --dcuf-fab-font-size: 32px;
            position: fixed;
            z-index: 2147483640;
            width: max-content;
            height: var(--dcuf-fab-height);
            overflow: visible;
        }
        #dc-personal-block-fab {
            box-sizing: border-box;
            appearance: none;
            width: auto !important;
            min-width: var(--dcuf-fab-width) !important;
            height: var(--dcuf-fab-height) !important;
            padding: 0 var(--dcuf-fab-padding-x);
            background: linear-gradient(180deg, #fbfcfe 0%, #f1f4f8 100%) !important;
            color: #4d5e76;
            border-radius: 999px;
            border: 1px solid #c7d2df;
            box-shadow: 0 6px 16px rgba(36, 49, 72, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: var(--dcuf-fab-font-size) !important;
            font-weight: 800;
            letter-spacing: -0.03em;
            line-height: 1;
            white-space: nowrap;
            word-break: keep-all;
            cursor: pointer;
            user-select: none;
            touch-action: none;
            font-family: inherit;
            transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background-color 0.18s ease-out;
        }
        #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #ffffff 0%, #eef2f7 100%) !important;
            border-color: #b6c2d1;
            box-shadow: 0 8px 18px rgba(36, 49, 72, 0.14);
        }
        #dc-personal-block-fab:active {
            cursor: grabbing;
            transform: scale(0.97);
            box-shadow: 0 4px 10px rgba(36, 49, 72, 0.1);
        }
        #dc-personal-block-fab:focus-visible {
            outline: 3px solid rgba(59, 113, 253, 0.36);
            outline-offset: 2px;
        }
        #dc-personal-block-drawer {
            position: absolute;
            z-index: 2147483641;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: max-content;
            min-width: 164px;
            padding: 6px;
            background: #fff;
            border: 1px solid #c7d2df;
            border-radius: 12px;
            box-shadow: 0 12px 28px rgba(36, 49, 72, 0.2);
        }
        #dc-personal-block-drawer[hidden] {
            display: none !important;
        }
        #dc-personal-block-drawer button {
            box-sizing: border-box;
            appearance: none;
            width: 100%;
            min-height: 40px;
            padding: 8px 12px;
            background: transparent;
            color: #34445a;
            border: 0;
            border-radius: 8px;
            text-align: left;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.2;
            white-space: nowrap;
            cursor: pointer;
        }
        #dc-personal-block-drawer button:hover,
        #dc-personal-block-drawer button:focus-visible {
            background: #edf2f8;
            color: #24364f;
            outline: none;
        }
        /* DCUF_FAB_SHELL_END */
        #dc-personal-block-size-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483644;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(18, 25, 35, 0.45);
        }
        #dc-personal-block-size-panel {
            box-sizing: border-box;
            width: min(360px, calc(100vw - 32px));
            padding: 20px;
            background: #fff;
            color: #34445a;
            border: 1px solid #c7d2df;
            border-radius: 14px;
            box-shadow: 0 18px 48px rgba(36, 49, 72, 0.28);
        }
        #dc-personal-block-size-panel h3 {
            margin: 0 0 8px;
            color: inherit;
            font-size: 19px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-description {
            margin: 0 0 16px;
            color: #66758a;
            font-size: 13px;
            line-height: 1.45;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-value {
            display: block;
            margin-bottom: 8px;
            color: #33445b;
            text-align: center;
            font-size: 18px;
            font-weight: 800;
        }
        #dc-personal-block-size-panel input[type="range"] {
            width: 100%;
            min-height: 36px;
            margin: 0;
            cursor: pointer;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-bounds {
            display: flex;
            justify-content: space-between;
            margin-top: -2px;
            color: #7b8798;
            font-size: 11px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions {
            display: flex;
            gap: 8px;
            margin-top: 18px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions button {
            flex: 1;
            min-height: 42px;
            padding: 8px;
            background: #edf2f8;
            color: #34445a;
            border: 0;
            border-radius: 9px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions [data-dcuf-fab-size-action="save"] {
            background: #3b71fd;
            color: #fff;
        }
        #dc-selection-popup {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2147483641;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            min-width: 320px;
            text-align: center;
        }
        #dc-selection-popup h4 { margin: 0 0 20px 0; font-size: 18px; font-weight: 600; }
        #dc-selection-popup .block-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        #dc-selection-popup .block-option { display: flex; justify-content: space-between; align-items: center; background-color: #f8f9fa; padding: 12px; border-radius: 8px; }
        #dc-selection-popup .block-option span { font-size: 15px; color: #333; word-break: break-all; margin-right: 15px; }
        #dc-selection-popup .block-option button { font-size: 14px; padding: 6px 12px; cursor: pointer; border: none; border-radius: 6px; background-color: var(--dcuf-theme-accent-strong, #4263eb); color: var(--dcuf-theme-on-accent, #fff); font-weight: 500; }
        /* [v2.5.7 추가] 차단 해제 버튼 스타일 */
        #dc-selection-popup .block-option button.btn-unblock { background-color: #e03131; }
        #dc-selection-popup .popup-buttons button { width: 100%; font-size: 16px; padding: 10px; cursor: pointer; border: none; border-radius: 8px; background-color: #e9ecef; color: #555; }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            cursor: pointer !important;
        }


        #dc-block-management-panel-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483645;
        }
        #dc-block-management-panel {
            position: fixed;
            background: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2147483646;
            display: flex;
            flex-direction: column;
            min-width: 350px; min-height: 300px;
            resize: both;
            overflow: hidden;
        }
        #dc-block-management-panel .panel-header {
            display: flex;  align-items: center;
            padding: 10px 15px;
            background: #eee;
            border-bottom: 1px solid #ccc;
            cursor: move;
            user-select: none;
        }
        #dc-block-management-panel .panel-header h3 { margin: 0; font-size: 16px; }
        #dc-block-management-panel .panel-close-btn { font-size: 20px; cursor: pointer; border: none; background: none; margin-left: auto;}
        #dc-block-management-panel .panel-tabs { display: flex; border-bottom: 1px solid #ccc; background: #fff; }
        #dc-block-management-panel .panel-tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; border-right: 1px solid #eee; }
        #dc-block-management-panel .panel-tab:last-child { border-right: none; }
        #dc-block-management-panel .panel-tab.active { background: #3b71fd; color: #fff; font-weight: bold; }
        #dc-block-management-panel .panel-body { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        #dc-block-management-panel .panel-list-controls { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; }
        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn { /* [수정] 백업 버튼 공통 스타일 적용 */
            font-size: 13px; padding: 4px 8px; cursor: pointer;
            border: 1px solid #ccc; background: #f1f3f5; border-radius: 4px; margin-left: 5px;
        }
        #dc-block-management-panel .panel-content { flex-grow: 1; overflow-y: auto; }
        #dc-block-management-panel .blocked-list { list-style: none; margin: 0; padding: 10px; }
        #dc-block-management-panel .blocked-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid #f0f0f0; }
        #dc-block-management-panel .blocked-item.item-to-delete { text-decoration: line-through; opacity: 0.5; }
        #dc-block-management-panel .item-name { font-size: 14px; word-break: break-all; }
        #dc-block-management-panel .delete-item-btn { cursor: pointer; color: #e03131; font-weight: bold; padding: 0 5px; }
        #dc-block-management-panel .panel-footer {
            display: flex; /* [수정] Flexbox 레이아웃으로 변경 */
            justify-content: space-between; /* [수정] 양쪽 끝으로 요소 배치 */
            align-items: center; /* [수정] 세로 중앙 정렬 */
            padding: 10px;
            border-top: 1px solid #ccc;
            background: #f9f9f9;
        }
        #dc-block-management-panel .panel-footer-left {
            display: flex;
            align-items: center;
        }
        #dc-block-management-panel .panel-save-btn { padding: 8px 16px; font-size: 14px; background: #3b71fd; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        #dc-block-management-panel .panel-resize-handle {
            position: absolute;
            right: 0; bottom: 0;
            width: 15px; height: 15px;
            cursor: nwse-resize;
            background: repeating-linear-gradient(135deg, #ccc, #ccc 1px, transparent 1px, transparent 3px);
        }

        /* [신규] 개인 차단 On/Off 스위치 UI */
        #dc-block-management-panel .switch-container { display: flex; align-items: center; margin-left: 15px; }
        #dcinside-filter-setting .switch,
        #dc-block-management-panel .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        #dcinside-filter-setting .switch input,
        #dc-block-management-panel .switch input { opacity: 0; width: 0; height: 0; }
        #dcinside-filter-setting .switch-slider,
        #dc-block-management-panel .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 22px; }
        #dcinside-filter-setting .switch-slider:before,
        #dc-block-management-panel .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        #dcinside-filter-setting input:checked + .switch-slider,
        #dc-block-management-panel input:checked + .switch-slider { background-color: #3b71fd; }
        #dcinside-filter-setting input:checked + .switch-slider:before,
        #dc-block-management-panel input:checked + .switch-slider:before { transform: translateX(18px); }

        /* [신규] 백업/복원 팝업 UI */
        #dc-backup-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 2147483647;
        }
        #dc-backup-popup {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 2147483647; padding: 20px; min-width: 350px;
        }
        #dc-backup-popup .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        #dc-backup-popup .popup-header h4 { margin: 0; font-size: 16px; }
        #dc-backup-popup .popup-close-btn { font-size: 20px; background: none; border: none; cursor: pointer; color: #888; }
        #dc-backup-popup .popup-content { display: flex; flex-direction: column; gap: 15px; }
        #dc-backup-popup .export-section, #dc-backup-popup .import-section { display: flex; flex-direction: column; gap: 8px; }
        #dc-backup-popup label { font-size: 14px; font-weight: bold; }
        #dc-backup-popup .description { font-size: 12px; color: #666; }
        /* [수정] import-controls를 세로 정렬로 변경 */
        #dc-backup-popup .import-controls { display: flex; flex-direction: column; gap: 8px; }
        /* [추가] 파일 입력(<input type="file">) 스타일 */
        #dc-backup-popup .import-file-input {
            font-size: 14px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        #dc-backup-popup textarea { flex-grow: 1; height: 80px; resize: vertical; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-family: monospace; }
        #dc-backup-popup button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        /* [수정] 기존 버튼들에 flex 속성 추가 */
        #dc-backup-popup .export-btn { background-color: #3b71fd; color: #fff; border: 1px solid #3b71fd; flex: 1; }
        /* [추가] '파일로 다운로드' 버튼 전용 스타일 */
        #dc-backup-popup .export-btn-download { background-color: #ffffff; color: #374151; border: 1px solid #d4dbe8; flex: 1; }
        /* [수정] 불러오기 버튼 스타일 조정 */
        #dc-backup-popup .import-btn { background-color: #3b71fd; color: #fff; border: 1px solid #3b71fd; width: 100%; margin-top: 8px; }

        /* Popup refresh */
        #dcinside-filter-setting,
        #dc-selection-popup,
        #dc-backup-popup,
        #dc-block-management-panel {
            box-sizing: border-box !important;
            border: 1px solid #d9dee7 !important;
            border-radius: 14px !important;
            box-shadow: 0 18px 42px rgba(26, 39, 60, 0.18) !important;
        }
        #dcinside-filter-setting,
        #dc-selection-popup,
        #dc-backup-popup {
            animation: dcuf-popup-center-in 0.16s ease-out;
        }
        #dc-block-management-panel {
            animation: dcuf-popup-fade-in 0.16s ease-out;
            min-width: 460px !important;
            min-height: 340px !important;
            background: #f7f9fc !important;
        }
        #dcinside-filter-setting {
            min-width: 540px !important;
            max-width: min(92vw, 680px) !important;
            padding: 18px !important;
            cursor: default !important;
        }
        #dcinside-filter-setting .dcuf-settings-header {
            margin-bottom: 12px !important;
            padding: 0 0 12px !important;
            border-bottom: 1px solid #e5e9f1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting .dcuf-settings-header > div:first-child {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            align-items: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-header > div:first-child > div {
            border-left: 0 !important;
            padding-left: 0 !important;
        }
        #dcinside-filter-setting .dcuf-settings-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting .dcuf-settings-body > hr {
            display: none !important;
        }
        #dcinside-filter-setting .dcuf-settings-section {
            border: 1px solid #e5e9f1 !important;
            background: #fbfcff !important;
            border-radius: 10px !important;
            padding: 12px !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold {
            display: flex !important;
            gap: 12px !important;
            align-items: stretch !important;
            justify-content: space-between !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child {
            flex: 0 1 280px !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > h3 {
            width: 100% !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > input {
            margin: 0 auto !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > div {
            width: auto !important;
            min-height: 0 !important;
            max-width: 100% !important;
            border: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:last-child {
            flex: 0 0 auto !important;
            border: 0 !important;
            border-radius: 10px !important;
            background: #fff !important;
            padding: 10px !important;
            box-shadow: none !important;
        }
        #dcinside-filter-setting #dcinside-ratio-section > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            align-items: stretch !important;
        }
        #dcinside-filter-setting #dcinside-ratio-section > div:last-child {
            text-align: center !important;
        }
        #dcinside-filter-setting #dcinside-threshold-input,
        #dcinside-filter-setting #dcinside-ratio-min,
        #dcinside-filter-setting #dcinside-ratio-max {
            min-height: 40px !important;
            border: 1px solid #cfd7e6 !important;
            border-radius: 8px !important;
            padding: 6px 10px !important;
            box-sizing: border-box !important;
            background: #fff !important;
        }
        #dcinside-filter-setting .dcuf-settings-footer {
            margin-top: 11px !important;
            padding-top: 11px !important;
            border-top: 1px solid #e5e9f1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting #dcinside-threshold-save {
            background: #3b71fd !important;
            color: #fff !important;
            border: 1px solid #3b71fd !important;
            border-radius: 9px !important;
            min-height: 42px !important;
            padding: 0 16px !important;
            font-weight: 700 !important;
        }
        #dcinside-filter-setting #dcinside-filter-close,
        #dc-backup-popup .popup-close-btn,
        #dc-block-management-panel .panel-close-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 0 !important;
            line-height: 1 !important;
        }
        #dcinside-filter-setting #dcinside-filter-close {
            width: 30px !important;
            height: 30px !important;
            border-radius: 999px !important;
        }

        #dc-block-management-panel .panel-header {
            background: #f3f6fc !important;
            border-bottom: 1px solid #e3e8f2 !important;
            padding: 12px 14px !important;
        }
        #dc-block-management-panel .panel-close-btn {
            width: 28px !important;
            height: 28px !important;
            border-radius: 999px !important;
            color: #4b5563 !important;
        }
        #dc-block-management-panel .panel-close-btn:hover {
            background: #e9eef8 !important;
        }
        #dc-block-management-panel .panel-tabs {
            background: #f8faff !important;
            border-bottom: 1px solid #e5e9f1 !important;
            padding: 6px !important;
            gap: 6px !important;
        }
        #dc-block-management-panel .panel-tab {
            border-right: 0 !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            color: #4b5563 !important;
            padding: 10px 8px !important;
            position: relative !important;
        }
        #dc-block-management-panel .panel-tab.active {
            background: #eaf1ff !important;
            color: #1d4ed8 !important;
            font-weight: 700 !important;
        }
        #dc-block-management-panel .panel-tab.active::after {
            content: '';
            position: absolute;
            left: 12px;
            right: 12px;
            bottom: 6px;
            height: 2px;
            border-radius: 999px;
            background: #3b71fd;
        }
        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn {
            min-height: 36px !important;
            border: 1px solid #d4dbe8 !important;
            border-radius: 8px !important;
            background: #fff !important;
            color: #374151 !important;
            font-weight: 600 !important;
            transition: background-color 0.14s ease, border-color 0.14s ease;
        }
        #dc-block-management-panel .select-all-btn:hover,
        #dc-block-management-panel .select-all-global-btn:hover,
        #dc-block-management-panel .panel-backup-btn:hover {
            background: #f6f9ff !important;
            border-color: #b8c8ea !important;
        }
        #dc-block-management-panel .panel-save-btn {
            min-height: 38px !important;
            border-radius: 9px !important;
            padding: 0 18px !important;
            font-weight: 700 !important;
            box-shadow: 0 6px 16px rgba(59, 113, 253, 0.24) !important;
        }
        #dc-block-management-panel .blocked-list {
            padding: 6px 10px 12px !important;
        }
        #dc-block-management-panel .blocked-item {
            min-height: 44px !important;
            padding: 10px 8px !important;
            border-bottom: 1px solid #edf1f7 !important;
            transition: background-color 0.14s ease, opacity 0.14s ease;
        }
        #dc-block-management-panel .blocked-item:hover {
            background: #f6f9ff !important;
        }
        #dc-block-management-panel .blocked-item.item-to-delete {
            background: #fff5f6 !important;
            opacity: 0.5 !important;
        }
        #dc-block-management-panel .delete-item-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 24px !important;
            height: 24px !important;
            border-radius: 999px !important;
            background: #ffe9ec !important;
            color: #e03131 !important;
            font-size: 14px !important;
            line-height: 1 !important;
            padding: 0 !important;
            transition: background-color 0.14s ease;
        }
        #dc-block-management-panel .delete-item-btn:hover {
            background: #ffd4dc !important;
        }

        #dc-backup-popup {
            min-width: 420px !important;
            max-width: min(92vw, 560px) !important;
            padding: 18px !important;
        }
        #dc-backup-popup .popup-header {
            margin-bottom: 12px !important;
            padding-bottom: 10px !important;
            border-bottom: 1px solid #e5e9f1 !important;
        }
        #dc-backup-popup .popup-close-btn {
            width: 28px !important;
            height: 28px !important;
            border-radius: 999px !important;
        }
        #dc-backup-popup .popup-close-btn:hover {
            background: #eef3fb !important;
        }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .export-btn-download,
        #dc-backup-popup .import-btn {
            min-height: 40px !important;
            border-radius: 8px !important;
            font-weight: 700 !important;
            transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease !important;
        }
        #dc-backup-popup .export-btn {
            background: #3b71fd !important;
            border: 1px solid #3b71fd !important;
            color: #fff !important;
        }
        #dc-backup-popup .export-btn:hover {
            background: #2f63ea !important;
            border-color: #2f63ea !important;
        }
        #dc-backup-popup .export-btn-download {
            background: #eef4ff !important;
            border: 1px solid #c8d8ff !important;
            color: #315fc2 !important;
        }
        #dc-backup-popup .export-btn-download:hover {
            background: #e2edff !important;
            border-color: #b4cbff !important;
        }
        #dc-backup-popup .import-btn {
            background: #3b71fd !important;
            border: 1px solid #3b71fd !important;
            color: #fff !important;
            box-shadow: 0 6px 16px rgba(59, 113, 253, 0.22) !important;
        }
        #dc-backup-popup .import-btn:hover {
            background: #2f63ea !important;
            border-color: #2f63ea !important;
        }
        #dc-backup-popup .import-file-input,
        #dc-backup-popup textarea {
            border: 1px solid #d2dae8 !important;
            border-radius: 8px !important;
            background: #fff !important;
        }

        #dcinside-filter-setting,
        #dc-backup-popup,
        #dc-block-management-panel {
            touch-action: pan-x pan-y !important;
        }

        #dcinside-filter-setting,
        #dc-backup-popup {
            overflow: hidden !important;
            resize: both !important;
        }
        #dcinside-filter-setting {
            min-height: 360px !important;
        }
        #dc-backup-popup {
            min-height: 320px !important;
        }

        #dcinside-filter-setting .dcuf-settings-body {
            max-height: calc(92vh - 156px) !important;
            overflow-y: auto !important;
            padding-right: 2px !important;
        }

        #dc-backup-popup .popup-content {
            max-height: calc(92vh - 96px) !important;
            overflow-y: auto !important;
            padding-right: 2px !important;
        }


        #dc-selection-popup {
            min-width: 360px !important;
            max-width: min(92vw, 520px) !important;
            padding: 18px !important;
        }
        #dc-selection-popup .block-option {
            border: 1px solid #e4e9f3 !important;
            background: #f8fbff !important;
            border-radius: 9px !important;
        }

        #dc-block-management-panel-overlay,
        #dc-backup-popup-overlay {
            backdrop-filter: blur(2px);
        }

        @keyframes dcuf-popup-center-in {
            from { opacity: 0; transform: translate(-50%, -48%) scale(0.985); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes dcuf-popup-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes dcuf-popup-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes dcuf-overlay-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        #dcinside-filter-setting.dcuf-pop-leave,
        #dc-selection-popup.dcuf-pop-leave,
        #dc-backup-popup.dcuf-pop-leave,
        #dc-block-management-panel.dcuf-pop-leave {
            animation: dcuf-popup-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }
        #dc-block-management-panel-overlay.dcuf-overlay-leave,
        #dc-backup-popup-overlay.dcuf-overlay-leave {
            animation: dcuf-overlay-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }

        @media (max-width: 640px) {
            #dcinside-filter-setting { min-width: auto !important; width: min(96vw, 640px) !important; }
            #dcinside-filter-setting #dcinside-ratio-section > div:first-child {
                grid-template-columns: 1fr !important;
            }
            #dc-block-management-panel { min-width: min(96vw, 520px) !important; }
            #dc-backup-popup { min-width: auto !important; width: min(96vw, 560px) !important; }
        }

        @media (prefers-reduced-motion: reduce) {
            #dcinside-filter-setting,
            #dc-selection-popup,
            #dc-backup-popup,
            #dc-block-management-panel,
            #dcinside-filter-setting.dcuf-pop-leave,
            #dc-selection-popup.dcuf-pop-leave,
            #dc-backup-popup.dcuf-pop-leave,
            #dc-block-management-panel.dcuf-pop-leave,
            #dc-block-management-panel-overlay.dcuf-overlay-leave,
            #dc-backup-popup-overlay.dcuf-overlay-leave {
                animation: none !important;
                transition: none !important;
            }
        }

        /* [v__VERSION__] Script-owned soft-depth control surfaces */
        #dc-personal-block-fab {
            background: linear-gradient(180deg, #fff 0%, #eef4ff 100%) !important;
            color: #29466f !important;
            border: 1px solid rgba(127,154,196,.46) !important;
            box-shadow: 0 14px 30px rgba(40,68,112,.2), 0 3px 8px rgba(40,68,112,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #fff 0%, #e7f0ff 100%) !important;
            border-color: rgba(86,124,185,.56) !important;
            box-shadow: 0 17px 34px rgba(40,68,112,.24), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-fab:active {
            transform: translateY(2px) scale(.98) !important;
            box-shadow: 0 7px 16px rgba(40,68,112,.17), inset 0 1px 3px rgba(40,68,112,.12) !important;
        }
        #dc-personal-block-drawer {
            width: 260px !important;
            min-width: 260px !important;
            max-height: min(440px, calc(100dvh - 24px)) !important;
            gap: 6px !important;
            padding: 9px !important;
            overflow-y: auto !important;
            border: 1px solid rgba(151,171,202,.5) !important;
            border-radius: 18px !important;
            background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(241,246,255,.98)) !important;
            box-shadow: 0 22px 48px rgba(35,55,91,.25), 0 6px 16px rgba(35,55,91,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-drawer button {
            display: grid !important;
            grid-template-columns: 36px minmax(0,1fr) !important;
            align-items: center !important;
            gap: 10px !important;
            min-height: 58px !important;
            padding: 8px 10px !important;
            border: 1px solid transparent !important;
            border-radius: 13px !important;
            white-space: normal !important;
            transition: transform .14s ease, background .14s ease, border-color .14s ease, box-shadow .14s ease !important;
        }
        #dc-personal-block-drawer button:hover,
        #dc-personal-block-drawer button:focus-visible {
            background: linear-gradient(180deg,#fff,#eaf2ff) !important;
            border-color: #cfddf2 !important;
            box-shadow: 0 7px 16px rgba(52,83,132,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-drawer button:active { transform: translateY(1px) !important; }
        #dc-personal-block-drawer .dcuf-menu-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border: 1px solid #cedbf0;
            border-radius: 11px;
            background: linear-gradient(145deg,#fff,#e6efff);
            color: #3b71fd;
            font-size: 19px;
            font-weight: 800;
            box-shadow: 0 5px 11px rgba(59,113,253,.13), inset 0 1px 0 #fff;
        }
        #dc-personal-block-drawer button > span:last-child { min-width: 0; }
        #dc-personal-block-drawer strong,
        #dc-personal-block-drawer small { display: block; }
        #dc-personal-block-drawer strong { color: #263b5a; font-size: 14px; line-height: 1.25; }
        #dc-personal-block-drawer small { margin-top: 3px; color: #71819a; font-size: 11px; font-weight: 500; line-height: 1.25; }

        #dc-manual-block-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(20,31,50,.48);
            backdrop-filter: blur(3px);
        }
        #dc-manual-block-panel {
            box-sizing: border-box;
            width: min(430px, calc(100vw - 32px));
            max-height: calc(100dvh - 32px);
            overflow: hidden auto;
            border: 1px solid rgba(151,171,202,.56);
            border-radius: 22px;
            background: linear-gradient(155deg,#fff,#f3f7ff);
            color: #20334f;
            box-shadow: 0 28px 70px rgba(18,34,60,.32), 0 8px 24px rgba(18,34,60,.14), inset 0 1px 0 #fff;
            animation: dcuf-popup-fade-in .18s ease-out;
        }
        #dc-manual-block-panel .dcuf-manual-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 68px;
            padding: 14px 14px 13px 20px;
            border-bottom: 1px solid #dce5f3;
            background: linear-gradient(135deg,#eff5ff,#fff);
        }
        #dc-manual-block-panel .dcuf-manual-kicker,
        #dc-block-management-panel .panel-kicker {
            display: block;
            margin-bottom: 3px;
            color: #6684b4;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .14em;
        }
        #dc-manual-block-panel h3 { margin: 0; color: #1f3555; font-size: 20px; line-height: 1.15; }
        #dc-manual-block-panel .dcuf-manual-close,
        #dc-block-management-panel .panel-close-btn,
        #dc-backup-popup .popup-close-btn,
        #dcinside-filter-setting #dcinside-filter-close {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 44px !important;
            min-width: 44px !important;
            height: 44px !important;
            min-height: 44px !important;
            padding: 0 !important;
            border: 1px solid transparent !important;
            border-radius: 13px !important;
            background: transparent !important;
            color: #61728d !important;
            font-size: 23px !important;
            line-height: 1 !important;
        }
        #dc-manual-block-panel .dcuf-manual-close:hover,
        #dc-block-management-panel .panel-close-btn:hover,
        #dc-backup-popup .popup-close-btn:hover,
        #dcinside-filter-setting #dcinside-filter-close:hover {
            border-color: #d8e2f0 !important;
            background: #edf3fb !important;
            color: #29405f !important;
        }
        #dc-manual-block-panel .dcuf-manual-form { padding: 18px 20px 20px; }
        #dc-manual-block-panel .dcuf-manual-type-tabs {
            display: grid;
            grid-template-columns: repeat(3,1fr);
            gap: 4px;
            padding: 4px;
            border: 1px solid #d6e0ef;
            border-radius: 14px;
            background: #eaf0f8;
            box-shadow: inset 0 2px 5px rgba(48,72,111,.08);
        }
        #dc-manual-block-panel [data-manual-block-type] {
            min-height: 42px;
            padding: 8px 6px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: #65758d;
            font: 700 13px/1.2 inherit;
            cursor: pointer;
        }
        #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: #ccdaf0;
            background: linear-gradient(180deg,#fff,#edf4ff);
            color: #3265d2;
            box-shadow: 0 5px 12px rgba(46,81,139,.16), inset 0 1px 0 #fff;
        }
        #dc-manual-block-panel .dcuf-manual-field {
            display: grid;
            gap: 7px;
            margin-top: 17px;
            color: #314867;
            font-size: 13px;
            font-weight: 800;
        }
        #dc-manual-block-panel .dcuf-manual-field[hidden] { display: none !important; }
        #dc-manual-block-panel .dcuf-manual-field small { color: #8a98ac; font-weight: 500; }
        #dc-manual-block-panel .dcuf-manual-field input {
            box-sizing: border-box;
            width: 100%;
            min-height: 48px;
            padding: 11px 13px;
            border: 1px solid #cad7e9;
            border-radius: 12px;
            outline: 0;
            background: #fff;
            color: #1d2f49;
            font: 600 15px/1.3 inherit;
            box-shadow: inset 0 2px 5px rgba(37,60,96,.08), 0 1px 0 #fff;
        }
        #dc-manual-block-panel .dcuf-manual-field input:focus {
            border-color: #7199f5;
            box-shadow: 0 0 0 3px rgba(59,113,253,.15), inset 0 1px 3px rgba(37,60,96,.08);
        }
        #dc-manual-block-panel .dcuf-manual-hint {
            min-height: 34px;
            margin: 10px 2px 0;
            color: #6d7d94;
            font-size: 12px;
            line-height: 1.45;
        }
        #dc-manual-block-panel .dcuf-manual-status {
            min-height: 20px;
            margin: 4px 2px 0;
            color: #65758d;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.4;
        }
        #dc-manual-block-panel .dcuf-manual-status[data-state="success"] { color: #16835f; }
        #dc-manual-block-panel .dcuf-manual-status[data-state="error"] { color: #d7485a; }
        #dc-manual-block-panel .dcuf-manual-status[data-state="info"] { color: #3b68c6; }
        #dc-manual-block-panel .dcuf-manual-actions {
            display: grid;
            grid-template-columns: .75fr 1.25fr;
            gap: 9px;
            margin-top: 10px;
        }
        #dc-manual-block-panel .dcuf-manual-actions button {
            min-height: 46px;
            border: 1px solid #ccd8e8;
            border-radius: 12px;
            background: linear-gradient(180deg,#fff,#edf2f8);
            color: #53657e;
            font: 800 14px/1 inherit;
            box-shadow: 0 5px 12px rgba(35,56,89,.1), inset 0 1px 0 #fff;
            cursor: pointer;
        }
        #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"] {
            border-color: #3b71fd;
            background: linear-gradient(180deg,#5687ff,#376af0);
            color: #fff;
            box-shadow: 0 9px 18px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.34);
        }
        #dc-manual-block-panel .dcuf-manual-actions button:active { transform: translateY(1px); }
        #dc-manual-block-panel .dcuf-manual-actions button:disabled { opacity: .65; cursor: wait; }


        @keyframes dcuf-selection-prompt-in {
            from { opacity: 0; transform: translate(-50%,-8px) scale(.98); }
            to { opacity: 1; transform: translate(-50%,0) scale(1); }
        }
        #dc-selection-popup.dcuf-selection-prompt {
            top: calc(env(safe-area-inset-top,0px) + 14px) !important;
            left: 50% !important;
            bottom: auto !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 42px minmax(0,1fr) auto !important;
            align-items: center !important;
            gap: 11px !important;
            width: min(560px,calc(100vw - 24px)) !important;
            min-width: 0 !important;
            max-width: calc(100vw - 24px) !important;
            padding: 11px 12px !important;
            border: 1px solid rgba(142,166,203,.58) !important;
            border-radius: 18px !important;
            transform: translateX(-50%) !important;
            text-align: left !important;
            background: linear-gradient(145deg,rgba(255,255,255,.98),rgba(237,244,255,.98)) !important;
            box-shadow: 0 18px 40px rgba(31,51,83,.25), inset 0 1px 0 #fff !important;
            animation: dcuf-selection-prompt-in .18s ease-out !important;
        }
        #dc-selection-popup .dcuf-selection-prompt-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 13px;
            background: linear-gradient(145deg,#fff,#dfeaff);
            color: #3b71fd;
            font-size: 21px;
            font-weight: 900;
            box-shadow: 0 6px 14px rgba(59,113,253,.18), inset 0 1px 0 #fff;
        }
        #dc-selection-popup .dcuf-selection-prompt-copy h4 {
            margin: 0 0 3px !important;
            color: #233a5b !important;
            font-size: 15px !important;
            font-weight: 850 !important;
        }
        #dc-selection-popup .dcuf-selection-prompt-copy p {
            margin: 0;
            color: #71819a;
            font-size: 12px;
            line-height: 1.35;
        }
        #dc-selection-popup.dcuf-selection-prompt .popup-buttons button {
            width: auto !important;
            min-width: 86px;
            min-height: 42px;
            padding: 9px 12px !important;
            border: 1px solid #cfdaea !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg,#fff,#e9eff7) !important;
            color: #50627d !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            box-shadow: 0 5px 12px rgba(41,62,96,.1), inset 0 1px 0 #fff;
        }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            border-radius: 6px !important;
            outline: 2px solid rgba(59,113,253,.44) !important;
            outline-offset: 2px !important;
            background: rgba(59,113,253,.08) !important;
        }
        #dc-selection-popup:not(.dcuf-selection-prompt) {
            border: 1px solid #d1dceb !important;
            border-radius: 20px !important;
            background: linear-gradient(150deg,#fff,#f3f7fd) !important;
            box-shadow: 0 24px 58px rgba(24,42,71,.3), inset 0 1px 0 #fff !important;
        }
        #dc-selection-popup .block-option {
            border-radius: 13px !important;
            background: linear-gradient(145deg,#fff,#eef4fc) !important;
            box-shadow: 0 6px 15px rgba(38,60,96,.09), inset 0 1px 0 #fff !important;
        }
        #dc-selection-popup .block-option button,
        #dc-selection-popup .popup-buttons button { min-height: 42px; }

        #dcinside-filter-setting,
        #dc-block-management-panel,
        #dc-backup-popup {
            border: 1px solid rgba(149,169,201,.55) !important;
            border-radius: 22px !important;
            background: linear-gradient(155deg,#fff,#f4f7fc) !important;
            box-shadow: 0 28px 68px rgba(23,39,67,.3), 0 7px 20px rgba(23,39,67,.13), inset 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting .dcuf-settings-header,
        #dc-block-management-panel .panel-header,
        #dc-backup-popup .popup-header {
            background: linear-gradient(135deg,rgba(238,244,255,.98),rgba(255,255,255,.98)) !important;
            border-bottom: 1px solid #dbe4f1 !important;
        }
        #dcinside-filter-setting .dcuf-settings-section,
        #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        #dcinside-filter-setting .dcuf-settings-guest-controls {
            border: 1px solid #dce5f1 !important;
            border-radius: 16px !important;
            background: linear-gradient(145deg,#fff,#f3f7fd) !important;
            box-shadow: 0 8px 20px rgba(36,58,94,.09), inset 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting input[type="number"] {
            min-height: 44px !important;
            border-radius: 11px !important;
            box-shadow: inset 0 2px 5px rgba(37,60,96,.09), 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting #dcinside-threshold-save {
            min-height: 46px !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 9px 18px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.32) !important;
        }

        #dc-block-management-panel .panel-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            min-height: 68px !important;
            padding: 10px 12px 10px 18px !important;
            cursor: move;
        }
        #dc-block-management-panel .panel-title-group { min-width: 0; }
        #dc-block-management-panel .panel-title-group h3 { color: #213756 !important; font-size: 18px !important; }
        #dc-block-management-panel .panel-header-actions { display: flex; align-items: center; gap: 7px; }
        #dc-block-management-panel .switch-container { margin-left: 0 !important; }
        #dc-block-management-panel .panel-add-btn {
            min-height: 40px;
            padding: 8px 11px;
            border: 1px solid #cbdaf0;
            border-radius: 11px;
            background: linear-gradient(180deg,#fff,#e8f1ff);
            color: #3564c4;
            font-size: 12px;
            font-weight: 850;
            box-shadow: 0 6px 13px rgba(47,78,128,.12), inset 0 1px 0 #fff;
            cursor: pointer;
        }
        #dc-block-management-panel .panel-tabs {
            gap: 5px !important;
            padding: 7px !important;
            border-bottom: 1px solid #dce4f0 !important;
            background: #edf2f8 !important;
            box-shadow: inset 0 2px 5px rgba(38,59,91,.06);
        }
        #dc-block-management-panel .panel-tab {
            appearance: none;
            border: 1px solid transparent !important;
            border-radius: 11px !important;
            background: transparent !important;
            color: #65758d !important;
            font-family: inherit;
            font-weight: 750 !important;
        }
        #dc-block-management-panel .panel-tab.active {
            border-color: #ccdaf0 !important;
            background: linear-gradient(180deg,#fff,#e8f1ff) !important;
            color: #315fc2 !important;
            box-shadow: 0 6px 14px rgba(45,74,121,.15), inset 0 1px 0 #fff !important;
        }
        #dc-block-management-panel .panel-tab.active::after { display: none !important; }
        #dc-block-management-panel .panel-tab-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            margin-left: 4px;
            padding: 0 5px;
            border-radius: 999px;
            background: rgba(74,111,182,.12);
            font-size: 10px;
            font-weight: 900;
        }
        #dc-block-management-panel .panel-body { background: #f5f8fc !important; }
        #dc-block-management-panel .panel-list-controls {
            display: grid !important;
            grid-template-columns: minmax(150px,1fr) auto !important;
            align-items: center;
            gap: 8px;
            padding: 10px !important;
            text-align: left !important;
            background: rgba(255,255,255,.72);
        }
        #dc-block-management-panel .panel-search {
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: 7px;
            min-height: 42px;
            padding: 0 11px;
            border: 1px solid #d0dbea;
            border-radius: 11px;
            background: #fff;
            color: #71819a;
            box-shadow: inset 0 2px 5px rgba(35,56,88,.07);
        }
        #dc-block-management-panel .panel-search-input {
            min-width: 0;
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #263a58;
            font: 600 13px/1.2 inherit;
        }
        #dc-block-management-panel .panel-list-summary {
            grid-column: 1 / -1;
            color: #7a899e;
            font-size: 11px;
        }


        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn {
            min-height: 40px !important;
            border-radius: 10px !important;
            background: linear-gradient(180deg,#fff,#edf2f8) !important;
            box-shadow: 0 5px 12px rgba(35,56,89,.09), inset 0 1px 0 #fff !important;
        }
        #dc-block-management-panel .blocked-list {
            display: grid;
            gap: 8px;
            padding: 10px !important;
        }
        #dc-block-management-panel .blocked-item {
            min-height: 52px;
            padding: 8px 9px 8px 13px !important;
            border: 1px solid #dce5f1 !important;
            border-radius: 13px !important;
            background: linear-gradient(145deg,#fff,#f0f5fb) !important;
            box-shadow: 0 6px 15px rgba(34,55,88,.08), inset 0 1px 0 #fff;
        }
        #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #f1bdc5 !important;
            background: linear-gradient(145deg,#fff8f9,#fbecef) !important;
            text-decoration: none !important;
            opacity: .72 !important;
        }
        #dc-block-management-panel .blocked-item.item-to-delete .item-name { text-decoration: line-through; }
        #dc-block-management-panel .delete-item-btn {
            min-width: 52px !important;
            min-height: 36px !important;
            padding: 7px 9px !important;
            border: 1px solid #ffd3da !important;
            border-radius: 10px !important;
            background: linear-gradient(180deg,#fff8f9,#ffe9ed) !important;
            color: #df5366 !important;
            font-size: 11px !important;
            font-weight: 850 !important;
            text-decoration: none !important;
        }
        #dc-block-management-panel .blocked-list-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 150px;
            color: #8290a4;
            font-size: 13px;
            text-align: center;
        }
        #dc-block-management-panel .panel-footer {
            min-height: 64px;
            background: linear-gradient(180deg,rgba(250,252,255,.98),rgba(239,244,251,.98)) !important;
        }
        #dc-block-management-panel .panel-save-btn {
            min-height: 44px;
            border-radius: 11px !important;
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 8px 17px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.32) !important;
        }
        #dc-backup-popup .popup-content { gap: 12px !important; padding: 4px 2px 2px !important; }
        #dc-backup-popup .export-section,
        #dc-backup-popup .import-section {
            padding: 14px !important;
            border: 1px solid #dce5f1;
            border-radius: 16px;
            background: linear-gradient(145deg,#fff,#f2f6fc);
            box-shadow: 0 8px 20px rgba(36,58,94,.09), inset 0 1px 0 #fff;
        }
        #dc-backup-popup .popup-content > hr { display: none; }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .export-btn-download,
        #dc-backup-popup .import-btn,
        #dc-backup-popup .import-file-input,
        #dc-backup-popup textarea {
            min-height: 44px;
            border-radius: 11px !important;
        }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .import-btn {
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 8px 17px rgba(59,113,253,.25), inset 0 1px 0 rgba(255,255,255,.3) !important;
        }
        #dc-manual-block-panel.dcuf-pop-leave {
            animation: dcuf-popup-out .13s ease-in forwards !important;
            pointer-events: none !important;
        }
        #dc-manual-block-overlay.dcuf-overlay-leave {
            animation: dcuf-overlay-out .13s ease-in forwards !important;
            pointer-events: none !important;
        }
        @media (max-width: 640px) {
            #dc-manual-block-overlay {
                align-items: flex-end;
                padding: 10px 8px max(8px,env(safe-area-inset-bottom,0px));
            }
            #dc-manual-block-panel {
                width: 100%;
                max-height: calc(100dvh - 10px);
                border-radius: 22px 22px 16px 16px;
            }
            #dc-block-management-panel .panel-header { padding-left: 14px !important; }
            #dc-block-management-panel .panel-kicker { display: none; }
            #dc-block-management-panel .panel-add-btn {
                width: 44px;
                min-width: 44px;
                padding: 0;
                overflow: hidden;
                color: transparent;
                white-space: nowrap;
            }
            #dc-block-management-panel .panel-add-btn::first-letter {
                color: #3564c4;
                font-size: 18px;
            }
            #dc-block-management-panel .panel-list-controls { grid-template-columns: 1fr !important; }
            #dc-block-management-panel .panel-list-summary { grid-column: 1; }
            #dc-selection-popup.dcuf-selection-prompt { grid-template-columns: 38px minmax(0,1fr) !important; }
            #dc-selection-popup.dcuf-selection-prompt .popup-buttons { grid-column: 1 / -1; }
            #dc-selection-popup.dcuf-selection-prompt .popup-buttons button { width: 100% !important; }
        }
        @media (prefers-reduced-motion: reduce) {
            #dc-manual-block-panel,
            #dc-manual-block-overlay,
            #dc-selection-popup.dcuf-selection-prompt {
                animation: none !important;
                transition: none !important;
            }
        }


        #dc-personal-block-drawer { background-color: #f1f6ff !important; }
        #dc-manual-block-panel { background-color: #f3f7ff; }
        #dc-selection-popup.dcuf-selection-prompt { background-color: #edf4ff !important; }
        #dc-selection-popup:not(.dcuf-selection-prompt) { background-color: #f3f7fd !important; }
        #dcinside-filter-setting,
        #dc-block-management-panel,
        #dc-backup-popup { background-color: #f4f7fc !important; }

        /* DCUF_SHARED_FILTER_UI_END */

        /* [수정] DCCon 및 각종 팝업 모바일 반응형 중앙 정렬 */
         /* --- [최종 진짜 수정 v9] 야간 모드 완벽 지원 (색상 반전 대응) --- */

        /* 1. 전역 및 기본 레이웃 다크 테마 */
        body.dc-filter-dark-mode,
        body.dc-filter-dark-mode #container,
        body.dc-filter-dark-mode .gall_content,
        body.dc-filter-dark-mode .gall_comment {
            background: #121212 !important;
            color: #e0e0e0 !important;
        }

        body.dc-filter-dark-mode .dcheader.typea,
        body.dc-filter-dark-mode .minor_intro_area,
        body.dc-filter-dark-mode .newvisit_history {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }

        body.dc-filter-dark-mode .newvisit_history > .tit {
            color: #e0e0e0 !important;
        }

        /* 2. 커스텀 게시글 목록 다크 테마 */
        body.dc-filter-dark-mode .custom-mobile-list {
            background: #1c1c1e !important;
            border-top-color: #3a3a3c !important;
        }
        body.dc-filter-dark-mode .custom-post-item {
            color: #e0e0e0 !important;
            border-bottom-color: #3a3a3c !important;
        }
        body.dc-filter-dark-mode .custom-post-item:hover {
            background-color: #2a2a2a !important;
        }
        body.dc-filter-dark-mode .custom-post-item.notice,
        body.dc-filter-dark-mode .custom-post-item.concept {
            background-color: #252525 !important;
        }
        body.dc-filter-dark-mode .post-title {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode .post-title a:visited {
            color: #a9a9a9 !important; /* 방문한 링크 색상 */
        }
        body.dc-filter-dark-mode .post-meta .author .nickname,
        body.dc-filter-dark-mode .post-meta .author .ip {
            color: #b0b0b0 !important;
        }
        body.dc-filter-dark-mode .post-meta,
        body.dc-filter-dark-mode .post-meta .stats {
            color: #888 !important;
        }

        /* 3. 글 본문 및 댓글 다크 테마 */
        body.dc-filter-dark-mode .gall_tit_box,
        body.dc-filter-dark-mode .gall_writer_info,
        body.dc-filter-dark-mode .btn_recommend_box,
        body.dc-filter-dark-mode .view_bottom {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }

        /* [v3.0 alpha] 본문 글자색은 실제 다크 팔레트로 직접 덮어씁니다. */
        body.dc-filter-dark-mode .gallview_contents,
        body.dc-filter-dark-mode .gallview_contents p,
        body.dc-filter-dark-mode .gallview_contents span,
        body.dc-filter-dark-mode .gallview_contents div,
        body.dc-filter-dark-mode .gallview_contents *,
        body.dc-filter-dark-mode .writing_view_box,
        body.dc-filter-dark-mode .writing_view_box *,
        body.dc-filter-dark-mode .write_div,
        body.dc-filter-dark-mode .write_div *,
        body.dc-filter-dark-mode .write_div [data-scaled-by-filter],
        body.dc-filter-dark-mode .write_div [data-scaled-by-filter] * {
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
        }

        /* 댓글은 반전 필터의 영향을 받지 않으므로 그대로 밝은 색 설정 */
        body.dc-filter-dark-mode .comment_box .usertxt {
            color: #e0e0e0 !important;
        }

        body.dc-filter-dark-mode .btn_recommend_box .inner_box > .inner {
            background-color: #2a2a2a !important;
            border-color: #444 !important;
        }
        body.dc-filter-dark-mode .btn_recommend_box .up_num,
        body.dc-filter-dark-mode .btn_recommend_box .down_num {
            color: #e0e0e0 !important;
        }

        /* 4. 하단 컨트롤 및 검색창 다크 테마 */
        body.dc-filter-dark-mode .custom-bottom-controls,
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] select {
            background: #1c1c1e !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            background: #333 !important;
            color: #fff !important;
            border-color: #555 !important;
        }

        /* DCUF_SHARED_FILTER_UI_DARK_START */
        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg, #3b414b 0%, #303640 100%) !important;
            color: #e9eef6 !important;
            border-color: #596474 !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #464d58 0%, #373e49 100%) !important;
            border-color: #6c788a !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer {
            background: #2d323a !important;
            border-color: #596474 !important;
            box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer button {
            background: transparent !important;
            color: #e2e8f0 !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer button:hover,
        body.dc-filter-dark-mode #dc-personal-block-drawer button:focus-visible {
            background: #414956 !important;
            color: #fff !important;
        }
        /* DCUF_FAB_SHELL_DARK_END */
        body.dc-filter-dark-mode #dc-personal-block-size-overlay {
            background: rgba(0, 0, 0, 0.62) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel {
            background: #2d323a !important;
            color: #e2e8f0 !important;
            border-color: #596474 !important;
            box-shadow: 0 20px 52px rgba(0, 0, 0, 0.58) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-description,
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-bounds {
            color: #aeb9c8 !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-value {
            color: #f2f6fb !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-actions button {
            background: #4a5360 !important;
            color: #fff !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-actions [data-dcuf-fab-size-action="save"] {
            background: var(--dcuf-theme-accent, #4d7cff) !important;
        }

        /* 5. 스크립트 팝업창 전체 다크 테마 */
        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel,
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup,
        body.dc-filter-dark-mode #dcinside-shortcut-modal {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
            border-color: #555 !important;
            box-shadow: 0 0 15px rgba(0,0,0,0.7) !important;
        }
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel input,
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel button {
            background:#343a44 !important;
            color:#e6edf7 !important;
            border-color:#596474 !important;
        }

        /* 팝업 내부 요소들 */
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs {
            background: #252525 !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-header,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-footer,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer {
            background: transparent !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting hr,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body,
        body.dc-filter-dark-mode #dc-selection-popup .block-option {
            background: #3a3a3c !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting div,
        body.dc-filter-dark-mode #dcinside-filter-setting label,
        body.dc-filter-dark-mode #dcinside-filter-setting h3,
        body.dc-filter-dark-mode #dc-selection-popup h4,
        body.dc-filter-dark-mode #dc-selection-popup .block-option span,
        body.dc-filter-dark-mode #dc-backup-popup .description,
        body.dc-filter-dark-mode #dc-backup-popup h4,
        body.dc-filter-dark-mode #dc-block-management-panel .item-name {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting input[type="number"],
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background-color: #1e1e1e !important;
            color: #f0f0f0 !important;
            border: 1px solid #666 !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            background: #007bff !important; /* 활성 탭은 색상 유지 */
        }

        /* 버튼 배경 문제 해결 (필요한 버튼만 개별 적용) */
        body.dc-filter-dark-mode #dcinside-filter-setting button,
        body.dc-filter-dark-mode #dc-selection-popup button,
        body.dc-filter-dark-mode #dc-block-management-panel button,
        body.dc-filter-dark-mode #dc-backup-popup button,
        body.dc-filter-dark-mode #dcinside-shortcut-modal button {
             background-color: #555 !important;
             color: #fff !important;
             border-color: #777 !important;
        }

        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-backup-popup,
        body.dc-filter-dark-mode #dc-block-management-panel {
            border-color: #445066 !important;
            box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-section,
        body.dc-filter-dark-mode #dc-selection-popup .block-option {
            background: #323845 !important;
            border-color: #434f66 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls {
            background: #2b313d !important;
            border-color: #47556f !important;
            box-shadow: none !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls [style*="border-bottom"] {
            border-bottom-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls [style*="color:#666"],
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls .dcuf-proxy-mode-desc {
            color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group {
            background: #252b36 !important;
            border-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode] {
            background: transparent !important;
            color: #dbe6f5 !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"] {
            background: #3b71fd !important;
            color: #fff !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-threshold-input,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-min,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-max,
        body.dc-filter-dark-mode #dc-backup-popup .import-file-input,
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background: #252b36 !important;
            border-color: #47556f !important;
            color: #eef3ff !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            background: #253556 !important;
            color: #8db2ff !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item:hover {
            background: #2f394b !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .delete-item-btn {
            background: #53313a !important;
            color: #ff9fb1 !important;
        }

        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg,#34435b,#253247) !important;
            color: #eef4ff !important;
            border-color: #52657f !important;
            box-shadow: 0 16px 34px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.1) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer {
            border-color: #465a76 !important;
            background: linear-gradient(145deg,#27354a,#1d293b) !important;
            box-shadow: 0 24px 52px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer .dcuf-menu-icon {
            border-color: #49617f;
            background: linear-gradient(145deg,#344760,#25354c);
            color: #8db2ff;
            box-shadow: 0 6px 14px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer strong { color: #edf3ff; }
        body.dc-filter-dark-mode #dc-personal-block-drawer small { color: #9fb0c8; }
        body.dc-filter-dark-mode #dc-personal-block-drawer button:hover,
        body.dc-filter-dark-mode #dc-personal-block-drawer button:focus-visible {
            border-color: #506987 !important;
            background: linear-gradient(180deg,#34465e,#29394f) !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-overlay { background: rgba(0,0,0,.68); }
        body.dc-filter-dark-mode #dc-manual-block-panel {
            border-color: #475a74;
            background: linear-gradient(155deg,#26354a,#1c283a);
            color: #edf3ff;
            box-shadow: 0 30px 74px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-header {
            border-color: #40536d;
            background: linear-gradient(135deg,#2b3b52,#223047);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel h3 { color: #f1f5ff; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-kicker,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-kicker { color: #89a9dd; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-close,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-close-btn,
        body.dc-filter-dark-mode #dc-backup-popup .popup-close-btn,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-filter-close {
            background: transparent !important;
            color: #b8c6da !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-close:hover,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-close-btn:hover,
        body.dc-filter-dark-mode #dc-backup-popup .popup-close-btn:hover,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-filter-close:hover {
            border-color: #4a5e79 !important;
            background: #314159 !important;
            color: #fff !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: #40536d;
            background: #172335;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.32);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel [data-manual-block-type] {
            background: transparent !important;
            color: #aab8ca !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field { color: #dce6f5; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field small,
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-hint { color: #9dadc2; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field input {
            border-color: #465a76;
            background: #162234;
            color: #f2f6ff;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-actions button {
            border-color: #465a76;
            background: linear-gradient(180deg,#34445b,#29384e);
            color: #dce6f5;
            box-shadow: 0 6px 14px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"] {
            border-color: #5e8cff;
            background: linear-gradient(180deg,#5f8dff,#3d6de7);
            color: #fff;
        }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt,
        body.dc-filter-dark-mode #dc-selection-popup:not(.dcuf-selection-prompt) {
            border-color: #465a76 !important;
            background: linear-gradient(145deg,#29384e,#1d2a3d) !important;
            box-shadow: 0 22px 52px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-icon {
            background: linear-gradient(145deg,#344862,#26374f);
            color: #8db2ff;
            box-shadow: 0 7px 15px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-copy h4 { color: #edf3ff !important; }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-copy p { color: #9fb0c8; }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt .popup-buttons button {
            border-color: #4b607c !important;
            background: linear-gradient(180deg,#34445b,#28384e) !important;
            color: #dce6f5 !important;
            box-shadow: 0 6px 13px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode.selection-mode-active .gall_writer,
        body.dc-filter-dark-mode.selection-mode-active .ub-writer {
            outline-color: rgba(117,159,255,.66) !important;
            background: rgba(92,137,241,.16) !important;
        }


        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup {
            border-color: #455a76 !important;
            background: linear-gradient(155deg,#26354a,#1b2738) !important;
            box-shadow: 0 30px 72px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header {
            border-color: #40536d !important;
            background: linear-gradient(135deg,#2b3b52,#223047) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-section,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls,
        body.dc-filter-dark-mode #dc-backup-popup .export-section,
        body.dc-filter-dark-mode #dc-backup-popup .import-section {
            border-color: #40536d !important;
            background: linear-gradient(145deg,#29394f,#202e43) !important;
            box-shadow: 0 9px 21px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.06) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-title-group h3 { color: #edf3ff !important; }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-add-btn {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.27), inset 0 1px 0 rgba(255,255,255,.07);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs {
            border-color: #3e5069 !important;
            background: #172335 !important;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.3);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            background: transparent !important;
            color: #aab8ca !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body { background: #1b2738 !important; }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-list-controls {
            border-color: #40536d !important;
            background: rgba(28,40,58,.84);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-search {
            border-color: #455a76;
            background: #162234;
            color: #9dadc2;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.34);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-search-input { color: #edf3ff; }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item {
            border-color: #40536d !important;
            background: linear-gradient(145deg,#29394f,#202e43) !important;
            box-shadow: 0 7px 16px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #714856 !important;
            background: linear-gradient(145deg,#3d2b35,#34232c) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .delete-item-btn {
            border-color: #704653 !important;
            background: linear-gradient(180deg,#4d303a,#402731) !important;
            color: #ff9cad !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-global-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-backup-btn {
            border-color: #465a76 !important;
            background: linear-gradient(180deg,#34445b,#29384e) !important;
            color: #dce6f5 !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer {
            border-color: #40536d !important;
            background: linear-gradient(180deg,#253449,#1d2a3d) !important;
        }


        body.dc-filter-dark-mode #dc-personal-block-drawer { background-color: #1d293b !important; }
        body.dc-filter-dark-mode #dc-manual-block-panel { background-color: #1c283a; }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt,
        body.dc-filter-dark-mode #dc-selection-popup:not(.dcuf-selection-prompt) { background-color: #1d2a3d !important; }
        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup { background-color: #1b2738 !important; }

        /* DCUF_SHARED_FILTER_UI_DARK_END */
    `;

    const __dcufCssMarkers = Object.freeze({
        view: '/* DCUF_VIEW_SURFACE_START */',
        ui: '/* DCUF_SHARED_FILTER_UI_START */',
        uiEnd: '/* DCUF_SHARED_FILTER_UI_END */',
        uiDark: '/* DCUF_SHARED_FILTER_UI_DARK_START */',
        uiDarkEnd: '/* DCUF_SHARED_FILTER_UI_DARK_END */',
        fabEnd: '/* DCUF_FAB_SHELL_END */',
        fabDarkEnd: '/* DCUF_FAB_SHELL_DARK_END */'
    });
    const __dcufCssIndex = (marker) => {
        const index = __dcufAllFilterCss.indexOf(marker);
        if (index < 0) throw new Error(`DCUF CSS marker missing: ${marker}`);
        return index;
    };
    const __dcufViewCssIndex = __dcufCssIndex(__dcufCssMarkers.view);
    const __dcufUiCssIndex = __dcufCssIndex(__dcufCssMarkers.ui);
    const __dcufUiCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiEnd) + __dcufCssMarkers.uiEnd.length;
    const __dcufUiDarkCssIndex = __dcufCssIndex(__dcufCssMarkers.uiDark);
    const __dcufUiDarkCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiDarkEnd) + __dcufCssMarkers.uiDarkEnd.length;
    const __dcufFabCssEndIndex = __dcufCssIndex(__dcufCssMarkers.fabEnd) + __dcufCssMarkers.fabEnd.length;
    const __dcufFabDarkCssEndIndex = __dcufCssIndex(__dcufCssMarkers.fabDarkEnd) + __dcufCssMarkers.fabDarkEnd.length;
    const __dcufCoreFilterCss = __dcufAllFilterCss.slice(0, __dcufViewCssIndex);
    const __dcufViewFilterCss = __dcufAllFilterCss.slice(__dcufViewCssIndex, __dcufUiCssIndex);
    const __dcufGlobalDarkCss = __dcufAllFilterCss.slice(__dcufUiCssEndIndex, __dcufUiDarkCssIndex);
    const __dcufLazyFilterUiCss = [
        __dcufAllFilterCss.slice(__dcufUiCssIndex, __dcufUiCssEndIndex),
        __dcufAllFilterCss.slice(__dcufUiDarkCssIndex, __dcufUiDarkCssEndIndex)
    ].join('\n');
    const __dcufFabShellCss = [
        __dcufAllFilterCss.slice(__dcufUiCssIndex, __dcufFabCssEndIndex),
        __dcufAllFilterCss.slice(__dcufUiDarkCssIndex, __dcufFabDarkCssEndIndex)
    ].join('\n');

    if (__dcufFilterPageContext.hasListSurface) {
        GM_addStyle(`${__dcufCoreFilterCss}\n${__dcufGlobalDarkCss}`);
        GM_addStyle(__dcufFabShellCss);
    }
    if (__dcufFilterPageContext.isView) GM_addStyle(__dcufViewFilterCss);

    let __dcufFilterUiStylesLoaded = false;
    const __dcufEnsureFilterUiStyles = () => {
        if (__dcufFilterUiStylesLoaded) return false;
        GM_addStyle(__dcufLazyFilterUiCss);
        __dcufFilterUiStylesLoaded = true;
        window.__dcufFilterUiStylesLoaded = true;
        window.__dcufDiagnostics?.increment?.('style.filterUi.lazyLoads');
        return true;
    };
    window.__dcufFilterUiStylesLoaded = false;
    window.__dcufEnsureFilterUiStyles = __dcufEnsureFilterUiStyles;


    if (__dcufFilterPageContext.hasListSurface) GM_addStyle(`
        /* [v2.7.5] 댓글/글목록 닉네임 폭 보정 */
        .post-meta {
            justify-content: flex-start !important;
            gap: 10px !important;
        }
        .post-meta .author {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            max-width: calc(100% - 120px) !important;
            justify-content: flex-start !important;
            overflow: visible !important;
        }
        .post-meta .author .gall_writer,
        .post-meta .author .addbox {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: auto !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
        }
        .post-meta .author .nickname {
            max-width: min(56vw, 420px) !important;
        }
        .post-meta .author .ip {
            flex: 0 0 auto !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
        }
        .post-meta .stats {
            flex: 0 0 auto !important;
            margin-left: auto !important;
        }

        div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        .gall_comment .comment_box .cmt_nickbox {
            display: inline-flex !important;
            align-items: center !important;
            flex: 1 1 auto !important;
            flex-wrap: nowrap !important;
            min-width: 0 !important;
            max-width: calc(100% - 84px) !important;
            width: auto !important;
            overflow: visible !important;
            white-space: nowrap !important;
        }
        div[id^="comment_wrap_"] .comment_box .gall_writer,
        div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer,
        .gall_comment .comment_box .gall_writer,
        .gall_comment .comment_box .gall_writer.ub-writer {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: auto !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .nickname,
        div[id^="comment_wrap_"] .comment_box .nickname em,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname em,
        .gall_comment .comment_box .nickname,
        .gall_comment .comment_box .nickname em {
            display: inline-block !important;
            max-width: min(52vw, 360px) !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .ip,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .ip,
        .gall_comment .comment_box .ip {
            display: inline-block !important;
            flex: 0 0 auto !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }

        @media screen and (max-width: 640px) {
            .post-meta .author {
                max-width: 100% !important;
            }
            .post-meta .author .nickname {
                max-width: min(72vw, 520px) !important;
            }
            div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
            .gall_comment .comment_box .cmt_nickbox {
                max-width: calc(100vw - 118px) !important;
            }
            div[id^="comment_wrap_"] .comment_box .nickname,
            div[id^="comment_wrap_"] .comment_box .nickname em,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname em,
            .gall_comment .comment_box .nickname,
            .gall_comment .comment_box .nickname em {
                max-width: calc(100vw - 160px) !important;
            }
        }
    `);

    /**
     * =================================================================
     * ======================== Filter Module ==========================
     * =================================================================
     */
    const FilterModule = {
        TELECOM: [
            [1, [[96, "KT모바일", "MOB"], [97, "KT모바일", "MOB"], [98, "KT모바일", "MOB"], [99, "KT모바일", "MOB"], [100, "KT모바일", "MOB"], [101, "KT모바일", "MOB"], [102, "KT모바일", "MOB"], [103, "KT모바일", "MOB"], [104, "KT모바일", "MOB"], [105, "KT모바일", "MOB"], [106, "KT모바일", "MOB"], [107, "KT모바일", "MOB"], [108, "KT모바일", "MOB"], [109, "KT모바일", "MOB"], [110, "KT모바일", "MOB"], [111, "KT모바일", "MOB"]]],
            [27, [[160, "SKT", "MOB"], [161, "SKT", "MOB"], [162, "SKT", "MOB"], [163, "SKT", "MOB"], [164, "SKT", "MOB"], [165, "SKT", "MOB"], [166, "SKT", "MOB"], [167, "SKT", "MOB"], [168, "SKT", "MOB"], [169, "SKT", "MOB"], [170, "SKT", "MOB"], [171, "SKT", "MOB"], [172, "SKT", "MOB"], [173, "SKT", "MOB"], [174, "SKT", "MOB"], [175, "SKT", "MOB"], [176, "SKT", "MOB"], [177, "SKT", "MOB"], [178, "SKT", "MOB"], [179, "SKT", "MOB"], [180, "SKT", "MOB"], [181, "SKT", "MOB"], [182, "SKT", "MOB"], [183, "SKT", "MOB"]]],
            [39, [[4, "KT모바일", "MOB"], [5, "KT모바일", "MOB"], [6, "KT모바일", "MOB"], [7, "KT모바일", "MOB"]]],
            [42, [[16, "SKT", "MOB"], [17, "SKT", "MOB"], [18, "SKT", "MOB"], [19, "SKT", "MOB"], [20, "SKT", "MOB"], [21, "SKT", "MOB"], [22, "SKT", "MOB"], [23, "SKT", "MOB"], [24, "SKT", "MOB"], [25, "SKT", "MOB"], [26, "SKT", "MOB"], [27, "SKT", "MOB"], [28, "SKT", "MOB"], [29, "SKT", "MOB"], [30, "SKT", "MOB"], [31, "SKT", "MOB"], [32, "SKT", "MOB"], [33, "SKT", "MOB"], [34, "SKT", "MOB"], [35, "SKT", "MOB"], [36, "SKT", "MOB"], [37, "SKT", "MOB"], [38, "SKT", "MOB"], [39, "SKT", "MOB"], [40, "SKT", "MOB"], [41, "SKT", "MOB"], [42, "SKT", "MOB"], [43, "SKT", "MOB"], [44, "SKT", "MOB"], [45, "SKT", "MOB"], [46, "SKT", "MOB"], [47, "SKT", "MOB"]]],
            [49, [[16, "KT모바일", "MOB"], [17, "KT모바일", "MOB"], [18, "KT모바일", "MOB"], [19, "KT모바일", "MOB"], [20, "KT모바일", "MOB"], [21, "KT모바일", "MOB"], [22, "KT모바일", "MOB"], [23, "KT모바일", "MOB"], [24, "KT모바일", "MOB"], [25, "KT모바일", "MOB"], [26, "KT모바일", "MOB"], [27, "KT모바일", "MOB"], [28, "KT모바일", "MOB"], [29, "KT모바일", "MOB"], [30, "KT모바일", "MOB"], [31, "KT모바일", "MOB"], [56, "KT모바일", "MOB"], [57, "KT모바일", "MOB"], [58, "KT모바일", "MOB"], [59, "KT모바일", "MOB"], [60, "KT모바일", "MOB"], [61, "KT모바일", "MOB"], [62, "KT모바일", "MOB"], [63, "KT모바일", "MOB"]]],
            [58, [[102, "SKT", "MOB"], [103, "SKT", "MOB"]]],
            [61, [[104, "SKT", "MOB"], [250, "SKT/세종텔레콤/하이라인닷넷", "MOB"], [252, "KT모바일/SKB/딜라이브/엘엑스/세종텔레콤/한국정보화진흥원/한국인터넷진흥원/두루안/기타등등", "MOB"], [254, "SKB/SKT/기타등등", "MOB"]]],
            [106, [[96, "LGU+모바일", "MOB"], [97, "LGU+모바일", "MOB"], [98, "LGU+모바일", "MOB"], [99, "LGU+모바일", "MOB"], [100, "LGU+모바일", "MOB"], [101, "LGU+모바일", "MOB"], [102, "LGU+모바일", "MOB"], [103, "LGU+모바일", "MOB"]]],
            [110, [[68, "KT모바일", "MOB"], [69, "KT모바일", "MOB"], [70, "KT모바일", "MOB"], [71, "KT모바일", "MOB"]]],
            [111, [[218, "SKT", "MOB"], [219, "SKT", "MOB"]]],
            [113, [[216, "SKT", "MOB"], [217, "SKT", "MOB"]]],
            [114, [[52, "SKT", "MOB"], [53, "SKT", "MOB"]]],
            [116, [[200, "KT모바일", "MOB"], [201, "KT모바일", "MOB"]]],
            [117, [[110, "LGU+모바일", "MOB"], [111, "LGT+모바일", "MOB"]]],
            [118, [[234, "KT모바일", "MOB"], [235, "KT모바일", "MOB"]]],
            [119, [[194, "KT모바일", "MOB"]]],
            [123, [[228, "SKT", "MOB"], [229, "SKT", "MOB"]]],
            [124, [[0, "SKT", "MOB"], [1, "SKT", "MOB"]]],
            [163, [[213, "KT모바일", "MOB"], [222, "KT모바일", "MOB"], [229, "KT모바일", "MOB"], [255, "KT모바일", "MOB"]]],
            [175, [[216, "KT모바일", "MOB"], [217, "KT모바일", "MOB"], [218, "KT모바일", "MOB"], [219, "KT모바일", "MOB"], [220, "KT모바일", "MOB"], [221, "KT모바일", "MOB"], [222, "KT모바일", "MOB"], [223, "KT모바일", "MOB"]]],
            [180, [[132, "SKT", "MOB"], [133, "SKT", "MOB"], [134, "SKT", "MOB"], [135, "SKT", "MOB"], [210, "LGT+모바일/퍼플스톤즈/네이버클라우드/기타등등", "MOB"]]],
            [203, [[82, "LGT+모바일/하이플러스카드/한국케이블텔레콤/기타등등", "MOB"], [226, "SKT/SK컴즈/대림아이앤에스/두산중공업/두산정보통신사업부/기타등등", "MOB"], [236, "SKT/KT/KINX/세종텔레콤", "MOB"]]],
            [211, [[36, "LGT+모바일/딜라이브/세종텔레콤/엘림넷/삼성SDS/기타등등", "MOB"], [111, "SKT/아름방송네트워크/드림라인/KDDI코리아/브이토피아/세종텔레콤/지오레이넷/기타등등", "MOB"], [115, "SKB/SKT/반송종합유선방송/한국정보보호진흥원/KT/네오위즈게임즈/세종텔레콤/LGU+/기타등등", "MOB"], [188, "SKT/네트로피/네이버클라우드/NHN/누리링크시스템/기타등등", "MOB"], [234, "LGU+모바일/LGU+/SKT/SK커뮤니케이션즈/기타등등", "MOB"], [235, "SKT/남인천방송/유엘네트웍스/하이라인닷넷/기타등등", "MOB"], [240, "SKT/엘림넷/싸이크로스/기타등등", "MOB"], [246, "KT모바일/서경방송/기타등등", "MOB"]]],
            [220, [[103, "SKT", "MOB"]]],
            [223, [[32, "SKT", "MOB"], [33, "SKT", "MOB"], [34, "SKT", "MOB"], [35, "SKT", "MOB"], [36, "SKT", "MOB"], [37, "SKT", "MOB"], [38, "SKT", "MOB"], [39, "SKT", "MOB"], [40, "SKT", "MOB"], [41, "SKT", "MOB"], [42, "SKT", "MOB"], [43, "SKT", "MOB"], [44, "SKT", "MOB"], [45, "SKT", "MOB"], [46, "SKT", "MOB"], [47, "SKT", "MOB"], [48, "SKT", "MOB"], [49, "SKT", "MOB"], [50, "SKT", "MOB"], [51, "SKT", "MOB"], [52, "SKT", "MOB"], [53, "SKT", "MOB"], [54, "SKT", "MOB"], [55, "SKT", "MOB"], [56, "SKT", "MOB"], [57, "SKT", "MOB"], [58, "SKT", "MOB"], [59, "SKT", "MOB"], [60, "SKT", "MOB"], [61, "SKT", "MOB"], [62, "SKT", "MOB"], [63, "SKT", "MOB"], [168, "LGT+모바일", "MOB"], [169, "LGT+모바일", "MOB"], [170, "LGT+모바일", "MOB"], [171, "LGT+모바일", "MOB"], [172, "LGT+모바일", "MOB"], [173, "LGT+모바일", "MOB"], [174, "LGT+모바일", "MOB"], [175, "LGT+모바일", "MOB"]]]
        ],


        CONSTANTS: {
            STORAGE_KEYS: {
                MASTER_DISABLED: 'dcinside_master_disabled',
                EXCLUDE_RECOMMENDED: 'dcinside_exclude_recommended',
                THRESHOLD: 'dcinside_threshold',
                RATIO_ENABLED: 'dcinside_ratio_filter_enabled',
                RATIO_MIN: 'dcinside_ratio_min',
                RATIO_MAX: 'dcinside_ratio_max',
                BLOCK_GUEST: 'dcinside_block_guest',
                BLOCK_PROXY: 'dcinside_proxy_ip_block_enabled',
                BLOCK_TELECOM: 'dcinside_telecom_ip_block_enabled',
                BLOCK_CONFIG: 'dcinside_block_config',
                BLOCK_CONFIG_MIGRATION_V275_DONE: 'dcinside_block_config_migration_v275_done',
                BLOCK_CONFIG_MIGRATION_V275_BACKUP: 'dcinside_block_config_migration_v275_backup',
                BLOCKED_UIDS: 'dcinside_blocked_uids',
                BLOCKED_GUESTS: 'dcinside_blocked_guests',
                SHORTCUT_KEY: 'dcinside_shortcut_key',
                // [v2.3.1 추가] 개인 차단 기능용 저장 키
                PERSONAL_BLOCK_LIST: 'dcinside_personal_block_list',
                // [신규] 개인 차단 기능 On/Off 저장 키
                PERSONAL_BLOCK_ENABLED: 'dcinside_personal_block_enabled',
                FAB_POSITION: 'dcinside_fab_position',
                FAB_SCALE_PERCENT: 'dcinside_fab_scale_percent',
                MANAGEMENT_PANEL_GEOMETRY: 'dcinside_management_panel_geometry',
                GALLERY_HEADTEXT_BLOCKS: 'dcinside_gallery_headtext_blocks_v1',
            },
            SELECTORS: {
                POST_LIST_CONTAINER: 'table.gall_list tbody',
                COMMENT_CONTAINER: 'div.comment_box ul.cmt_list',
                POST_VIEW_LIST_CONTAINER: 'div.gall_exposure_list > ul',
                POST_ITEM: 'tr.ub-content',
                COMMENT_ITEM: 'li.ub-content, li[id^="comment_li_"], li[id^="reply_li_"]',
                WRITER_INFO: '.ub-writer',
                IP_SPAN: 'span.ip',
                MAIN_CONTAINER: '#container',
            },
            API: {
                USER_INFO: '/api/gallog_user_layer/gallog_content_reple/',
            },
            CUSTOM_ATTRS: {
                OBSERVER_ATTACHED: 'data-filter-observer-attached',
            },
            UI_IDS: {
                SETTINGS_PANEL: 'dcinside-filter-setting',
                MASTER_DISABLE_CHECKBOX: 'dcinside-master-disable-checkbox',
                EXCLUDE_RECOMMENDED_CHECKBOX: 'dcinside-exclude-recommended-checkbox',
                SETTINGS_CONTAINER: 'dcinside-settings-container',
                THRESHOLD_INPUT: 'dcinside-threshold-input',
                BLOCK_GUEST_CHECKBOX: 'dcinside-block-guest-checkbox',
                PROXY_BLOCK_MODE_GROUP: 'dcinside-proxy-ip-block-mode-group',
                TELECOM_BLOCK_CHECKBOX: 'dcinside-telecom-ip-block-checkbox',
                RATIO_ENABLE_CHECKBOX: 'dcinside-ratio-enable-checkbox',
                RATIO_SECTION: 'dcinside-ratio-section',
                RATIO_MIN_INPUT: 'dcinside-ratio-min',
                RATIO_MAX_INPUT: 'dcinside-ratio-max',
                SAVE_BUTTON: 'dcinside-threshold-save',
                CLOSE_BUTTON: 'dcinside-filter-close',
                SHORTCUT_DISPLAY: 'dcinside-shortcut-display',
                CHANGE_SHORTCUT_BTN: 'dcinside-change-shortcut-btn',
                SHORTCUT_MODAL_OVERLAY: 'dcinside-shortcut-modal-overlay',
                SHORTCUT_MODAL: 'dcinside-shortcut-modal',
                NEW_SHORTCUT_PREVIEW: 'dcinside-new-shortcut-preview',
                SAVE_SHORTCUT_BTN: 'dcinside-save-shortcut-btn',
                CANCEL_SHORTCUT_BTN: 'dcinside-cancel-shortcut-btn',
                HEADTEXT_MANAGER_BUTTON: 'dcinside-headtext-manager-button',
                HEADTEXT_MANAGER_PANEL: 'dcinside-headtext-manager-panel',
            },
            ETC: {
                MOBILE_IP_MARKER: 'mblck',
                COOKIE_NAME_1: 'ci_t',
                COOKIE_NAME_2: 'ci_c',
            }
        },
        BLOCK_UID_EXPIRE: 1000 * 60 * 60 * 24 * 7,
        BLOCKED_UIDS_CACHE: {},
        ASYNC_UID_REQUEST_CONCURRENCY: 4,
        INFLIGHT_USER_SUM_REQUESTS: Object.create(null),
        USER_SUM_NEGATIVE_CACHE: new Map(),
        USER_SUM_NEGATIVE_TTL: 30000,
        USER_SUM_NEGATIVE_MAX_ENTRIES: 256,
        _negativeUserSumCacheWrites: 0,
        DEBUG_ENABLED: false,
        DEBUG_MAX_DECISIONS_PER_PASS: 150,
        DEBUG_PASS_ID: 0,
        DEBUG_DECISION_LOG_COUNT: 0,
        DEBUG_DECISION_KEYS: null,
        _runtimeMutationUnsubscribe: null,
        _userSumTaskQueue: null,
        _blockedUidWritePromise: null,
        _blockedUidWriteTimerId: 0,
        _blockedUidDirtyGeneration: 0,
        _blockedUidPersistedGeneration: 0,
        _blockedUidDirtyUids: null,
        _blockedUidWriteWaiters: null,
        _blockedUidPagehideHandler: null,
        BLOCKED_UID_WRITE_DELAY: 120,
        _queuedObserverFilterItems: null,
        _queuedObserverFilterRafId: 0,
        _queuedObserverFilterTimerId: 0,
        _syncRefilterRafId: 0,
        _syncRefilterTimerIds: null,
        _settingsSignature: '',
        _hiddenAt: 0,
        _hiddenMutationGeneration: 0,
        _hiddenBody: null,
        _hiddenRecoverySurface: null,
        _hiddenBfcacheRecoveryId: 0,
        _visibilityCycleId: 0,
        _visibilityRecoveryPromise: null,
        VISIBILITY_LONG_RESTORE_MS: 5 * 60 * 1000,
        _krPrefixSet: null,
        _telecomPrefixSet: null,
        _proxyStrictPrefixSet: null,
        _proxyAggressiveExtraPrefixSet: null,
        _proxyAggressivePrefixSet: null,
        PROXY_MODE: { OFF: 0, STRICT: 1, AGGRESSIVE: 2 },
        // modtool.txt 기준
        // strict: VPN_LIST + IP_OWNER_LIST 의 "Mudfish VPN(정확도 낮음)"
        // aggressive extra: 클라우드/호스팅/IDC 계열 + 일부 인프라 owner
        PROXY_STRICT_PREFIXES: `
            1.176 1.201 1.215 1.227 1.228 1.229 1.231 1.237 1.245 1.248 1.252 1.254 2.56 2.57 2.58 2.59 3.36 5.22
            5.44 5.45 5.61 5.79 5.104 5.133 5.157 5.180 5.181 5.182 5.183 5.252 5.253 5.254 13.125 14.32 14.37 14.42
            14.51 14.56 14.63 14.136 20.194 23.26 23.27 23.29 23.227 23.249 24.235 27.102 31.3 31.13 31.14 31.24 31.25 31.40
            31.42 31.56 31.57 31.58 31.59 31.130 31.131 31.133 31.135 31.169 31.170 31.186 31.187 31.193 31.204 31.217 31.220 31.222
            34.22 34.64 36.38 36.50 36.255 37.0 37.19 37.35 37.46 37.49 37.58 37.97 37.120 37.143 37.221 37.235 38.48 38.54
            38.65 38.95 38.132 38.180 38.200 38.201 38.202 38.203 38.204 38.205 38.206 39.114 39.116 39.118 39.121 39.123 39.126 40.183
            41.223 43.225 43.226 45.8 45.9 45.10 45.11 45.12 45.13 45.14 45.15 45.33 45.38 45.59 45.66 45.67 45.74 45.80
            45.81 45.82 45.83 45.84 45.85 45.86 45.87 45.88 45.89 45.90 45.91 45.92 45.93 45.94 45.95 45.128 45.129 45.130
            45.131 45.132 45.133 45.134 45.135 45.136 45.137 45.139 45.140 45.141 45.142 45.143 45.144 45.145 45.146 45.147 45.148 45.149
            45.150 45.152 45.153 45.154 45.155 45.156 45.157 45.192 45.251 46.28 46.34 46.37 46.102 46.148 46.183 46.202 46.203 49.161
            49.246 50.7 50.114 52.78 52.79 52.141 52.144 52.231 58.124 58.226 58.228 58.237 59.4 59.6 59.8 59.10 59.14 59.20
            59.22 59.24 61.74 61.82 61.84 61.85 61.101 61.254 62.3 62.68 62.112 62.133 62.197 62.204 62.210 62.216 63.141 63.246
            64.43 64.79 64.224 66.78 66.85 66.90 66.150 66.225 66.249 66.251 67.207 67.210 67.227 69.10 69.168 72.5 72.14 72.18
            74.49 74.63 74.91 74.118 77.36 77.78 77.81 77.83 77.232 77.237 77.243 77.247 78.31 78.41 79.98 79.110 79.127 79.135
            80.71 80.76 80.89 80.93 80.96 80.97 80.243 81.17 81.22 81.29 81.92 81.161 81.180 81.181 82.102 82.117 82.140 82.149
            82.152 82.153 82.180 82.197 83.97 83.136 83.143 83.150 83.171 83.243 84.17 84.21 84.32 84.39 84.46 84.54 84.247 84.252
            85.8 85.11 85.28 85.31 85.120 85.121 85.122 85.132 85.190 85.203 85.204 85.206 85.208 85.209 85.254 86.38 86.48 86.62
            86.104 86.105 86.106 86.107 87.101 87.236 87.239 87.249 88.214 88.216 88.218 89.31 89.33 89.36 89.37 89.38 89.40 89.41
            89.42 89.44 89.45 89.46 89.47 89.116 89.117 89.184 89.185 89.187 89.213 89.238 89.249 91.90 91.92 91.102 91.123 91.132
            91.190 91.193 91.195 91.196 91.197 91.204 91.205 91.207 91.209 91.214 91.217 91.219 91.220 91.221 91.225 91.226 91.229 91.231
            91.232 91.233 91.234 91.238 91.239 91.240 91.242 91.245 91.246 92.38 92.50 92.51 92.61 92.62 92.112 92.113 92.114 92.118
            92.119 92.223 92.240 92.242 92.243 92.249 93.113 93.114 93.115 93.119 93.120 93.152 93.177 93.185 93.189 94.74 94.101 94.137
            94.140 94.154 94.156 94.176 94.177 94.190 94.198 94.242 95.141 95.153 95.156 95.173 95.174 95.181 95.214 102.38 102.128 102.129
            102.165 102.218 103.4 103.6 103.10 103.18 103.27 103.44 103.46 103.47 103.69 103.75 103.86 103.99 103.100 103.110 103.111 103.115
            103.119 103.130 103.149 103.155 103.160 103.209 103.210 103.221 103.225 103.254 104.16 104.17 104.18 104.19 104.20 104.21 104.22 104.23
            104.24 104.25 104.26 104.27 104.28 104.128 104.131 104.167 104.218 104.222 104.232 104.233 104.234 104.236 104.239 104.243 104.245 104.250
            104.251 104.252 106.185 106.186 106.187 106.243 107.22 107.155 107.161 107.167 107.170 107.181 107.190 107.191 108.61 108.165 108.181 109.70
            109.74 109.123 109.160 109.176 109.200 109.203 109.207 109.236 109.238 110.47 112.72 112.152 112.156 112.158 112.160 112.167 112.169 112.171
            112.172 112.173 112.186 113.52 113.130 113.203 114.199 114.207 115.22 115.23 115.40 115.71 116.120 118.32 118.33 118.37 118.38 118.40
            118.47 118.99 118.221 118.222 119.194 119.197 119.203 119.205 120.142 121.129 121.130 121.132 121.133 121.135 121.139 121.140 121.141 121.148
            121.149 121.151 121.155 121.162 121.171 121.172 121.173 121.176 121.183 121.185 121.187 122.42 123.215 124.5 124.54 124.111 125.132 125.138
            125.140 125.181 125.182 125.186 125.240 128.199 130.185 130.195 134.255 136.0 138.128 138.199 139.28 140.99 140.248 141.0 141.11 141.98
            141.164 141.193 142.111 142.252 145.14 145.223 146.19 146.56 146.66 146.70 146.75 146.255 147.46 147.47 147.78 147.79 147.136 148.135
            149.19 149.22 149.34 149.36 149.40 149.50 149.62 149.88 149.102 149.143 149.154 151.101 151.236 152.89 154.7 154.9 154.13 154.16
            154.17 154.28 154.29 154.30 154.36 154.37 154.47 154.70 154.85 154.92 154.95 154.127 154.194 154.199 154.216 154.218 155.133 156.67
            156.146 156.225 156.238 156.246 157.254 158.46 158.115 158.179 158.220 158.247 158.255 159.48 159.148 160.20 160.238 162.159 162.213 162.217
            162.218 162.221 162.243 162.246 162.248 162.252 162.254 163.5 165.231 165.246 166.0 166.88 167.88 167.100 167.253 168.91 168.93 168.199
            168.235 169.150 171.22 171.25 172.84 172.85 172.94 172.98 172.102 172.103 172.111 172.224 172.225 172.226 173.46 173.211 173.245 173.255
            174.140 175.110 175.115 175.118 175.127 175.197 175.203 175.205 175.207 175.208 175.210 175.211 176.9 176.10 176.46 176.53 176.58 176.67
            176.96 176.97 176.98 176.100 176.105 176.110 176.111 176.112 176.113 176.116 176.118 176.121 176.123 176.124 176.125 176.126 176.223 176.227
            177.67 178.62 178.79 178.132 178.157 178.159 178.162 178.171 178.209 178.211 178.212 178.218 178.249 178.255 179.43 179.61 180.68 180.149
            180.224 181.41 181.214 181.215 182.161 182.218 182.226 182.229 183.101 183.103 183.104 183.105 183.107 184.174 185.4 185.9 185.12 185.15
            185.19 185.23 185.25 185.26 185.30 185.34 185.37 185.45 185.46 185.49 185.51 185.52 185.54 185.59 185.75 185.76 185.81 185.82
            185.87 185.89 185.90 185.91 185.92 185.93 185.94 185.95 185.96 185.100 185.101 185.104 185.105 185.107 185.111 185.114 185.119 185.120
            185.123 185.126 185.128 185.130 185.132 185.135 185.143 185.144 185.145 185.147 185.151 185.152 185.153 185.154 185.156 185.158 185.159 185.161
            185.162 185.163 185.164 185.165 185.167 185.169 185.171 185.172 185.173 185.174 185.175 185.177 185.180 185.181 185.182 185.183 185.184 185.185
            185.187 185.188 185.189 185.192 185.193 185.194 185.195 185.196 185.197 185.198 185.199 185.200 185.201 185.202 185.203 185.204 185.205 185.206
            185.207 185.208 185.209 185.210 185.211 185.212 185.213 185.215 185.216 185.217 185.218 185.219 185.220 185.221 185.222 185.225 185.226 185.227
            185.228 185.229 185.230 185.231 185.232 185.233 185.235 185.236 185.237 185.238 185.239 185.240 185.241 185.242 185.243 185.244 185.245 185.246
            185.247 185.248 185.249 185.250 185.251 185.252 185.253 185.254 185.255 188.66 188.74 188.116 188.119 188.191 188.208 188.209 188.213 188.214
            188.215 188.226 188.240 188.241 190.2 190.106 191.96 191.101 192.30 192.34 192.36 192.40 192.54 192.55 192.71 192.73 192.81 192.99
            192.109 192.110 192.119 192.121 192.142 192.145 192.162 192.184 192.211 192.223 192.241 192.253 193.0 193.9 193.22 193.27 193.29 193.30
            193.31 193.32 193.36 193.37 193.38 193.42 193.43 193.46 193.47 193.56 193.57 193.58 193.105 193.106 193.108 193.111 193.135 193.142
            193.148 193.149 193.160 193.168 193.176 193.182 193.187 193.189 193.201 193.203 193.223 193.226 193.227 193.231 193.238 193.239 194.5 194.14
            194.15 194.26 194.31 194.32 194.33 194.34 194.35 194.36 194.37 194.48 194.50 194.53 194.59 194.60 194.61 194.68 194.71 194.79
            194.93 194.99 194.102 194.104 194.105 194.110 194.114 194.124 194.126 194.135 194.145 194.146 194.147 194.153 194.156 194.169 194.180 194.187
            194.195 194.233 194.242 195.8 195.12 195.34 195.54 195.58 195.64 195.80 195.88 195.158 195.160 195.179 195.181 195.184 195.189 195.206
            195.210 195.216 195.242 196.16 196.17 196.18 196.240 196.244 196.245 198.56 198.58 198.60 198.145 198.147 198.190 198.211 198.232 199.84
            199.96 199.115 199.120 199.241 202.168 203.21 203.32 203.34 204.93 204.124 204.217 205.142 205.143 206.53 206.80 206.123 206.127 206.144
            206.195 206.220 206.232 207.45 207.230 207.244 208.68 209.58 209.198 209.222 209.235 210.97 210.123 210.222 211.43 211.53 211.55 211.107
            211.183 211.184 211.222 211.226 211.228 211.230 211.237 211.245 211.251 211.253 212.30 212.60 212.80 212.81 212.90 212.92 212.97 212.102
            212.103 212.119 212.192 213.109 213.134 213.139 213.152 213.184 213.229 213.230 213.232 216.97 216.131 216.158 216.173 216.189 216.227 216.246
            216.247 217.9 217.64 217.78 217.138 217.148 217.151 217.156 217.170 217.197 218.55 218.145 218.146 218.150 218.153 218.155 218.158 218.232
            218.234 218.239 220.67 220.71 220.76 220.78 220.82 220.89 220.90 220.116 220.118 220.123 221.140 221.144 221.147 221.150 221.153 221.158
            221.160 221.164 221.167 222.102 222.108 222.109 222.110 222.111 222.112 222.118 222.238
        `.trim().split(/\s+/),
        PROXY_AGGRESSIVE_EXTRA_PREFIXES: `
            1.209 1.224 1.255 14.129 27.96 27.255 38.77 39.115 43.227 43.228 43.250 43.254 45.114 45.119 45.125 45.164 45.225 45.249
            49.8 49.50 49.128 49.143 49.236 49.238 49.254 58.229 59.150 61.14 61.42 61.97 61.100 61.106 61.109 61.111 61.247 61.250
            61.251 61.252 61.255 63.105 64.23 66.232 101.79 101.101 103.11 103.24 103.54 103.79 103.87 103.103 103.122 103.124 103.131 103.132
            103.138 103.140 103.146 103.151 103.193 103.194 103.212 103.215 103.218 103.230 103.237 103.238 103.240 103.243 103.249 106.10 106.249 110.4
            110.44 110.93 110.165 110.172 110.234 111.91 111.92 113.30 114.110 114.111 114.141 115.85 115.88 115.89 115.92 115.144 115.187 116.121
            116.122 116.125 117.52 118.67 118.91 118.129 119.30 121.0 121.50 121.78 121.126 121.170 122.49 122.99 124.198 124.217 125.6 125.7
            125.209 133.186 139.150 150.107 157.119 160.202 162.251 175.45 175.106 175.125 175.126 175.158 180.131 180.150 180.189 180.210 182.162 182.173
            182.252 182.255 183.78 202.31 202.68 202.86 202.126 202.131 202.133 202.158 202.179 203.84 203.104 203.109 203.216 203.231 203.235 203.236
            203.238 203.246 203.248 210.4 210.16 210.89 210.92 210.93 210.108 210.109 210.112 210.116 210.121 210.122 210.124 210.205 210.206 210.216
            210.219 211.32 211.37 211.41 211.47 211.50 211.56 211.60 211.63 211.104 211.110 211.115 211.116 211.118 211.168 211.169 211.170 211.171
            211.172 211.175 211.180 211.188 211.189 211.233 211.234 211.235 211.236 211.238 211.239 211.241 211.249 211.254 211.255 218.36 220.230 222.239
            223.26 223.130 223.165 223.255
        `.trim().split(/\s+/),
        KR_IP_RANGES: { "1": [[11, 11], [16, 19], [96, 111], [176, 177], [201, 201], [208, 223], [224, 255]], "14": [[0, 0], [4, 7], [32, 63], [64, 95], [128, 128], [129, 129], [138, 138], [192, 192], [206, 206]], "27": [[0, 0], [1, 1], [35, 35], [96, 96], [100, 100], [101, 101], [102, 102], [111, 111], [112, 112], [113, 113], [115, 115], [116, 116], [117, 117], [118, 118], [119, 119], [120, 120], [122, 122], [124, 124], [125, 125], [126, 126], [160, 175], [176, 183], [232, 239], [255, 255]], "36": [[38, 39]], "39": [[4, 7], [16, 31], [112, 127]], "42": [[8, 15], [16, 31], [32, 47], [82, 82]], "43": [[224, 224], [227, 227], [228, 228], [230, 230], [230, 230], [230, 230], [241, 241], [242, 242], [243, 243], [246, 246], [247, 247], [247, 247], [250, 250], [251, 251], [254, 254], [255, 255]], "45": [[64, 64], [64, 64], [64, 64], [112, 112], [112, 112], [113, 113], [115, 115], [117, 117], [119, 119], [120, 120], [121, 121], [125, 125], [248, 248], [249, 249], [249, 249], [250, 250], [250, 250]], "49": [[1, 1], [8, 11], [16, 31], [50, 50], [50, 50], [50, 50], [56, 63], [128, 128], [142, 142], [143, 143], [160, 175], [236, 236], [238, 238], [239, 239], [246, 246], [247, 247], [254, 254]], "58": [[29, 29], [65, 65], [72, 79], [84, 84], [87, 87], [102, 103], [120, 127], [138, 138], [140, 143], [145, 145], [146, 146], [147, 147], [148, 151], [180, 180], [181, 181], [184, 184], [224, 239]], "59": [[0, 31], [86, 86], [150, 150], [151, 151], [152, 152], [186, 187]], "60": [[196, 197], [253, 253]], "61": [[4, 4], [5, 5], [14, 14], [32, 39], [40, 43], [47, 47], [72, 77], [78, 79], [80, 83], [84, 85], [96, 111], [245, 245], [245, 245], [247, 247], [247, 247], [248, 255]], "101": [[1, 1], [1, 1], [53, 53], [55, 55], [79, 79], [101, 101], [202, 202], [235, 235], [250, 250]], "103": [[2, 2], [2, 2], [2, 2], [3, 3], [4, 4], [4, 4], [4, 4], [5, 5], [5, 5], [6, 6], [6, 6], [6, 6], [6, 6], [7, 7], [7, 7], [7, 7], [8, 8], [8, 8], [9, 9], [9, 9], [10, 10], [10, 10], [11, 11], [11, 11], [11, 11], [11, 11], [11, 11], [12, 12], [13, 13], [13, 13], [19, 19], [20, 20], [21, 21], [21, 21], [22, 22], [23, 23], [24, 24], [25, 25], [27, 27], [27, 27], [28, 28], [30, 30], [30, 30], [30, 30], [31, 31], [38, 38], [39, 39], [42, 42], [42, 42], [43, 43], [43, 43], [49, 49], [50, 50], [51, 51], [51, 51], [51, 51], [52, 52], [53, 53], [55, 55], [55, 55], [57, 57], [59, 59], [60, 60], [62, 62], [66, 66], [67, 67], [68, 68], [68, 68], [71, 71], [74, 74], [77, 77], [79, 79], [85, 85], [87, 87], [90, 90], [90, 90], [104, 104], [105, 105], [106, 106], [108, 108], [109, 109], [114, 114], [114, 114], [117, 117], [122, 122], [122, 122], [124, 124], [125, 125], [126, 126], [126, 126], [127, 127], [129, 129], [132, 132], [138, 138], [139, 139], [139, 139], [139, 139], [140, 140], [141, 141], [141, 141], [143, 143], [143, 143], [144, 144], [145, 145], [146, 146], [150, 150], [150, 150], [150, 150], [150, 150], [153, 153], [157, 157], [157, 157], [159, 159], [161, 161], [162, 162], [162, 162], [164, 164], [166, 166], [171, 171], [175, 175], [178, 178], [182, 182], [182, 182], [186, 186], [187, 187], [187, 187], [188, 188], [194, 194], [194, 194], [206, 206], [212, 212], [212, 212], [214, 214], [214, 214], [215, 215], [216, 216], [218, 218], [219, 219], [226, 226], [226, 226], [229, 229], [230, 230], [231, 231], [234, 234], [235, 235], [237, 237], [238, 238], [239, 239], [239, 239], [240, 240], [240, 240], [243, 243], [244, 244], [244, 244], [246, 246], [246, 246], [246, 246], [247, 247], [247, 247], [248, 248], [249, 249], [251, 251], [253, 253], [254, 254]], "106": [[10, 10], [96, 103], [240, 255]], "110": [[4, 4], [5, 5], [8, 15], [34, 34], [35, 35], [35, 35], [44, 44], [44, 44], [45, 45], [46, 47], [68, 71], [76, 76], [76, 76], [92, 92], [92, 92], [93, 93], [93, 93], [165, 165], [165, 165], [172, 172], [232, 232]], "111": [[65, 65], [67, 67], [91, 91], [92, 92], [118, 118], [171, 171], [218, 219], [221, 221]], "112": [[72, 72], [72, 72], [76, 77], [106, 107], [108, 108], [109, 109], [121, 121], [121, 121], [133, 133], [136, 136], [137, 137], [140, 140], [140, 140], [140, 140], [144, 159], [160, 191], [196, 196], [212, 212], [213, 213], [214, 214], [216, 223]], "113": [[10, 10], [21, 21], [29, 29], [30, 30], [52, 52], [52, 52], [59, 59], [60, 60], [61, 61], [61, 61], [130, 130], [130, 130], [131, 131], [192, 192], [197, 197], [198, 198], [199, 199], [216, 217]], "114": [[29, 29], [30, 30], [30, 30], [30, 30], [31, 31], [31, 31], [52, 53], [70, 71], [108, 108], [110, 110], [110, 110], [111, 111], [111, 111], [129, 129], [129, 129], [141, 141], [141, 141], [141, 141], [199, 199], [199, 199], [200, 207]], "115": [[0, 23], [31, 31], [40, 41], [68, 68], [69, 69], [71, 71], [84, 84], [85, 85], [86, 86], [88, 95], [126, 126], [136, 143], [144, 144], [145, 145], [160, 160], [161, 161], [165, 165], [178, 178], [178, 178], [187, 187], [187, 187]], "116": [[32, 47], [67, 67], [68, 68], [68, 68], [84, 84], [89, 89], [90, 90], [93, 93], [120, 127], [193, 193], [199, 199], [200, 201], [212, 212], [255, 255]], "117": [[16, 17], [20, 20], [20, 20], [52, 52], [53, 53], [53, 53], [55, 55], [58, 58], [110, 111], [123, 123]], "118": [[32, 63], [67, 67], [91, 91], [91, 91], [103, 103], [107, 107], [127, 127], [128, 131], [139, 139], [176, 176], [216, 223], [234, 235]], "119": [[17, 17], [17, 17], [18, 18], [30, 30], [31, 31], [42, 42], [56, 56], [59, 59], [63, 63], [64, 71], [75, 75], [77, 77], [82, 82], [148, 148], [149, 149], [161, 161], [192, 223], [235, 235], [235, 235]], "120": [[29, 29], [50, 50], [73, 73], [136, 136], [142, 142], [143, 143]], "121": [[0, 0], [1, 1], [50, 50], [50, 50], [50, 50], [53, 53], [54, 54], [55, 55], [64, 67], [78, 78], [88, 88], [100, 100], [101, 101], [101, 101], [124, 125], [126, 126], [127, 127], [128, 159], [160, 191], [200, 200], [252, 253], [254, 254], [254, 254]], "122": [[0, 0], [0, 0], [32, 47], [49, 49], [99, 99], [100, 100], [101, 101], [128, 128], [128, 128], [129, 129], [129, 129], [152, 152], [153, 153], [199, 199], [202, 202], [202, 202], [203, 203], [252, 252], [252, 252], [254, 254]], "123": [[0, 0], [32, 47], [98, 98], [99, 99], [100, 100], [108, 108], [108, 108], [109, 109], [111, 111], [140, 143], [199, 199], [200, 200], [212, 215], [228, 229], [248, 248], [250, 251], [253, 253], [254, 254], [254, 254]], "124": [[0, 1], [2, 2], [3, 3], [5, 5], [28, 28], [46, 46], [48, 63], [66, 66], [66, 66], [80, 80], [111, 111], [136, 139], [146, 146], [153, 153], [194, 194], [195, 195], [195, 195], [197, 197], [198, 198], [199, 199], [199, 199], [216, 216], [217, 217], [243, 243], [254, 254]], "125": [[7, 7], [31, 31], [57, 57], [60, 60], [61, 61], [62, 62], [128, 159], [176, 191], [208, 208], [208, 208], [209, 209], [209, 209], [240, 247], [248, 251], [252, 252]], "128": [[134, 134]], "129": [[254, 254]], "134": [[75, 75]], "137": [[68, 68]], "139": [[5, 5], [150, 150]], "141": [[223, 223]], "143": [[248, 248]], "144": [[48, 48], [48, 48], [48, 48]], "147": [[6, 6], [43, 43], [46, 46], [47, 47]], "150": [[107, 107], [107, 107], [129, 129], [150, 150], [183, 183], [197, 197], [242, 242], [242, 242]], "152": [[99, 99], [149, 149]], "154": [[10, 10]], "155": [[230, 230]], "156": [[147, 147]], "157": [[119, 119], [197, 197]], "158": [[44, 44]], "160": [[202, 202]], "161": [[122, 122]], "163": [[53, 53], [152, 152], [180, 180], [213, 213], [222, 222], [229, 229], [239, 239], [255, 255]], "164": [[124, 124], [125, 125]], "165": [[132, 132], [133, 133], [141, 141], [186, 186], [194, 194], [213, 213], [229, 229], [243, 243], [244, 244], [246, 246]], "166": [[79, 79], [103, 103], [104, 104], [125, 125]], "168": [[78, 78], [115, 115], [126, 126], [131, 131], [154, 154], [188, 188], [219, 219], [248, 249]], "169": [[140, 140], [208, 223]], "175": [[28, 28], [41, 41], [45, 45], [45, 45], [106, 106], [107, 107], [111, 111], [112, 127], [158, 158], [176, 176], [192, 255]], "180": [[64, 71], [80, 83], [92, 92], [92, 92], [94, 94], [131, 131], [132, 135], [148, 148], [150, 150], [182, 182], [189, 189], [189, 189], [210, 210], [210, 210], [211, 211], [222, 222], [224, 231], [233, 233], [236, 239]], "182": [[31, 31], [50, 50], [161, 161], [162, 162], [163, 163], [172, 172], [173, 173], [173, 173], [192, 199], [208, 223], [224, 231], [237, 237], [237, 237], [252, 252], [252, 252], [255, 255]], "183": [[78, 78], [78, 78], [86, 86], [90, 90], [91, 91], [96, 127]], "192": [[5, 5], [100, 100], [104, 104], [132, 132], [132, 132], [195, 195], [203, 203], [245, 245], [249, 249]], "202": [[3, 3], [6, 6], [8, 8], [14, 14], [14, 14], [14, 14], [20, 20], [20, 20], [20, 20], [20, 20], [21, 21], [22, 22], [30, 31], [43, 43], [59, 59], [68, 68], [73, 73], [86, 86], [89, 89], [89, 89], [90, 90], [126, 126], [128, 128], [131, 131], [133, 133], [136, 136], [148, 148], [150, 150], [158, 158], [163, 163], [165, 165], [167, 167], [171, 171], [174, 174], [179, 179], [179, 179]], "203": [[17, 17], [81, 81], [81, 81], [82, 82], [82, 82], [83, 83], [84, 84], [90, 90], [100, 100], [109, 109], [123, 123], [128, 128], [128, 128], [129, 129], [130, 130], [130, 130], [132, 132], [133, 133], [142, 142], [142, 142], [149, 149], [152, 152], [153, 153], [160, 160], [166, 166], [169, 169], [170, 170], [171, 171], [173, 173], [175, 175], [175, 175], [190, 190], [190, 190], [191, 191], [207, 207], [210, 210], [212, 212], [212, 212], [215, 215], [216, 216], [217, 217], [223, 223], [223, 223], [224, 224], [225, 225], [226, 227], [228, 229], [230, 231], [232, 233], [234, 235], [236, 239], [240, 243], [244, 247], [248, 251], [252, 255]], "210": [[0, 0], [2, 2], [4, 4], [4, 4], [16, 16], [57, 57], [87, 87], [89, 89], [90, 91], [92, 95], [96, 96], [97, 97], [98, 98], [99, 99], [100, 103], [104, 107], [108, 111], [112, 115], [116, 119], [120, 123], [124, 127], [178, 179], [180, 181], [182, 183], [192, 192], [204, 207], [210, 210], [211, 211], [211, 211], [216, 219], [220, 223]], "211": [[32, 39], [40, 51], [52, 63], [104, 111], [112, 119], [168, 175], [176, 191], [192, 199], [200, 205], [206, 211], [212, 215], [216, 225], [226, 231], [232, 255]], "218": [[36, 39], [48, 49], [50, 55], [101, 101], [144, 159], [209, 209], [232, 233], [234, 239]], "219": [[240, 241], [248, 255]], "220": [[64, 71], [72, 91], [92, 95], [103, 103], [116, 127], [149, 149], [230, 230]], "221": [[132, 132], [133, 133], [133, 133], [138, 143], [144, 168]], "222": [[96, 122], [231, 231], [232, 239], [251, 251]], "223": [[26, 26], [28, 28], [32, 63], [130, 130], [131, 131], [165, 165], [168, 175], [194, 195], [222, 222], [253, 253], [255, 255]] },
        // This source is the mobile target adapter. The PC builder rewrites this
        // target flag to false when it ports the shared filter module.
        isMobile: () => true,
        isRecommendedContext: () => window.location.search.includes('exception_mode=recommend'),
        normalizeProxyBlockMode(value) {
            return DCUF_SHARED_STORAGE.normalizeProxyBlockModeValue(value);
        },
        getProxyModeLabel(mode) {
            switch (this.normalizeProxyBlockMode(mode)) {
                case this.PROXY_MODE.STRICT: return '확실한 우회 차단';
                case this.PROXY_MODE.AGGRESSIVE: return '공격적 우회 차단';
                default: return '끔';
            }
        },
        normalizeIpPrefix(value) {
            return DCUF_SHARED_STORAGE.normalizeIpPrefix(value);
        },
        parseIpPrefixList(value) {
            return DCUF_SHARED_STORAGE.parseIpPrefixList(value, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
        },
        getIpPrefix(ip) {
            return DCUF_SHARED_STORAGE.extractIpPrefix(ip);
        },
        getKrPrefixSet() {
            if (!this._krPrefixSet) {
                const prefixes = [];
                const rangeSource = typeof this.KR_IP_RANGES === 'function'
                    ? this.KR_IP_RANGES()
                    : this.KR_IP_RANGES;
                Object.entries(rangeSource || {}).forEach(([first, ranges]) => {
                    ranges.forEach(([start, end]) => {
                        for (let second = start; second <= end; second += 1) {
                            prefixes.push(`${first}.${second}`);
                        }
                    });
                });
                this._krPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.kr.decodes');
            }
            return this._krPrefixSet;
        },
        isForeignIpPrefix(ipPrefix) {
            return Boolean(ipPrefix) && !this.getKrPrefixSet().has(ipPrefix);
        },
        getTelecomPrefixSet() {
            if (!this._telecomPrefixSet) {
                const prefixes = [];
                const telecomSource = typeof this.TELECOM === 'function'
                    ? this.TELECOM()
                    : this.TELECOM;
                (telecomSource || []).forEach((group) => group[1].forEach((item) => {
                    if (item[2] === 'MOB') prefixes.push(`${group[0]}.${item[0]}`);
                }));
                this._telecomPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.telecom.decodes');
            }
            return this._telecomPrefixSet;
        },
        getProxyStrictPrefixSet() {
            if (!this._proxyStrictPrefixSet) {
                const source = this.PROXY_STRICT_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyStrictPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyStrict.decodes');
            }
            return this._proxyStrictPrefixSet;
        },
        getProxyAggressiveExtraPrefixSet() {
            if (!this._proxyAggressiveExtraPrefixSet) {
                const source = this.PROXY_AGGRESSIVE_EXTRA_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyAggressiveExtraPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyAggressive.decodes');
            }
            return this._proxyAggressiveExtraPrefixSet;
        },
        getProxyPrefixSet(mode = this.PROXY_MODE.STRICT) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE) {
                if (!this._proxyAggressivePrefixSet) {
                    this._proxyAggressivePrefixSet = new Set(this.getProxyStrictPrefixSet());
                    this.getProxyAggressiveExtraPrefixSet().forEach((prefix) => this._proxyAggressivePrefixSet.add(prefix));
                }
                return this._proxyAggressivePrefixSet;
            }
            return normalizedMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet() : null;
        },
        getProxyPrefixMatch(ipPrefix, mode) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (!ipPrefix || normalizedMode === this.PROXY_MODE.OFF) return { matched: false, tier: null };
            if (this.getProxyStrictPrefixSet().has(ipPrefix) || this.isForeignIpPrefix(ipPrefix)) return { matched: true, tier: 'strict' };
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE && this.getProxyAggressiveExtraPrefixSet().has(ipPrefix)) {
                return { matched: true, tier: 'aggressive' };
            }
            return { matched: false, tier: null };
        },
        debugLog(scope, message, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (payload === undefined) console.log(`[DCUF DEBUG][${scope}] ${message}`);
            else console.log(`[DCUF DEBUG][${scope}] ${message}`, payload);
        },
        debugSettingsSnapshot(extra = {}) {
            const s = dcFilterSettings || {};
            const proxyBlockMode = this.normalizeProxyBlockMode(s.proxyBlockMode ?? s.proxyBlockEnabled);
            return {
                masterDisabled: !!s.masterDisabled,
                excludeRecommended: !!s.excludeRecommended,
                threshold: s.threshold,
                ratioEnabled: !!s.ratioEnabled,
                ratioMin: s.ratioMin,
                ratioMax: s.ratioMax,
                blockGuestEnabled: !!s.blockGuestEnabled,
                proxyBlockMode,
                proxyBlockModeLabel: this.getProxyModeLabel(proxyBlockMode),
                proxyBlockEnabled: proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: !!s.telecomBlockEnabled,
                blockedGuestsCount: Array.isArray(s.blockedGuests) ? s.blockedGuests.length : 0,
                blockedGuestsPreview: Array.isArray(s.blockedGuests) ? s.blockedGuests.slice(0, 10) : [],
                customIpPrefixCount: s.customIpPrefixSet instanceof Set ? s.customIpPrefixSet.size : 0,
                customIpPrefixPreview: s.customIpPrefixSet instanceof Set ? Array.from(s.customIpPrefixSet).slice(0, 15) : [],
                telecomPrefixCount: this.getTelecomPrefixSet().size,
                proxyStrictPrefixCount: this.getProxyStrictPrefixSet().size,
                proxyAggressiveExtraPrefixCount: this.getProxyAggressiveExtraPrefixSet().size,
                proxyAggressivePrefixCount: this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size,
                effectiveProxyPrefixCount: proxyBlockMode === this.PROXY_MODE.AGGRESSIVE ? this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size : (proxyBlockMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet().size : 0),
                ...extra
            };
        },
        debugStringifySafe(value) {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return `[stringify-failed:${error?.message || 'unknown'}]`;
            }
        },
        debugDescribeElement(element) {
            if (!(element instanceof HTMLElement)) return { tag: null };
            const titleNode = element.querySelector('.gall_tit a, .post-title-link, .usertxt, .gall_tit, .post-title');
            return {
                tag: element.tagName,
                id: element.id || null,
                className: typeof element.className === 'string' ? element.className : '',
                rowId: element.getAttribute('data-custom-row-id'),
                title: titleNode ? titleNode.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : null
            };
        },
        startDebugPass(reason, extra = {}) {
            if (!this.DEBUG_ENABLED) return;
            this.DEBUG_PASS_ID += 1;
            this.DEBUG_DECISION_LOG_COUNT = 0;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            this.DEBUG_DECISION_KEYS.clear();
            this.debugLog('pass', `start #${this.DEBUG_PASS_ID} ${reason}`, {
                passId: this.DEBUG_PASS_ID,
                ...extra,
                settings: this.debugSettingsSnapshot()
            });
        },
        debugDecision(element, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter(Boolean) : [];
            const identity = [
                this.DEBUG_PASS_ID,
                payload.branch || '',
                payload.uid || '',
                payload.ip || '',
                payload.ipPrefix || '',
                payload.isBlocked ? 'hide' : 'show',
                reasons.join(',')
            ].join('|');
            if (this.DEBUG_DECISION_KEYS.has(identity)) return;
            if (this.DEBUG_DECISION_LOG_COUNT >= this.DEBUG_MAX_DECISIONS_PER_PASS) return;
            this.DEBUG_DECISION_KEYS.add(identity);
            this.DEBUG_DECISION_LOG_COUNT += 1;
            this.debugLog('decision', `${payload.branch || 'sync'} #${this.DEBUG_DECISION_LOG_COUNT}`, {
                passId: this.DEBUG_PASS_ID,
                element: this.debugDescribeElement(element),
                ...payload,
                reasons
            });
            console.log(
                `[DCUF DEBUG][decision-line] pass=${this.DEBUG_PASS_ID} idx=${this.DEBUG_DECISION_LOG_COUNT} branch=${payload.branch || 'sync'} blocked=${payload.isBlocked} ` +
                `uid=${payload.uid || '(none)'} nick=${payload.nickname || '(none)'} ip=${payload.ip || '(none)'} prefix=${payload.ipPrefix || '(none)'} ` +
                `guest=${payload.isGuest} custom=${payload.hasCustomIpPrefixBlock} proxyMode=${payload.proxyBlockMode} proxy=${payload.proxyPrefixMatch} proxyTier=${payload.proxyMatchTier || '(none)'} telecom=${payload.telecomPrefixMatch} ` +
                `blockedGuest=${payload.blockedGuestMatch} reasons=${reasons.join(',') || '(none)'}`
            );
        },
        debugMirrorSync(originalRow, mirroredItem, nextDisplay, source) {
            if (!this.DEBUG_ENABLED) return;
            const prevDisplay = mirroredItem.style.display || '';
            if (prevDisplay === nextDisplay && nextDisplay !== 'none') return;
            this.debugLog('mirror', source, {
                original: this.debugDescribeElement(originalRow),
                mirrored: this.debugDescribeElement(mirroredItem),
                originalDisplay: originalRow.style.display || '',
                mirroredBefore: prevDisplay,
                mirroredAfter: nextDisplay,
                originalClassName: typeof originalRow.className === 'string' ? originalRow.className : ''
            });
        },
        async debugDumpState(reason = 'manual') {
            if (!this.DEBUG_ENABLED) return null;
            await this.reloadSettings();
            const rawBlockConfig = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            const payload = this.debugSettingsSnapshot({
                reason,
                rawBlockConfigIp: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip : '',
                rawBlockConfigIpPreview: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip.split('||').slice(0, 20) : [],
                rawBlockConfigIpCount: this.parseIpPrefixList(rawBlockConfig?.ip || '').length
            });
            this.debugLog('dump', reason, payload);
            console.log(`[DCUF DEBUG][dump-line] ${this.debugStringifySafe(payload)}`);
            return payload;
        },
        installDebugApi() {
            if (window.DCUFDebug && window.DCUFDebug.__dcufInstalled) return;
            window.DCUFDebug = {
                __dcufInstalled: true,
                dumpState: (reason = 'manual dumpState') => this.debugDumpState(reason),
                inspectCurrentPage: async (reason = 'manual inspectCurrentPage') => {
                    await this.reloadSettings();
                    this.startDebugPass(reason, { source: 'window.DCUFDebug.inspectCurrentPage' });
                    this.runSyncRefilterPass();
                    return this.debugDumpState(`${reason} after runSyncRefilterPass`);
                },
                refilter: async (reason = 'manual refilter') => {
                    await this.refilterAllContent(reason);
                    return this.debugDumpState(`${reason} after refilter`);
                }
            };
            this.debugLog('api', 'window.DCUFDebug installed', Object.keys(window.DCUFDebug));
        },
        async cleanupLegacyManagedBlockConfig(snapshot = null) {
            const migrationDone = snapshot ? snapshot.migrationDone : await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, false);
            if (migrationDone) return;
            const conf = snapshot?.blockConfig || await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            if (!conf || typeof conf !== 'object') {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) snapshot.migrationDone = true;
                return;
            }
            const currentIp = typeof conf.ip === 'string' ? conf.ip : '';
            const parsedPrefixes = DCUF_SHARED_STORAGE.parseIpPrefixList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const normalizedIp = DCUF_SHARED_STORAGE.normalizeBlockConfigIp(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const suspiciousLargeLegacyList = DCUF_SHARED_STORAGE.isSuspiciousLegacyManagedIpList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);

            if (suspiciousLargeLegacyList) {
                this.debugLog('migration', 'detected suspicious large legacy blockConfig.ip list, backing up and clearing', {
                    beforeCount: parsedPrefixes.length,
                    beforePreview: parsedPrefixes.slice(0, 20)
                });
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_BACKUP, currentIp);
                conf.ip = '';
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
                return;
            }

            if (normalizedIp !== currentIp) {
                this.debugLog('migration', 'cleanupLegacyManagedBlockConfig updating blockConfig.ip', {
                    before: currentIp,
                    after: normalizedIp
                });
                conf.ip = normalizedIp;
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
            }
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
            if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
        },
        async showSettings() {
            window.__dcufEnsureFilterUiStyles?.();
            await this.reloadSettings();
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockGuestEnabled = false, proxyBlockMode = 0, telecomBlockEnabled = false } = dcFilterSettings;
            const currentShortcut = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const existingDiv = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            if (existingDiv) existingDiv.remove();
            const div = document.createElement('div');
            div.id = this.CONSTANTS.UI_IDS.SETTINGS_PANEL;
            div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: default; user-select: none;';
            const proxyModeButtonsHtml = [
                [this.PROXY_MODE.OFF, '끔'],
                [this.PROXY_MODE.STRICT, '확실'],
                [this.PROXY_MODE.AGGRESSIVE, '공격적']
            ].map(([mode, label]) => {
                const active = normalizedProxyBlockMode === mode;
                return `<button type="button" data-proxy-mode="${mode}" aria-pressed="${active}" style="flex:1;min-width:0;border:0;background:${active ? '#3b71fd' : 'transparent'};color:${active ? '#fff' : '#333'};font-size:12px;font-weight:${active ? '700' : '600'};padding:5px 0;border-radius:7px;cursor:pointer;">${label}</button>`;
            }).join('');
            div.innerHTML = `
                <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center; justify-content: space-between;">
                    <div style="display:flex; align-items: center; gap: 10px;">
                        <div style="display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" type="checkbox" ${masterDisabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;"><b>모든 기능 끄기</b></label></div>
                        <div style="border-left: 2px solid #ccc; padding-left: 10px; display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" type="checkbox" ${excludeRecommended ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" style="font-size:14px;cursor:pointer;"><b>개념글 제외</b></label></div>
                    </div>
                    <div><button id="${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:#555;">✕</button></div>
                </div>
                <div id="${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; align-items: center;"><h3 style="cursor: default;margin-top:0;margin-bottom:5px;">유저 글+댓글 합 기준값(이 값 이하 차단)</h3><input id="${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}" type="number" min="0" value="${threshold}" style="width:80px;font-size:16px; cursor: initial;"><div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div></div>
                        <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;"><div style="display: flex; flex-direction: column; align-items: center; gap: 7px; text-align:center;"><div style="display:flex; align-items:center; justify-content:center; gap:6px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;cursor:pointer;">유동 전체 차단</label></div><div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%; text-align:center;"><div style="font-size:13px;">우회 IP 차단(오탐 위험 있음)</div><div id="${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}" style="display:flex; width:100%; max-width:220px; gap:2px; background:#edf1f5; border:1px solid #cfd6dd; border-radius:8px; padding:2px; justify-content:center;">${proxyModeButtonsHtml}</div><div class="dcuf-proxy-mode-desc" style="font-size:11px;color:#666;line-height:1.2; text-align:center;">끔 - 확실한 우회 차단 - 공격적 우회 차단</div></div><div style="display:flex; align-items:center; gap:6px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;cursor:pointer;">통신사 IP 차단</label></div></div></div>
                    </div>
                    <hr style="border:0;border-top:2px solid #222;margin:16px 0 12px 0;">
                    <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" type="checkbox" ${ratioEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;">글/댓글 비율 필터 사용</label></div>
                    <div id="${this.CONSTANTS.UI_IDS.RATIO_SECTION}">
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" style="font-size:14px;">댓글/글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" type="number" step="any" placeholder="예: 10" value="${ratioMin !== '' ? ratioMin : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" style="font-size:14px;">글/댓글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" type="number" step="any" placeholder="예: 1" value="${ratioMax !== '' ? ratioMax : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                        </div><div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값과 같거나 큰(이상)인 유저를 차단합니다.</div>
                    </div>
                    <button type="button" id="${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}" style="width:100%;margin-top:14px;padding:9px 10px;border:1px solid #9aa4b2;border-radius:7px;background:#f6f8fb;color:#222;font-weight:700;cursor:pointer;">갤러리별 말머리 차단 관리</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:15px; border-top: 2px solid #ccc;">
                    <div style="font-size:15px;color:#444;text-align:left;">
                        창 여닫는 단축키: <b id="${this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY}">${currentShortcut}</b>
                        <a href="#" id="${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}" style="margin-left: 8px; font-size: 13px; text-decoration: underline; cursor: pointer;">(변경)</a>
                    </div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_BUTTON}" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
                </div>`;
            document.body.appendChild(div);


            div.classList.add('dcuf-settings-panel');
            const settingsHeader = div.firstElementChild;
            if (settingsHeader) settingsHeader.classList.add('dcuf-settings-header');
            const settingsFooter = div.lastElementChild;
            if (settingsFooter) settingsFooter.classList.add('dcuf-settings-footer');
            const settingsMain = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER);
            if (settingsMain) {
                settingsMain.classList.add('dcuf-settings-body');
                const thresholdSection = settingsMain.firstElementChild;
                if (thresholdSection) {
                    thresholdSection.classList.add('dcuf-settings-section', 'dcuf-settings-threshold');
                    const guestControls = thresholdSection.lastElementChild;
                    if (guestControls) guestControls.classList.add('dcuf-settings-guest-controls');
                }
            }
            const ratioSectionRoot = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_SECTION);
            if (ratioSectionRoot) ratioSectionRoot.classList.add('dcuf-settings-section', 'dcuf-settings-ratio');

            try {
                PersonalBlockModule.attachPopupPinchResize(div, { minWidth: 280, minHeight: 220 });
            } catch (e) {
                console.warn('DCinside User Filter: settings pinch init failed.', e);
            }

            const closeSettingsPanel = () => {
                div.classList.add('dcuf-pop-leave');
                window.setTimeout(() => div.remove(), 140);
            };

            const input = div.querySelector(`#${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}`);
            const changeShortcutBtn = div.querySelector(`#${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}`);
            const masterDisableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}`);
            const settingsContainer = div.querySelector(`#${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}`);
            const ratioSection = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_SECTION}`);
            const ratioEnableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}`);
            const ratioMinInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}`);
            const ratioMaxInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}`);
            const closeButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}`);
            const saveButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.SAVE_BUTTON}`);
            const excludeRecommendedCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}`);
            const blockGuestCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}`);
            const proxyBlockModeGroup = div.querySelector(`#${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}`);
            const telecomBlockCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}`);
            const headtextManagerButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}`);

            if (input) { input.focus(); input.select(); }

            if (changeShortcutBtn) {
                changeShortcutBtn.onclick = (e) => {
                    e.preventDefault();
                    this.showShortcutChanger();
                };
            }

            if (closeButton) {
                closeButton.onclick = closeSettingsPanel;
                closeButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSettingsPanel();
                }, { passive: false });
            }

            if (!masterDisableCheckbox || !settingsContainer || !ratioSection || !ratioEnableCheckbox || !ratioMinInput || !ratioMaxInput || !saveButton || !excludeRecommendedCheckbox || !blockGuestCheckbox || !proxyBlockModeGroup || !telecomBlockCheckbox) {
                console.error('DCinside User Filter: settings popup init failed - required control missing.');
                return;
            }

            const updateMasterState = () => { const isMasterDisabled = masterDisableCheckbox.checked; settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1; settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto'; };
            masterDisableCheckbox.addEventListener('change', updateMasterState); updateMasterState();
            const updateRatioSectionState = () => { const enabled = ratioEnableCheckbox.checked; ratioSection.style.opacity = enabled ? 1 : 0.5; ratioMinInput.disabled = !enabled; ratioMaxInput.disabled = !enabled; };
            ratioEnableCheckbox.addEventListener('change', updateRatioSectionState); updateRatioSectionState();
            let currentProxyBlockMode = normalizedProxyBlockMode;
            const renderProxyModeButtons = (mode) => {
                const isDarkMode = document.body.classList.contains('dc-filter-dark-mode');
                proxyBlockModeGroup.querySelectorAll('button[data-proxy-mode]').forEach((button) => {
                    const buttonMode = this.normalizeProxyBlockMode(button.getAttribute('data-proxy-mode'));
                    const active = mode === buttonMode;
                    button.setAttribute('aria-pressed', active ? 'true' : 'false');
                    button.style.background = active ? '#3b71fd' : 'transparent';
                    button.style.color = active ? '#fff' : (isDarkMode ? '#dbe6f5' : '#333');
                    button.style.fontWeight = active ? '700' : '600';
                    button.style.border = '0';
                });
            };
            renderProxyModeButtons(currentProxyBlockMode);

            // [v2.6.8 추가] 스위치 실시간 저장 & 필터 즉시 적용
            const applyCheckboxChange = async (storageKey, value, extraLogic) => {
                this.debugLog('toggle', 'applyCheckboxChange requested', { storageKey, value });
                await GM_setValue(storageKey, value);
                if (extraLogic) {
                    this.debugLog('toggle', 'applyCheckboxChange running extraLogic', { storageKey, value });
                    await extraLogic();
                }
                await this.debugDumpState(`after ${storageKey}=${value} before refilter`);
                await this.refilterAllContent(`toggle ${storageKey}=${value}`);
            };

            masterDisableCheckbox.addEventListener('change', () =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, masterDisableCheckbox.checked)
            );
            excludeRecommendedCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, e.target.checked)
            );
            blockGuestCheckbox.addEventListener('change', async (e) => {
                const checked = e.target.checked;
                await applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, checked,
                    checked ? null : () => this.clearBlockedGuests()
                );
            });
            proxyBlockModeGroup.addEventListener('click', (e) => {
                const targetButton = e.target.closest('button[data-proxy-mode]');
                if (!targetButton) return;
                const nextMode = this.normalizeProxyBlockMode(targetButton.getAttribute('data-proxy-mode'));
                if (nextMode === currentProxyBlockMode) return;
                currentProxyBlockMode = nextMode;
                renderProxyModeButtons(currentProxyBlockMode);
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, currentProxyBlockMode);
            });
            telecomBlockCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, e.target.checked)
            );
            headtextManagerButton?.addEventListener('click', () => this.showHeadtextBlockManager());
            ratioEnableCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, e.target.checked)
            );

            const enterKeySave = (e) => { if (e.key === 'Enter') saveButton.click(); };
            [input, ratioMinInput, ratioMaxInput].forEach(el => { if (el) el.addEventListener('keydown', enterKeySave); });
            let isDragging = false, offsetX, offsetY;
            let dragWidth = 0, dragHeight = 0;
            let dragRafId = 0, pendingDragX = null, pendingDragY = null;
            const applyDragPosition = () => {
                dragRafId = 0;
                if (!isDragging || pendingDragX === null || pendingDragY === null) return;
                let newX = pendingDragX - offsetX;
                let newY = pendingDragY - offsetY;
                pendingDragX = null;
                pendingDragY = null;
                newX = Math.max(0, Math.min(newX, window.innerWidth - dragWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - dragHeight));
                div.style.left = `${newX}px`;
                div.style.top = `${newY}px`;
            };
            const onDragStart = (e) => {
                if (e.type === 'touchstart' && e.touches && e.touches.length > 1) return;
                const startTarget = (e.target && e.target.nodeType === 1) ? e.target : e.target.parentElement;
                if (!startTarget || !startTarget.closest('.dcuf-settings-header')) return;
                if (startTarget.closest('button, input, label, a, .switch') || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CLOSE_BUTTON || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN) return;
                isDragging = true;
                const rect = div.getBoundingClientRect();
                if (div.style.transform !== 'none') { div.style.transform = 'none'; div.style.left = `${rect.left}px`; div.style.top = `${rect.top}px`; }
                dragWidth = rect.width;
                dragHeight = rect.height;
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                offsetX = clientX - rect.left; offsetY = clientY - rect.top;
                document.addEventListener('mousemove', onDragMove); document.addEventListener('touchmove', onDragMove, { passive: false });
                document.addEventListener('mouseup', onDragEnd, { once: true }); document.addEventListener('touchend', onDragEnd, { once: true });
            };
            const onDragMove = (e) => {
                if (!isDragging) return;
                if (e.type === 'touchmove' && e.touches && e.touches.length > 1) return;
                e.preventDefault();
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                pendingDragX = clientX;
                pendingDragY = clientY;
                if (!dragRafId) dragRafId = requestAnimationFrame(applyDragPosition);
            };
            const onDragEnd = () => {
                if (dragRafId) cancelAnimationFrame(dragRafId);
                applyDragPosition();
                isDragging = false;
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('touchmove', onDragMove);
            };
            const dragHandle = settingsHeader || div;
            try {
                dragHandle.addEventListener('mousedown', onDragStart);
                dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
            } catch (e) {
                console.warn('DCinside User Filter: settings drag init failed.', e);
            }
            saveButton.onclick = async () => {
                saveButton.disabled = true; saveButton.textContent = '저장 중...';
                const blockGuestChecked = blockGuestCheckbox.checked;
                let val = parseInt(input ? input.value : '0', 10);
                if (isNaN(val)) val = 0;
                const promises = [
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, masterDisableCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, excludeRecommendedCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, val),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, ratioEnableCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ratioMinInput.value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ratioMaxInput.value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, blockGuestChecked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, currentProxyBlockMode),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, telecomBlockCheckbox.checked)
                ];
                if (!blockGuestChecked) promises.push(this.clearBlockedGuests()); try {
                    await Promise.all(promises);
                    await this.debugDumpState('save button before refilter');
                    await this.refilterAllContent('save button');
                    closeSettingsPanel();
                } catch (error) {
                    console.error('DCinside User Filter: Settings save failed.', error);
                    saveButton.disabled = false;
                    saveButton.textContent = '저장 & 실행';
                    alert('설정 저장에 실패했습니다. 콘솔을 확인해 주세요.');
                }
            };
        },
        getGalleryKey(urlLike = window.location.href) {
            try {
                const url = new URL(urlLike, window.location.href);
                const id = (url.searchParams.get('id') || '').trim();
                if (!id) return null;
                const path = url.pathname.toLowerCase();
                const type = path.includes('/mini/') ? 'mini' : (path.includes('/mgallery/') ? 'mgallery' : 'board');
                return `${type}:${id}`;
            } catch {
                return null;
            }
        },
        normalizeHeadtext(value) {
            return DCUF_SHARED_STORAGE.normalizeHeadtext(value);
        },
        normalizeGalleryHeadtextBlocks(value) {
            return DCUF_SHARED_STORAGE.normalizeGalleryHeadtextBlocks(value);
        },
        async loadGalleryHeadtextBlocks() {
            const raw = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {});
            return this.normalizeGalleryHeadtextBlocks(raw);
        },
        async saveGalleryHeadtextBlocks(rules, reason = 'gallery headtext blocks') {
            const normalized = this.normalizeGalleryHeadtextBlocks(rules);
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, normalized);
            await this.reloadSettings();
            await this.refilterAllContent(reason);
            return normalized;
        },
        getCanonicalHeadtextFromNode(source) {
            if (!(source instanceof Element)) return '';
            const explicit = source.getAttribute('data-headtext');
            if (explicit) return this.normalizeHeadtext(explicit);
            const canonical = source.matches('.subject_inner') ? source : source.querySelector('.subject_inner');
            if (canonical?.textContent?.trim()) return this.normalizeHeadtext(canonical.textContent);
            const valueNode = source.matches('[data-val]') ? source : source.querySelector('[data-val]');
            if (valueNode?.getAttribute('data-val')) return this.normalizeHeadtext(valueNode.getAttribute('data-val'));
            const directText = Array.from(source.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent || '')
                .join(' ');
            return this.normalizeHeadtext(directText || source.textContent || '');
        },
        collectDiscoveredHeadtexts() {
            const values = new Set();
            document.querySelectorAll('tr.ub-content, .custom-post-item, .view_bottom li').forEach((element) => {
                const descriptor = this.describeFilterTarget(element);
                if (descriptor?.isHeadtextTarget && descriptor.writerInfo && descriptor.headtext && !descriptor.isNotice) values.add(descriptor.headtext);
            });
            document.querySelectorAll('a[onclick*="listSearchHead"], .subject_morelist a, [data-fixture-headtext-nav]').forEach((element) => {
                const headtext = this.getCanonicalHeadtextFromNode(element);
                if (headtext && !['전체', '공지'].includes(headtext)) values.add(headtext);
            });
            return Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'));
        },
        async showHeadtextBlockManager() {
            document.getElementById(this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL)?.remove();
            const currentKey = this.getGalleryKey();
            const panel = document.createElement('section');
            panel.id = this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL;
            panel.className = 'dcuf-settings-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.style.cssText = 'position:fixed;z-index:2147483646;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100vw - 24px));max-height:min(680px,calc(100vh - 24px));overflow:auto;padding:18px;border:1px solid #8d98a6;border-radius:12px;background:#fff;color:#20242a;box-shadow:0 20px 60px #0007;box-sizing:border-box;';
            document.body.appendChild(panel);

            const render = async () => {
                const rules = await this.loadGalleryHeadtextBlocks();
                const current = new Set(currentKey ? (rules[currentKey] || []) : []);
                const discovered = Array.from(new Set([...this.collectDiscoveredHeadtexts(), ...current])).sort((a, b) => a.localeCompare(b, 'ko'));
                panel.replaceChildren();

                const header = document.createElement('div');
                header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;';
                const title = document.createElement('strong');
                title.textContent = '갤러리별 말머리 차단';
                const close = document.createElement('button');
                close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', '닫기');
                close.style.cssText = 'border:0;background:transparent;font-size:22px;cursor:pointer;color:inherit;';
                close.onclick = () => panel.remove();
                header.append(title, close);
                panel.appendChild(header);

                const keyLabel = document.createElement('div');
                keyLabel.textContent = currentKey ? `현재 갤러리: ${currentKey}` : '현재 페이지의 갤러리를 확인할 수 없습니다.';
                keyLabel.style.cssText = 'font-size:13px;color:#667085;margin-bottom:10px;';
                panel.appendChild(keyLabel);

                const choices = document.createElement('div');
                choices.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin-bottom:10px;';
                discovered.forEach((headtext) => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #d7dde5;border-radius:7px;cursor:pointer;min-width:0;';
                    const input = document.createElement('input');
                    input.type = 'checkbox'; input.checked = current.has(headtext); input.disabled = !currentKey;
                    input.addEventListener('change', async () => {
                        if (input.checked) current.add(headtext); else current.delete(headtext);
                        const next = { ...rules };
                        if (current.size) next[currentKey] = Array.from(current); else delete next[currentKey];
                        input.disabled = true;
                        await this.saveGalleryHeadtextBlocks(next, 'headtext checkbox');
                        await render();
                    });
                    const text = document.createElement('span'); text.textContent = headtext;
                    label.append(input, text); choices.appendChild(label);
                });
                if (!discovered.length) {
                    const empty = document.createElement('div'); empty.textContent = '현재 목록에서 발견한 말머리가 없습니다.'; empty.style.cssText = 'grid-column:1/-1;color:#667085;font-size:13px;'; choices.appendChild(empty);
                }
                panel.appendChild(choices);

                const manual = document.createElement('div');
                manual.style.cssText = 'display:flex;gap:7px;margin-bottom:10px;';
                const manualInput = document.createElement('input');
                manualInput.type = 'text'; manualInput.placeholder = '목록에 없는 말머리'; manualInput.disabled = !currentKey;
                manualInput.style.cssText = 'flex:1;min-width:0;padding:8px;border:1px solid #b9c2ce;border-radius:7px;';
                const add = document.createElement('button'); add.type = 'button'; add.textContent = '추가'; add.disabled = !currentKey;
                add.style.cssText = 'padding:8px 12px;border:1px solid #8793a2;border-radius:7px;background:#f6f8fb;cursor:pointer;';
                add.onclick = async () => {
                    const value = this.normalizeHeadtext(manualInput.value);
                    if (!value) return;
                    current.add(value);
                    await this.saveGalleryHeadtextBlocks({ ...rules, [currentKey]: Array.from(current) }, 'manual headtext add');
                    await render();
                };
                manualInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') add.click(); });
                manual.append(manualInput, add); panel.appendChild(manual);

                const clear = document.createElement('button');
                clear.type = 'button'; clear.textContent = '현재 갤러리 전체 해제'; clear.disabled = !currentKey || !current.size;
                clear.style.cssText = 'width:100%;padding:8px;border:1px solid #c5ccd5;border-radius:7px;background:transparent;color:inherit;cursor:pointer;margin-bottom:14px;';
                clear.onclick = async () => {
                    const next = { ...rules }; delete next[currentKey];
                    await this.saveGalleryHeadtextBlocks(next, 'clear current gallery headtexts');
                    await render();
                };
                panel.appendChild(clear);

                const savedTitle = document.createElement('strong'); savedTitle.textContent = '저장된 다른 갤러리'; panel.appendChild(savedTitle);
                const saved = document.createElement('div'); saved.style.cssText = 'display:grid;gap:7px;margin-top:8px;';
                const others = Object.entries(rules).filter(([key]) => key !== currentKey).sort(([a], [b]) => a.localeCompare(b));
                others.forEach(([key, values]) => {
                    const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d7dde5;border-radius:7px;';
                    const text = document.createElement('span'); text.textContent = `${key}: ${values.join(', ')}`; text.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px;';
                    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
                    remove.style.cssText = 'border:1px solid #d49a9a;border-radius:6px;background:#fff5f5;color:#b42318;padding:5px 8px;cursor:pointer;';
                    remove.onclick = async () => { const next = { ...rules }; delete next[key]; await this.saveGalleryHeadtextBlocks(next, 'remove saved gallery headtexts'); await render(); };
                    row.append(text, remove); saved.appendChild(row);
                });
                if (!others.length) { const none = document.createElement('div'); none.textContent = '다른 갤러리에 저장된 항목이 없습니다.'; none.style.cssText = 'font-size:13px;color:#667085;'; saved.appendChild(none); }
                panel.appendChild(saved);
            };
            await render();
        },
        // [v2.1.1 수정] 단축키 변경 모달 표시 (실시간 입력 감지 로직 개선)
        showShortcutChanger() {
            if (document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_MODAL)) return;


            const settingsPanel = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            settingsPanel.style.pointerEvents = 'none';


            const overlay = document.createElement('div');
            overlay.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL_OVERLAY;
            overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000;';
            document.body.appendChild(overlay);


            const modal = document.createElement('div');
            modal.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL;
            modal.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; z-index: 100001; text-align: center; box-shadow: 0 0 15px rgba(0,0,0,0.3);';
            modal.innerHTML = `
                <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">새로운 단축키를 입력하세요 (최대 3개)</h4>
                <div id="${this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW}" style="min-width: 200px; height: 40px; line-height: 40px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #333;">입력 대기 중...</div>
                <div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN}" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #3b71fd; background: #3b71fd; color: #fff; border-radius: 4px; cursor: pointer;">변경</button>
                    <button id="${this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN}" style="padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">취소</button>
                </div>
            `;
            document.body.appendChild(modal);


            let pressedKeys = new Set();
            let combinationTimeout = null;
            const previewEl = document.getElementById(this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW);


            const updatePreview = () => {
                if (pressedKeys.size > 0) {
                    previewEl.textContent = this.formatShortcutKeys(pressedKeys);
                } else {
                    previewEl.textContent = '입력 대기 중...';
                }
            };


            const keydownHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();


                // 타이머가 있다면, 아직 조합이 진행 중이라는 의미이므로 초기화
                clearTimeout(combinationTimeout);


                if (pressedKeys.size < 3) {
                    pressedKeys.add(e.key);
                    updatePreview();
                }


                // 키 입력이 0.5초간 없으면 현재 조합을 확정하고 Set을 비움
                combinationTimeout = setTimeout(() => {
                    pressedKeys.clear();
                }, 500);
            };


            const keyupHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 키를 떼는 시점은 조합 확정과 관련 없으므로, pressedKeys를 유지합니다.
            };


            document.addEventListener('keydown', keydownHandler, true);
            document.addEventListener('keyup', keyupHandler, true);




            const cleanup = () => {
                document.removeEventListener('keydown', keydownHandler, true);
                document.removeEventListener('keyup', keyupHandler, true);
                overlay.remove();
                modal.remove();
                settingsPanel.style.pointerEvents = 'auto';
            };


            document.getElementById(this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN).onclick = async () => {
                const newShortcut = previewEl.textContent;
                if (newShortcut && newShortcut !== '입력 대기 중...') {
                    await GM_setValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, newShortcut);
                    activeShortcutString = newShortcut;
                    activeShortcutObject = this.parseShortcutString(newShortcut);
                    document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY).textContent = newShortcut;
                    cleanup();
                } else {
                    alert('유효한 단축키를 입력해주세요.');
                }
            };


            document.getElementById(this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN).onclick = cleanup;
            overlay.onclick = cleanup;
        },
        // [v2.1 추가] 키 Set을 정해진 형식의 문자열로 변환
        formatShortcutKeys(keySet) {
            return DCUF_SHARED_STORAGE.formatShortcutKeys(keySet);
        },
        // [v2.1 추가] 단축키 문자열을 이벤트 비교용 객체로 변환
        parseShortcutString(shortcutString) {
            return DCUF_SHARED_STORAGE.parseShortcutString(shortcutString);
        },
        buildLookupSet(items, mapValue = (item) => item) {
            const set = new Set();
            if (!Array.isArray(items)) return set;
            items.forEach((item) => {
                const value = mapValue(item);
                if (value) set.add(value);
            });
            return set;
        },
        isFilterTargetDescriptor(value) {
            return Boolean(value && value.element instanceof HTMLElement);
        },
        normalizeFilterTarget(target, { includeHeadtext = true } = {}) {
            if (this.isFilterTargetDescriptor(target)) return target;
            return this.describeFilterTarget(target, { includeHeadtext });
        },
        isReplyOnlyCommentWrapper(element) {
            if (!(element instanceof HTMLElement)) return false;
            if (!this.isCommentListItem(element)) return false;
            return Boolean(element.querySelector(':scope > div.reply.show'))
                && !element.querySelector(':scope > div.cmt_info');
        },
        findWriterInfoForFilterTarget(element) {
            if (!(element instanceof HTMLElement)) return null;
            const directCommentWriter = element.querySelector(':scope > div.cmt_info .ub-writer');
            if (directCommentWriter instanceof HTMLElement) return directCommentWriter;

            const directReplyWriter = element.querySelector(':scope > div.reply_info .ub-writer');
            if (directReplyWriter instanceof HTMLElement) return directReplyWriter;

            if (this.isCommentListItem(element)) return null;
            return element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO);
        },
        isHeadtextFilterTarget(element) {
            if (!(element instanceof HTMLElement) || this.isCommentListItem(element)) return false;
            if (element.matches('tr.ub-content')) return true;
            return Boolean(element.closest('.view_bottom, .gall_listwrap'))
                && Boolean(element.querySelector('[data-headtext], .gall_subject'));
        },
        extractHeadtext(element) {
            if (!(element instanceof HTMLElement)) return '';
            const source = element.matches('[data-headtext]')
                ? element
                : element.querySelector('[data-headtext], .gall_subject');
            return this.getCanonicalHeadtextFromNode(source);
        },
        describeFilterTarget(element, { includeHeadtext = true } = {}) {
            if (!(element instanceof HTMLElement)) return null;
            if (this.isReplyOnlyCommentWrapper(element)) return null;

            const writerInfo = this.findWriterInfoForFilterTarget(element);
            const uid = writerInfo?.getAttribute('data-uid') || null;
            const nickname = writerInfo?.getAttribute('data-nick') || null;
            const writerDataIp = writerInfo?.getAttribute('data-ip') || null;
            const ipSpan = element.querySelector(this.CONSTANTS.SELECTORS.IP_SPAN);
            const ipText = ipSpan ? ipSpan.textContent.trim() : '';
            const ipFromSpan = (ipText.startsWith('(') && ipText.endsWith(')')) ? ipText.slice(1, -1) : ipText;
            const ip = ipFromSpan || writerDataIp || null;
            const ipPrefix = this.getIpPrefix(ip);
            const isHeadtextTarget = includeHeadtext && this.isHeadtextFilterTarget(element);
            const hasNoticeMarker = Boolean(element.querySelector('em.icon_notice'))
                || element.classList.contains('notice')
                || element.classList.contains('us-post--notice');
            // `.gall_num` exists on post rows, not comments. Keeping this lookup row-only
            // avoids adding a selector call to every repeated comment-filter pass.
            const isNotice = hasNoticeMarker || (element.tagName === 'TR'
                && this.normalizeHeadtext(element.querySelector('.gall_num')?.textContent || '') === '공지');

            return {
                element,
                writerInfo,
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest: Boolean((!uid || uid.length < 3) && ip),
                isNotice,
                shouldSkipFiltering: this.shouldSkipFiltering(element),
                hasBlockDisableClass: element.classList.contains('block-disable'),
                galleryKey: isHeadtextTarget ? this.getGalleryKey() : null,
                headtext: isHeadtextTarget ? this.extractHeadtext(element) : '',
                isHeadtextTarget
            };
        },
        describeFilterTargets(items) {
            if (!Array.isArray(items) || items.length === 0) return [];
            const seen = new Set();
            const descriptors = [];
            // The default rule set is empty. Avoid all headtext DOM probing on the
            // ordinary mutation hot path until the user has an active rule.
            const includeHeadtext = dcFilterSettings.galleryHeadtextBlockSet?.size > 0;
            items.forEach((item) => {
                const descriptor = this.normalizeFilterTarget(item, { includeHeadtext });
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement) || seen.has(element)) return;
                seen.add(element);
                descriptors.push(descriptor);
            });
            return descriptors;
        },
        applySyncToDescriptors(descriptors, { resetDisplay = false } = {}) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement)) return;
                if (resetDisplay && !dcFilterSettings.masterDisabled) {
                    // Comment items can already be hidden by async UID blocking.
                    // Clearing display before the next sync decision makes blocked comments briefly flash back in
                    // until a later async/stabilized pass hides them again, so preserve current visibility here.
                    if (!this.isCommentListItem(element)) {
                        element.style.display = '';
                    }
                }
                this.applySyncBlock(descriptor);
            });
        },
        applyAsyncToDescriptors(descriptors) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                void this.applyAsyncBlock(descriptor);
            });
        },
        applyFilterItems(items) {
            const descriptors = this.describeFilterTargets(items);
            if (descriptors.length === 0) return;
            this.applySyncToDescriptors(descriptors);
            this.applyAsyncToDescriptors(descriptors);
        },
        flushQueuedObservedFilterItems() {
            if (this._queuedObserverFilterRafId) {
                cancelAnimationFrame(this._queuedObserverFilterRafId);
                this._queuedObserverFilterRafId = 0;
            }
            if (this._queuedObserverFilterTimerId) {
                clearTimeout(this._queuedObserverFilterTimerId);
                this._queuedObserverFilterTimerId = 0;
            }
            if (!(this._queuedObserverFilterItems instanceof Set) || this._queuedObserverFilterItems.size === 0) return;
            const items = Array.from(this._queuedObserverFilterItems);
            this._queuedObserverFilterItems.clear();
            this.applyFilterItems(items);
        },
        queueObservedFilterItems(items) {
            if (!Array.isArray(items) || items.length === 0) return;
            if (!(this._queuedObserverFilterItems instanceof Set)) this._queuedObserverFilterItems = new Set();
            items.forEach((item) => {
                if (item instanceof HTMLElement) this._queuedObserverFilterItems.add(item);
            });
            if (this._queuedObserverFilterItems.size === 0) return;
            if (this._queuedObserverFilterRafId || this._queuedObserverFilterTimerId) return;

            this._queuedObserverFilterRafId = requestAnimationFrame(() => {
                this._queuedObserverFilterRafId = 0;
                this.flushQueuedObservedFilterItems();
            });
            this._queuedObserverFilterTimerId = window.setTimeout(() => {
                this._queuedObserverFilterTimerId = 0;
                this.flushQueuedObservedFilterItems();
            }, 80);
        },
        collectMutationFilterItems(payload, containerSelector, itemSelector, {
            attributeNames = [],
            includeChildListTargets = false
        } = {}) {
            if (!payload || typeof payload !== 'object') return [];
            const items = [];
            const seen = new Set();
            const watchedAttributes = new Set(attributeNames);
            const addItem = (element) => {
                if (!(element instanceof HTMLElement) || !element.isConnected || seen.has(element)) return;
                if (!element.matches(itemSelector) || !element.closest(containerSelector)) return;
                seen.add(element);
                items.push(element);
            };
            const scanTarget = (root) => {
                if (!(root instanceof Element)) return;
                addItem(root);
                const closestItem = root.closest(itemSelector);
                if (closestItem) addItem(closestItem);
            };
            const scanAddedRoot = (root) => {
                if (!(root instanceof Element)) return;
                scanTarget(root);
                if (typeof root.querySelectorAll === 'function') {
                    root.querySelectorAll(itemSelector).forEach(addItem);
                }
            };

            if (Array.isArray(payload.addedElements)) payload.addedElements.forEach(scanAddedRoot);
            if (Array.isArray(payload.records)) {
                payload.records.forEach((record) => {
                    if (record?.type === 'attributes' && watchedAttributes.has(record.attributeName)) {
                        scanTarget(record.target);
                    } else if (includeChildListTargets && record?.type === 'childList') {
                        scanTarget(record.target);
                    }
                });
            }
            return items;
        },
        collectImmediateCommentFilterItems(payload) {
            return this.collectMutationFilterItems(
                payload,
                this.CONSTANTS.SELECTORS.COMMENT_CONTAINER,
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                { attributeNames: ['data-uid', 'data-nick', 'data-ip'] }
            );
        },
        applyImmediateCommentMutations(payload) {
            const items = this.collectImmediateCommentFilterItems(payload);
            if (items.length === 0) return;
            const descriptors = this.describeFilterTargets(items);
            this.applySyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.immediateComment.runs');
            this.setRuntimeDiagnosticGauge('filter.immediateComment.lastTargetCount', descriptors.length);
        },
        getRuntimeCoordinator() {
            return window.__dcufRuntimeCoordinator || null;
        },
        incrementRuntimeDiagnostic(label, amount = 1) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.incrementDiagnostic === 'function') {
                runtimeCoordinator.incrementDiagnostic(label, amount);
            }
        },
        setRuntimeDiagnosticGauge(label, value) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.setDiagnosticGauge === 'function') {
                runtimeCoordinator.setDiagnosticGauge(label, value);
            }
        },
        getRelevantMutationGeneration(scope = 'all') {
            if (scope === 'comments') return Number(this._commentRelevantMutationGeneration) || 0;
            return Number(this._filterRelevantMutationGeneration) || 0;
        },
        markRelevantMutation(scope = 'all') {
            this._filterRelevantMutationGeneration = (Number(this._filterRelevantMutationGeneration) || 0) + 1;
            if (scope === 'comments') {
                this._commentRelevantMutationGeneration = (Number(this._commentRelevantMutationGeneration) || 0) + 1;
            }
            this.setRuntimeDiagnosticGauge('filter.relevantGeneration', this._filterRelevantMutationGeneration);
            this.setRuntimeDiagnosticGauge('filter.commentRelevantGeneration', Number(this._commentRelevantMutationGeneration) || 0);
        },
        getUserSumTaskQueue() {
            if (this._userSumTaskQueue) return this._userSumTaskQueue;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.createTaskQueue === 'function') {
                this._userSumTaskQueue = runtimeCoordinator.createTaskQueue('filter-user-sum', {
                    concurrency: this.ASYNC_UID_REQUEST_CONCURRENCY
                });
                return this._userSumTaskQueue;
            }

            this._userSumTaskQueue = {
                enqueue(run) {
                    return Promise.resolve().then(run);
                }
            };
            return this._userSumTaskQueue;
        },
        getNegativeUserSumCache(uid) {
            const cached = this.USER_SUM_NEGATIVE_CACHE.get(uid);
            if (!cached) return null;
            if (Date.now() - cached.ts > this.USER_SUM_NEGATIVE_TTL) {
                this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
                return null;
            }
            return cached;
        },
        pruneNegativeUserSumCache(now = Date.now()) {
            let removed = 0;
            this.USER_SUM_NEGATIVE_CACHE.forEach((entry, key) => {
                if (!entry || typeof entry.ts !== 'number' || now - entry.ts > this.USER_SUM_NEGATIVE_TTL) {
                    this.USER_SUM_NEGATIVE_CACHE.delete(key);
                    removed += 1;
                }
            });
            while (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES) {
                const oldestKey = this.USER_SUM_NEGATIVE_CACHE.keys().next().value;
                if (oldestKey === undefined) break;
                this.USER_SUM_NEGATIVE_CACHE.delete(oldestKey);
                removed += 1;
            }
            if (removed > 0) this.incrementRuntimeDiagnostic('filter.negativeUserSumCache.pruned', removed);
            this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            return removed;
        },
        setNegativeUserSumCache(uid, reason = 'error') {
            if (!uid) return null;
            const cached = { ts: Date.now(), reason };
            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
            this.USER_SUM_NEGATIVE_CACHE.set(uid, cached);
            this._negativeUserSumCacheWrites = (this._negativeUserSumCacheWrites + 1) % 32;
            if (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES || this._negativeUserSumCacheWrites === 0) {
                this.pruneNegativeUserSumCache(cached.ts);
            } else {
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            }
            return cached;
        },
        async getUserPostCommentSum(uid) {
            if (userSumCache[uid]) return userSumCache[uid];
            if (this.getNegativeUserSumCache(uid)) return null;
            if (this.INFLIGHT_USER_SUM_REQUESTS[uid]) return this.INFLIGHT_USER_SUM_REQUESTS[uid];
            const getCookie = (name) => { const v = `; ${document.cookie}`; const p = v.split(`; ${name}=`); if (p.length === 2) return p.pop().split(';').shift(); };
            let ci = getCookie(this.CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(this.CONSTANTS.ETC.COOKIE_NAME_2);
            if (!ci) return null;
            const taskQueue = this.getUserSumTaskQueue();
            const requestPromise = taskQueue.enqueue(() => new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.CONSTANTS.API.USER_INFO, true); xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'); xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');


                xhr.timeout = 5000;
                xhr.ontimeout = () => {
                    console.warn(`DCinside User Filter: User info request for UID ${uid} timed out.`);
                    this.setNegativeUserSumCache(uid, 'timeout');
                    resolve(null);
                };


                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const [post, comment] = xhr.responseText.split(',').map(x => parseInt(x, 10));
                        if (!isNaN(post) && !isNaN(comment)) {
                            const d = { sum: post + comment, post, comment };
                            userSumCache[uid] = d;
                            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                            resolve(d);
                        } else {
                            this.setNegativeUserSumCache(uid, 'parse');
                            resolve(null);
                        }
                    } else {
                        this.setNegativeUserSumCache(uid, `status:${xhr.status}`);
                        resolve(null);
                    }
                };
                xhr.onerror = () => {
                    this.setNegativeUserSumCache(uid, 'network');
                    resolve(null);
                };
                xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
            }));
            this.INFLIGHT_USER_SUM_REQUESTS[uid] = requestPromise;
            try {
                return await requestPromise;
            } finally {
                delete this.INFLIGHT_USER_SUM_REQUESTS[uid];
            }
        },
        updateBlockedUidWriteDiagnostics(reason = '') {
            const pendingEntries = this._blockedUidDirtyUids instanceof Map
                ? this._blockedUidDirtyUids.size
                : 0;
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.pendingEntries', pendingEntries);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.timerActive', this._blockedUidWriteTimerId ? 1 : 0);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.writeActive', this._blockedUidWritePromise ? 1 : 0);
            if (reason) this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastReason', reason);
        },
        waitForBlockedUidGeneration(generation) {
            if (this._blockedUidPersistedGeneration >= generation) return Promise.resolve();
            if (!Array.isArray(this._blockedUidWriteWaiters)) this._blockedUidWriteWaiters = [];
            return new Promise((resolve, reject) => {
                this._blockedUidWriteWaiters.push({ generation, resolve, reject });
            });
        },
        settleBlockedUidWriteWaiters(generation, error = null) {
            if (!Array.isArray(this._blockedUidWriteWaiters)) return;
            const pending = [];
            this._blockedUidWriteWaiters.forEach((waiter) => {
                if (waiter.generation > generation) {
                    pending.push(waiter);
                    return;
                }
                if (error) waiter.reject(error);
                else waiter.resolve();
            });
            this._blockedUidWriteWaiters = pending;
        },
        scheduleBlockedUidCachePersist(generation) {
            const waiter = this.waitForBlockedUidGeneration(generation);
            if (this._blockedUidWriteTimerId) window.clearTimeout(this._blockedUidWriteTimerId);
            this._blockedUidWriteTimerId = window.setTimeout(() => {
                this._blockedUidWriteTimerId = 0;
                this.updateBlockedUidWriteDiagnostics('timer');
                void this.flushBlockedUidCache('timer').catch((error) => {
                    console.warn('DCinside User Filter: blocked UID cache write failed.', error);
                });
            }, this.BLOCKED_UID_WRITE_DELAY);
            this.updateBlockedUidWriteDiagnostics('scheduled');
            return waiter;
        },
        flushBlockedUidCache(reason = 'manual') {
            if (this._blockedUidWriteTimerId) {
                window.clearTimeout(this._blockedUidWriteTimerId);
                this._blockedUidWriteTimerId = 0;
            }
            if (this._blockedUidWritePromise) {
                const activeWrite = this._blockedUidWritePromise;
                return activeWrite.catch(() => {}).then(() => this.flushBlockedUidCache(reason));
            }

            const generation = this._blockedUidDirtyGeneration;
            if (generation <= this._blockedUidPersistedGeneration) {
                this.updateBlockedUidWriteDiagnostics(reason);
                return Promise.resolve();
            }
            const dirtyUids = this._blockedUidDirtyUids instanceof Map
                ? Array.from(this._blockedUidDirtyUids.entries())
                    .filter(([, dirtyGeneration]) => dirtyGeneration <= generation)
                    .map(([uid]) => uid)
                : [];
            const serializedCache = JSON.stringify(this.BLOCKED_UIDS_CACHE);
            const writePromise = (async () => {
                try {
                    await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, serializedCache);
                    this._blockedUidPersistedGeneration = Math.max(this._blockedUidPersistedGeneration, generation);
                    dirtyUids.forEach((uid) => {
                        if (this._blockedUidDirtyUids?.get(uid) <= generation) this._blockedUidDirtyUids.delete(uid);
                    });
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.writes');
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.entries', dirtyUids.length);
                    this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastBatchSize', dirtyUids.length);
                    this.settleBlockedUidWriteWaiters(generation);
                } catch (error) {
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.failures');
                    this.settleBlockedUidWriteWaiters(generation, error);
                    throw error;
                } finally {
                    if (this._blockedUidWritePromise === writePromise) this._blockedUidWritePromise = null;
                    this.updateBlockedUidWriteDiagnostics(reason);
                }
            })();
            this._blockedUidWritePromise = writePromise;
            this.updateBlockedUidWriteDiagnostics(reason);
            return writePromise;
        },
        async addBlockedUid(uid, sum, post, comment, ratioBlocked) {
            if (!uid) return;
            const isMobile = this.isMobile();
            if (!isMobile) {
                await this.refreshBlockedUidsCache();
            }
            const nextEntry = { ts: Date.now(), sum, post, comment, ratioBlocked: !!ratioBlocked };
            const currentEntry = this.BLOCKED_UIDS_CACHE[uid];
            if (currentEntry
                && currentEntry.sum === nextEntry.sum
                && currentEntry.post === nextEntry.post
                && currentEntry.comment === nextEntry.comment
                && currentEntry.ratioBlocked === nextEntry.ratioBlocked) {
                return;
            }
            this.BLOCKED_UIDS_CACHE[uid] = nextEntry;
            if (!isMobile) {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
                return;
            }
            const generation = this._blockedUidDirtyGeneration + 1;
            this._blockedUidDirtyGeneration = generation;
            if (!(this._blockedUidDirtyUids instanceof Map)) this._blockedUidDirtyUids = new Map();
            this._blockedUidDirtyUids.set(uid, generation);
            this.incrementRuntimeDiagnostic('filter.blockedUidPersist.queuedEntries');
            await this.scheduleBlockedUidCachePersist(generation);
        },
        async getBlockedGuests() { try { return JSON.parse(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, '[]')); } catch { return []; } },
        async setBlockedGuests(list) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, JSON.stringify(list)); },
        async addBlockedGuest(ip) {
            if (!ip) return;
            if (!(dcFilterSettings.blockedGuestSet instanceof Set)) {
                dcFilterSettings.blockedGuestSet = new Set(Array.isArray(dcFilterSettings.blockedGuests) ? dcFilterSettings.blockedGuests : []);
            }
            if (dcFilterSettings.blockedGuestSet.has(ip)) return;
            if (!Array.isArray(dcFilterSettings.blockedGuests)) dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuests.push(ip);
            dcFilterSettings.blockedGuestSet.add(ip);
            await this.setBlockedGuests(dcFilterSettings.blockedGuests);
        },
        async clearBlockedGuests() {
            dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuestSet = new Set();
            await this.setBlockedGuests([]);
        },
        isUserBlocked({ sum, post, comment }) {
            return DCUF_SHARED_FILTER_CORE.evaluateUserStatsBlock({ sum, post, comment }, dcFilterSettings);
        },
        isUserStatsFilterActive(settings = dcFilterSettings) {
            if (!settings || settings.masterDisabled) return false;

            const threshold = Number(settings.threshold);
            if (Number.isFinite(threshold) && threshold > 0) return true;
            if (!settings.ratioEnabled) return false;

            return [settings.ratioMin, settings.ratioMax].some((value) => {
                const numeric = Number(value);
                return Number.isFinite(numeric) && numeric > 0;
            });
        },
        isCommentListItem(element) {
            return element instanceof HTMLElement && !!element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
        },
        setElementVisibility(element, shouldHide) {
            if (!(element instanceof HTMLElement)) return;
            if (element.hasAttribute('data-dcuf-parent-filtered')) {
                element.removeAttribute('data-dcuf-parent-filtered');
            }
            if (element.hasAttribute('data-dcuf-parent-placeholder')) {
                element.removeAttribute('data-dcuf-parent-placeholder');
            }
            if (element.classList.contains('dcuf-parent-comment-filtered')) {
                element.classList.remove('dcuf-parent-comment-filtered');
            }
            if (this.isCommentListItem(element)) {
                const stalePlaceholder = element.querySelector(':scope > .dcuf-comment-placeholder');
                if (stalePlaceholder instanceof HTMLElement) stalePlaceholder.remove();
            }
            const nextDisplay = shouldHide ? 'none' : '';
            if (element.style.display !== nextDisplay) element.style.display = nextDisplay;
        },
        async applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
            if (!userData || !(element instanceof HTMLElement) || !element.isConnected) return;
            const { sumBlocked, ratioBlocked } = this.isUserBlocked(userData);
            const shouldBeBlocked = sumBlocked || ratioBlocked;
            // UID statistics are an additional blocking reason, not an authority to reveal content.
            // A request can begin before a personal block is saved and resolve afterwards; letting a
            // negative statistics result call setElementVisibility(false) in that race briefly exposes
            // the personally blocked comment and starts a shell-attribute refilter loop.
            if (!shouldBeBlocked && element.getAttribute('data-dcuf-personal-blocked') === '1') {
                this.incrementRuntimeDiagnostic('filter.asyncAllow.suppressedPersonalBlock');
                return;
            }
            this.setElementVisibility(element, shouldBeBlocked);
            if (shouldBeBlocked) await addBlockedUidFn.call(this, uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        },
        shouldSkipFiltering(element) {
            const s = dcFilterSettings; if (!s.excludeRecommended || !this.isRecommendedContext()) return false;
            if (window.location.pathname.includes('/view/')) return !element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
            return true;
        },
        async applyAsyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor) return;

            const { element, writerInfo, uid, isNotice, shouldSkipFiltering } = descriptor;
            if (isNotice || shouldSkipFiltering) return;
            if (!this.isUserStatsFilterActive()) return;

            try {
                if (element.style.display === 'none') return;
                if (element.getAttribute('data-dcuf-personal-blocked') === '1') return;
                if (!(writerInfo instanceof HTMLElement)) return;
                if (!uid || uid.length < 3) return;
                if (this.BLOCKED_UIDS_CACHE[uid]) return;
                const userData = await this.getUserPostCommentSum(uid); if (!userData) return;
                await this.applyBlockFilterToElement(element, uid, userData, this.addBlockedUid);
            } catch (e) { console.warn(`DCinside User Filter: Async filter exception.`, e, element); }
        },
        async refreshBlockedUidsCache(rawValue = null) {
            let data; try { data = JSON.parse(rawValue === null ? await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, '{}') : rawValue); } catch { data = {}; }
            let changed = false;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                data = {};
                changed = true;
            }
            const now = Date.now();
            for (const [uid, cacheData] of Object.entries(data)) {
                if (typeof cacheData !== 'object' || cacheData === null || typeof cacheData.ts !== 'number' || now - cacheData.ts > this.BLOCK_UID_EXPIRE) { delete data[uid]; changed = true; }
            }
            this.BLOCKED_UIDS_CACHE = data;
            if (changed) await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
        },
        applySyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor?.writerInfo) return;

            const {
                masterDisabled,
                blockGuestEnabled,
                proxyBlockMode = 0,
                telecomBlockEnabled,
                blockedGuests = [],
                blockedGuestSet,
                customIpPrefixSet,
                personalBlockEnabled,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet
            } = dcFilterSettings;
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const proxyBlockEnabled = normalizedProxyBlockMode !== this.PROXY_MODE.OFF;

            const { element, uid, nickname, ip, ipText, writerDataIp, ipPrefix, isGuest, isNotice, shouldSkipFiltering, hasBlockDisableClass, galleryKey, headtext, isHeadtextTarget } = descriptor;
            const subject = {
                uid,
                nickname,
                ip,
                ipPrefix,
                isGuest,
                isNotice,
                shouldSkipFiltering,
                hasBlockDisableClass,
                galleryKey,
                headtext,
                isHeadtextTarget
            };
            const baseDebug = this.DEBUG_ENABLED ? {
                branch: 'sync-base',
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest,
                blockGuestEnabled,
                proxyBlockMode: normalizedProxyBlockMode,
                proxyBlockEnabled,
                telecomBlockEnabled
            } : null;

            const proxyMatchInfo = this.getProxyPrefixMatch(ipPrefix, normalizedProxyBlockMode);
            const telecomPrefixSet = telecomBlockEnabled && ipPrefix ? this.getTelecomPrefixSet() : null;
            const decision = DCUF_SHARED_FILTER_CORE.evaluateSyncBlockDecision({
                subject,
                settings: {
                    masterDisabled,
                    blockGuestEnabled,
                    proxyBlockMode: normalizedProxyBlockMode,
                    telecomBlockEnabled,
                    customIpPrefixSet,
                    personalBlockEnabled,
                    threshold: dcFilterSettings.threshold,
                    ratioEnabled: dcFilterSettings.ratioEnabled,
                    ratioMin: dcFilterSettings.ratioMin,
                    ratioMax: dcFilterSettings.ratioMax
                },
                matches: {
                    personalBlockHit: personalBlockEnabled && DCUF_SHARED_FILTER_CORE.isPersonalBlockHit(subject, {
                        uidSet: personalBlockUidSet,
                        nicknameSet: personalBlockNicknameSet,
                        ipSet: personalBlockIpSet
                    }),
                    hasCustomIpPrefixBlock: Boolean(customIpPrefixSet && customIpPrefixSet.size > 0 && ipPrefix && customIpPrefixSet.has(ipPrefix)),
                    proxyMatchInfo,
                    telecomPrefixMatch: Boolean(ipPrefix && telecomPrefixSet && telecomPrefixSet.has(ipPrefix)),
                    blockedGuestMatch: Boolean(ip && (blockedGuestSet instanceof Set ? blockedGuestSet.has(ip) : blockedGuests.includes(ip))),
                    galleryHeadtextBlock: Boolean(isHeadtextTarget && galleryKey && headtext && dcFilterSettings.galleryHeadtextBlockSet?.has(headtext))
                },
                blockedUidEntry: uid ? (this.BLOCKED_UIDS_CACHE[uid] || userSumCache[uid] || null) : null
            });
            const allowPersonalBlockReveal = Boolean(this._syncPassOptions?.allowPersonalBlockReveal);
            const wasPersonallyBlocked = element.getAttribute('data-dcuf-personal-blocked') === '1';

            if (decision.path === 'personal-block') {
                element.setAttribute('data-dcuf-personal-blocked', '1');
            } else if (decision.isBlocked) {
                element.removeAttribute('data-dcuf-personal-blocked');
            } else if (wasPersonallyBlocked && this.isCommentListItem(element) && !allowPersonalBlockReveal) {
                // Reply-merge / comment-stabilization passes can temporarily rebuild comment UI in a
                // state where personal-block metadata is not reliable yet. Keep already personal-blocked
                // comments hidden until a full refilter with refreshed settings explicitly reveals them.
                if (this.DEBUG_ENABLED) {
                    this.debugDecision(element, {
                        ...baseDebug,
                        branch: 'personal-block-hold',
                        isBlocked: true,
                        reasons: ['personalBlock-hold']
                    });
                }
                this.setElementVisibility(element, true);
                return;
            } else {
                element.removeAttribute('data-dcuf-personal-blocked');
            }

            if (this.DEBUG_ENABLED) {
                this.debugDecision(element, {
                    ...baseDebug,
                    branch: decision.path || 'sync-final',
                    isBlocked: decision.isBlocked,
                    reasons: decision.reasons,
                    blockedGuestsCount: blockedGuestSet instanceof Set ? blockedGuestSet.size : blockedGuests.length,
                    customIpPrefixCount: customIpPrefixSet instanceof Set ? customIpPrefixSet.size : 0,
                    hasCustomIpPrefixBlock: decision.hasCustomIpPrefixBlock,
                    proxyPrefixMatch: decision.proxyPrefixMatch,
                    proxyMatchTier: decision.proxyMatchTier,
                    telecomPrefixMatch: decision.telecomPrefixMatch,
                    blockedGuestMatch: decision.blockedGuestMatch
                });
            }
            this.setElementVisibility(element, decision.isBlocked);
        },
        initializeUniversalObserver() {
            const pageContext = window.__dcufPageContext || {};
            const targets = [];
            if (pageContext.hasListSurface) {
                targets.push(
                    { c: this.CONSTANTS.SELECTORS.POST_LIST_CONTAINER, i: this.CONSTANTS.SELECTORS.POST_ITEM, scope: 'posts' },
                    { c: this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER, i: 'li', scope: 'posts' }
                );
            }
            if (pageContext.hasComments) {
                targets.push({ c: this.CONSTANTS.SELECTORS.COMMENT_CONTAINER, i: this.CONSTANTS.SELECTORS.COMMENT_ITEM, scope: 'comments' });
            }
            if (targets.length === 0) return;
            const filterItems = (items) => this.applyFilterItems(items);
            const queueFilterItems = (items) => this.queueObservedFilterItems(items);
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function';
            const attachObserver = (container, itemSelector, { attachDomObserver = true } = {}) => {
                if (container.hasAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED)) return;
                container.setAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED, 'true');
                filterItems(Array.from(container.querySelectorAll(itemSelector)));
                if (!attachDomObserver) return;
                // [디버깅 추가]
                new MutationObserver(mutations => {
                    const newItems = [];
                    mutations.forEach(m => m.addedNodes.forEach(n => {
                        if (n.nodeType !== 1) return;
                        if (n.matches(itemSelector)) newItems.push(n); else if (n.querySelectorAll) newItems.push(...n.querySelectorAll(itemSelector));
                    }));
                    if (newItems.length > 0) queueFilterItems(newItems);
                }).observe(container, { childList: true, subtree: true });
            };
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i, { attachDomObserver: !hasRuntimeMutationBus })));

            if (hasRuntimeMutationBus) {
                if (typeof this._runtimeMutationUnsubscribe === 'function') this._runtimeMutationUnsubscribe();
                if (typeof this._runtimeImmediateMutationUnsubscribe === 'function') this._runtimeImmediateMutationUnsubscribe();
                if (typeof runtimeCoordinator.subscribeImmediateMutations === 'function') {
                    this._runtimeImmediateMutationUnsubscribe = runtimeCoordinator.subscribeImmediateMutations(
                        'filter-immediate-comment-visibility',
                        (payload) => this.applyImmediateCommentMutations(payload),
                        { contexts: ['comments'], mutationScope: 'comments' }
                    );
                }
                this._runtimeMutationUnsubscribe = runtimeCoordinator.subscribeMutations('filter-universal-observer', (payload) => {
                    let hasRelevantMutation = false;
                    let hasCommentMutation = false;
                    targets.forEach((target) => {
                        const changedContainers = payload.collectMatches(target.c);
                        changedContainers.forEach((container) => attachObserver(container, target.i, { attachDomObserver: false }));
                        const changedItems = this.collectMutationFilterItems(payload, target.c, target.i, {
                            attributeNames: ['class', 'id', 'data-uid', 'data-nick', 'data-ip'],
                            includeChildListTargets: true
                        });
                        if (changedContainers.length > 0 || changedItems.length > 0) {
                            hasRelevantMutation = true;
                            if (target.scope === 'comments') hasCommentMutation = true;
                        }
                        if (changedItems.length > 0) queueFilterItems(changedItems);
                    });
                    if (hasRelevantMutation) this.markRelevantMutation(hasCommentMutation ? 'comments' : 'all');
                }, { contexts: ['list-surface'] });
                return;
            }

            const mainContainer = document.querySelector(this.CONSTANTS.SELECTORS.MAIN_CONTAINER);
            const observerTarget = mainContainer || document.body;
            const bodyObserver = new MutationObserver(mutations => {
                mutations.forEach(m => m.addedNodes.forEach(n => {
                    if (n.parentNode && n.parentNode.closest && (n.parentNode.closest('#dc-backup-popup') || n.parentNode.closest('#dc-block-management-panel') || n.parentNode.closest('#dcinside-filter-setting'))) {
                        return;
                    }
                    if (n.nodeType === 1 && !n.closest('.user_data')) {
                        targets.forEach(t => {
                            if (n.matches(t.c)) attachObserver(n, t.i);
                            else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i));
                        });
                    }
                }));
            });
            bodyObserver.observe(observerTarget, { childList: true, subtree: true });
        },
        loadBootSnapshot() {
            if (this._bootSnapshotPromise) return this._bootSnapshotPromise;
            const keys = this.CONSTANTS.STORAGE_KEYS;
            this._bootSnapshotPromise = Promise.all([
                GM_getValue(keys.BLOCK_CONFIG_MIGRATION_V275_DONE, false),
                GM_getValue(keys.MASTER_DISABLED, false),
                GM_getValue(keys.EXCLUDE_RECOMMENDED, false),
                GM_getValue(keys.THRESHOLD),
                GM_getValue(keys.RATIO_ENABLED, false),
                GM_getValue(keys.RATIO_MIN, ''),
                GM_getValue(keys.RATIO_MAX, ''),
                GM_getValue(keys.BLOCK_GUEST, false),
                GM_getValue(keys.BLOCK_PROXY, 0),
                GM_getValue(keys.BLOCK_TELECOM, false),
                GM_getValue(keys.BLOCKED_GUESTS, '[]'),
                GM_getValue(keys.BLOCK_CONFIG, {}),
                GM_getValue(keys.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] }),
                GM_getValue(keys.PERSONAL_BLOCK_ENABLED, true),
                GM_getValue(keys.GALLERY_HEADTEXT_BLOCKS, {}),
                GM_getValue(keys.BLOCKED_UIDS, '{}')
            ]).then((values) => {
                const [
                    migrationDone, masterDisabled, excludeRecommended, rawThreshold, ratioEnabled,
                    ratioMin, ratioMax, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                    blockedGuestsRaw, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocks, blockedUidsRaw
                ] = values;
                let blockedGuests = [];
                try { blockedGuests = JSON.parse(blockedGuestsRaw); } catch { blockedGuests = []; }
                const snapshot = {
                    migrationDone,
                    masterDisabled,
                    excludeRecommended,
                    threshold: rawThreshold === undefined ? 0 : rawThreshold,
                    thresholdMissing: rawThreshold === undefined,
                    ratioEnabled,
                    ratioMin,
                    ratioMax,
                    blockGuestEnabled,
                    proxyBlockMode,
                    telecomBlockEnabled,
                    blockedGuests: Array.isArray(blockedGuests) ? blockedGuests : [],
                    blockConfig,
                    personalBlockList,
                    personalBlockEnabled,
                    galleryHeadtextBlocks,
                    blockedUidsRaw
                };
                this._bootSnapshot = snapshot;
                window.__dcufBootController?.note?.('boot.storage-snapshot', { keys: values.length });
                return snapshot;
            }).catch((error) => {
                this._bootSnapshotPromise = null;
                throw error;
            });
            return this._bootSnapshotPromise;
        },
        getBootSnapshot() {
            return this._bootSnapshot || null;
        },
        createSettingsSignature(settings = dcFilterSettings) {
            if (!settings || typeof settings !== 'object') return '';
            const normalizeStrings = (values) => (Array.isArray(values) ? values : [])
                .map((value) => String(value ?? ''))
                .filter(Boolean)
                .sort();
            const personalBlockList = settings.personalBlockList || {};
            return JSON.stringify({
                masterDisabled: Boolean(settings.masterDisabled),
                excludeRecommended: Boolean(settings.excludeRecommended),
                threshold: Number(settings.threshold) || 0,
                ratioEnabled: Boolean(settings.ratioEnabled),
                ratioMin: String(settings.ratioMin ?? ''),
                ratioMax: String(settings.ratioMax ?? ''),
                blockGuestEnabled: Boolean(settings.blockGuestEnabled),
                proxyBlockMode: this.normalizeProxyBlockMode(settings.proxyBlockMode),
                telecomBlockEnabled: Boolean(settings.telecomBlockEnabled),
                blockedGuests: normalizeStrings(settings.blockedGuests),
                customIpPrefixes: settings.customIpPrefixSet instanceof Set
                    ? Array.from(settings.customIpPrefixSet, (value) => String(value)).sort()
                    : [],
                personalBlockEnabled: Boolean(settings.personalBlockEnabled),
                personalUids: normalizeStrings((personalBlockList.uids || []).map((item) => item?.id)),
                personalNicknames: normalizeStrings(personalBlockList.nicknames),
                personalIps: normalizeStrings(personalBlockList.ips),
                galleryHeadtextBlocks: settings.galleryHeadtextBlocks || {}
            });
        },
        async reloadSettings(snapshot = null) {
            let values;
            if (snapshot) {
                values = [
                    snapshot.masterDisabled, snapshot.excludeRecommended, snapshot.threshold,
                    snapshot.ratioEnabled, snapshot.ratioMin, snapshot.ratioMax,
                    snapshot.blockGuestEnabled, snapshot.proxyBlockMode, snapshot.telecomBlockEnabled,
                    snapshot.blockedGuests, snapshot.blockConfig, snapshot.personalBlockList,
                    snapshot.personalBlockEnabled, snapshot.galleryHeadtextBlocks
                ];
            } else {
                values = await Promise.all([
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                    this.getBlockedGuests(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
                    PersonalBlockModule.loadPersonalBlocks(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {})
                ]);
            }
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                blockedGuests, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocksRaw
            ] = values;
            const normalizedSettings = DCUF_SHARED_STORAGE.normalizeStoredFilterSettings({
                [this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED]: masterDisabled,
                [this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED]: excludeRecommended,
                [this.CONSTANTS.STORAGE_KEYS.THRESHOLD]: threshold,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED]: ratioEnabled,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MIN]: ratioMin,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MAX]: ratioMax,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST]: blockGuestEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY]: proxyBlockMode,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM]: telecomBlockEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG]: blockConfig,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST]: personalBlockList,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED]: personalBlockEnabled
            });
            const customIpPrefixSet = new Set(DCUF_SHARED_STORAGE.parseIpPrefixList(blockConfig?.ip || '', this.CONSTANTS.ETC.MOBILE_IP_MARKER));
            const blockedGuestSet = this.buildLookupSet(blockedGuests);
            const personalBlockUidSet = this.buildLookupSet(personalBlockList?.uids, (item) => item?.id);
            const personalBlockNicknameSet = this.buildLookupSet(personalBlockList?.nicknames);
            const personalBlockIpSet = this.buildLookupSet(personalBlockList?.ips);
            const galleryHeadtextBlocks = this.normalizeGalleryHeadtextBlocks(galleryHeadtextBlocksRaw);
            const galleryKey = this.getGalleryKey();
            const galleryHeadtextBlockSet = new Set(galleryKey ? (galleryHeadtextBlocks[galleryKey] || []) : []);
            dcFilterSettings = {
                masterDisabled: normalizedSettings.masterDisabled,
                excludeRecommended: normalizedSettings.excludeRecommended,
                threshold: normalizedSettings.threshold,
                ratioEnabled: normalizedSettings.ratioEnabled,
                ratioMin: normalizedSettings.ratioMin,
                ratioMax: normalizedSettings.ratioMax,
                blockGuestEnabled: normalizedSettings.blockGuest,
                proxyBlockMode: normalizedSettings.proxyBlockMode,
                proxyBlockEnabled: normalizedSettings.proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: normalizedSettings.telecomBlockEnabled,
                blockedGuests,
                blockedGuestSet,
                customIpPrefixSet,
                personalBlockList,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet,
                personalBlockEnabled,
                galleryHeadtextBlocks,
                galleryKey,
                galleryHeadtextBlockSet
            };
            this._settingsSignature = this.createSettingsSignature(dcFilterSettings);
            if (this.DEBUG_ENABLED) {
                this.debugLog('settings', 'reloadSettings complete', this.debugSettingsSnapshot({
                    rawBlockConfigIp: typeof blockConfig?.ip === 'string' ? blockConfig.ip : '',
                    rawBlockConfigPreview: typeof blockConfig?.ip === 'string' ? blockConfig.ip.split('||').slice(0, 20) : []
                }));
            }
            return dcFilterSettings;
        },
        getRefilterTargetSelectors(scope = 'all') {
            const commentSelectors = [
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                'li[id^="comment_li_"]',
                'li[id^="reply_li_"]',
                'li[id^="img_comment_li_"]',
                'li[id^="mg_comment_li_"]'
            ];
            const postSelectors = [
                this.CONSTANTS.SELECTORS.POST_ITEM,
                `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`
            ];

            if (scope === 'comments') return commentSelectors;
            if (scope === 'posts') return postSelectors;
            return [...postSelectors, ...commentSelectors];
        },
        resolveRefilterRoot(root = document) {
            if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
            return document;
        },
        getRefilterTargets(scope = 'all', root = document) {
            const queryRoot = this.resolveRefilterRoot(root);
            const selectors = this.getRefilterTargetSelectors(scope);
            const selectorText = selectors.join(', ');
            const seen = new Set();
            const candidates = [];

            if (queryRoot instanceof Element && queryRoot.matches(selectorText)) candidates.push(queryRoot);
            if (typeof queryRoot.querySelectorAll === 'function') {
                candidates.push(...queryRoot.querySelectorAll(selectorText));
            }

            return candidates.reduce((descriptors, element) => {
                if (!(element instanceof HTMLElement) || seen.has(element)) return descriptors;
                seen.add(element);
                const descriptor = this.describeFilterTarget(element, {
                    includeHeadtext: dcFilterSettings.galleryHeadtextBlockSet?.size > 0
                });
                if (descriptor) descriptors.push(descriptor);
                return descriptors;
            }, []);
        },
        runSyncRefilterPass(scope = 'all', root = document, descriptors = null, options = null) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const measureDuration = Boolean(runtimeCoordinator?._diagnosticsEnabled) && typeof performance?.now === 'function';
            const startedAt = measureDuration ? performance.now() : 0;
            const targetDescriptors = Array.isArray(descriptors) ? descriptors : this.getRefilterTargets(scope, root);
            const previousSyncPassOptions = this._syncPassOptions;
            this._syncPassOptions = options && typeof options === 'object' ? options : null;
            try {
                this.applySyncToDescriptors(targetDescriptors, { resetDisplay: true });
            } finally {
                this._syncPassOptions = previousSyncPassOptions;
            }
            this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.runs`);
            this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastTargetCount`, targetDescriptors.length);
            if (measureDuration) {
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastDurationMs`, Math.round((performance.now() - startedAt) * 1000) / 1000);
            }
            return targetDescriptors;
        },
        scheduleSyncRefilterPasses(scope = 'all', root = document) {
            if (this._syncRefilterRafId) cancelAnimationFrame(this._syncRefilterRafId);
            if (!this._syncRefilterTimerIds) this._syncRefilterTimerIds = new Set();
            this._syncRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._syncRefilterTimerIds.clear();

            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = Boolean(runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function');
            let lastGeneration = this.getRelevantMutationGeneration(scope);
            const rerun = (phase, { force = false } = {}) => {
                const generation = this.getRelevantMutationGeneration(scope);
                if (!force && hasRuntimeMutationBus && generation === lastGeneration) {
                    this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.skippedUnchanged`);
                    return;
                }
                this.runSyncRefilterPass(scope, root);
                lastGeneration = this.getRelevantMutationGeneration(scope);
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastPhase`, phase);
            };
            this._syncRefilterRafId = requestAnimationFrame(() => {
                this._syncRefilterRafId = 0;
                rerun('raf', { force: true });
            });
            [90, 220].forEach((delay) => {
                const timerId = window.setTimeout(() => {
                    this._syncRefilterTimerIds.delete(timerId);
                    rerun(`delay:${delay}`);
                }, delay);
                this._syncRefilterTimerIds.add(timerId);
            });
        },
        scheduleCommentStabilizedRefilter(reason = 'comment-stabilized', roots = null) {
            if (this._commentRefilterRafId) cancelAnimationFrame(this._commentRefilterRafId);
            if (!this._commentRefilterTimerIds) this._commentRefilterTimerIds = new Set();
            this._commentRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._commentRefilterTimerIds.clear();

            const requestedRoots = roots && typeof roots[Symbol.iterator] === 'function'
                ? Array.from(roots)
                : (roots ? [roots] : [document]);
            this.debugLog('comment-refilter', 'scheduleCommentStabilizedRefilter', { reason, rootCount: requestedRoots.length });
            this._commentRefilterRafId = requestAnimationFrame(() => {
                this._commentRefilterRafId = 0;
                const descriptors = [];
                const seenElements = new Set();
                requestedRoots.forEach((root) => {
                    if (root instanceof Element && !root.isConnected) return;
                    this.getRefilterTargets('comments', this.resolveRefilterRoot(root)).forEach((descriptor) => {
                        if (!descriptor?.element || seenElements.has(descriptor.element)) return;
                        seenElements.add(descriptor.element);
                        descriptors.push(descriptor);
                    });
                });
                if (descriptors.length === 0) {
                    this.incrementRuntimeDiagnostic('filter.syncPass.comments.skippedEmptyRoots');
                    return;
                }
                this.runSyncRefilterPass('comments', document, descriptors);
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastPhase', 'raf:root-scoped');
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastRootCount', requestedRoots.length);
            });
        },
        getVisibilityRecoverySurface() {
            const pageType = window.__dcufRuntimeCoordinator?.getPageContext?.().type
                || window.__dcufPageContext?.type
                || 'other';
            if (pageType === 'lists') {
                return document.querySelector('table.gall_list, .gall_listwrap, .list_wrap');
            }
            if (pageType === 'view') {
                return document.querySelector('.writing_view_box, .gallview_contents, .view_content_wrap');
            }
            if (pageType === 'write') {
                return document.querySelector('form#write, form[name="modify"][action*="modify_submit"], #write_wrap, .gall_write, .write_box');
            }
            return document.body;
        },
        captureHiddenVisibilityState() {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-hidden-snapshot')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const bfcacheState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            this._visibilityCycleId += 1;
            this._hiddenAt = Date.now();
            this._hiddenMutationGeneration = generation;
            this._hiddenBody = document.body;
            this._hiddenRecoverySurface = this.getVisibilityRecoverySurface();
            this._hiddenBfcacheRecoveryId = Number(bfcacheState.id) || 0;
            this.incrementRuntimeDiagnostic('lifecycle.visibility.hidden');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.hiddenGeneration', generation);
        },
        getHiddenVisibilitySnapshot() {
            return {
                cycleId: this._visibilityCycleId,
                hiddenAt: this._hiddenAt,
                mutationGeneration: this._hiddenMutationGeneration,
                body: this._hiddenBody,
                recoverySurface: this._hiddenRecoverySurface,
                bfcacheRecoveryId: this._hiddenBfcacheRecoveryId
            };
        },
        isMatchingBfcacheRecovery(snapshot, recoveryState) {
            return Boolean(
                snapshot?.hiddenAt
                && recoveryState?.succeeded
                && Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt)
                && recoveryState.body === document.body
            );
        },
        async restoreVisibleState(snapshot) {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();

            let recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            const recoveryBelongsToCycle = Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt || 0)
                && recoveryState.body === document.body;
            if (recoveryState.pending && recoveryBelongsToCycle) {
                await runtimeCoordinator.waitForBfcacheRecovery?.();
                recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || recoveryState;
            }

            if (this.isMatchingBfcacheRecovery(snapshot, recoveryState)) {
                await reloadShortcutKey();
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedBfcache');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'bfcache-handled');
                return { restored: false, reason: 'bfcache-handled' };
            }

            const previousSettingsSignature = this._settingsSignature;
            const [, shortcutState] = await Promise.all([
                this.reloadSettings(),
                reloadShortcutKey()
            ]);
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-visible-check')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const currentSurface = this.getVisibilityRecoverySurface();
            const reasons = [];
            if (generation !== snapshot.mutationGeneration) reasons.push('mutation');
            if (snapshot.body !== document.body || (snapshot.body && !snapshot.body.isConnected)) reasons.push('body');
            if (snapshot.recoverySurface !== currentSurface
                || (snapshot.recoverySurface && !snapshot.recoverySurface.isConnected)) reasons.push('surface');
            if (previousSettingsSignature !== this._settingsSignature) reasons.push('settings');
            if (snapshot.hiddenAt && Date.now() - snapshot.hiddenAt >= this.VISIBILITY_LONG_RESTORE_MS) reasons.push('long-suspend');

            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.shortcutChanged', Boolean(shortcutState?.changed));
            if (reasons.length === 0) {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedClean');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'clean');
                return { restored: false, reason: 'clean', shortcutChanged: Boolean(shortcutState?.changed) };
            }

            const reason = `visibilitychange-visible:${reasons.join('+')}`;
            await this.refilterAllContent(reason, {
                scheduleFollowups: false,
                settingsAlreadyLoaded: true
            });
            this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.runs');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', reasons.join(','));
            return { restored: true, reason, shortcutChanged: Boolean(shortcutState?.changed) };
        },
        async runFullRefilterPass(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!settingsAlreadyLoaded) await this.reloadSettings();
            const descriptors = this.getRefilterTargets('all');
            this.startDebugPass(reason, { targetCount: descriptors.length });
            this.runSyncRefilterPass('all', document, descriptors, {
                allowPersonalBlockReveal: true
            });
            if (scheduleFollowups) this.scheduleSyncRefilterPasses();
            this.applyAsyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.fullRefilter.runs');
            this.setRuntimeDiagnosticGauge('filter.fullRefilter.lastTargetCount', descriptors.length);
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
        async refilterAllContent(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!this._pendingFullRefilterReasons) this._pendingFullRefilterReasons = [];
            this._pendingFullRefilterReasons.push({ reason, scheduleFollowups, settingsAlreadyLoaded });

            if (this._refilterAllContentRunning) {
                this.debugLog('refilter', 'coalesced full refilter request', {
                    reason,
                    pendingCount: this._pendingFullRefilterReasons.length
                });
                return this._refilterAllContentPromise;
            }

            this._refilterAllContentRunning = true;
            this._refilterAllContentPromise = (async () => {
                while (this._pendingFullRefilterReasons.length > 0) {
                    const pendingRequests = this._pendingFullRefilterReasons.splice(0);
                    const lastRequest = pendingRequests[pendingRequests.length - 1];
                    const runReason = pendingRequests.length > 1
                        ? `${lastRequest.reason} [coalesced:${pendingRequests.length}]`
                        : lastRequest.reason;
                    const shouldScheduleFollowups = pendingRequests.some((request) => request.scheduleFollowups !== false);
                    const settingsWereLoaded = pendingRequests.every((request) => request.settingsAlreadyLoaded === true);
                    await this.runFullRefilterPass(runReason, {
                        scheduleFollowups: shouldScheduleFollowups,
                        settingsAlreadyLoaded: settingsWereLoaded
                    });
                }
            })();

            try {
                await this._refilterAllContentPromise;
            } finally {
                this._refilterAllContentRunning = false;
                this._refilterAllContentPromise = null;
            }
        },
        async handleVisibilityChange() {
            if (document.visibilityState !== 'visible') {
                this.captureHiddenVisibilityState();
                await this.flushBlockedUidCache('visibility-hidden');
                return;
            }
            if (this._visibilityRecoveryPromise) return this._visibilityRecoveryPromise;

            const snapshot = this.getHiddenVisibilitySnapshot();
            this._visibilityRecoveryPromise = this.restoreVisibleState(snapshot).catch(async (error) => {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.failed');
                console.warn('[DCUF lifecycle] visibility restore failed; running fallback refilter.', error);
                await this.refilterAllContent('visibilitychange-visible:fallback', { scheduleFollowups: false });
                return { restored: true, reason: 'fallback' };
            }).finally(() => {
                this._visibilityRecoveryPromise = null;
                if (this._visibilityCycleId === snapshot.cycleId && document.visibilityState === 'visible') {
                    this._hiddenAt = 0;
                    this._hiddenMutationGeneration = 0;
                    this._hiddenBody = null;
                    this._hiddenRecoverySurface = null;
                    this._hiddenBfcacheRecoveryId = 0;
                }
            });
            return this._visibilityRecoveryPromise;
        },
        init() {
            if (this._initState === 'ready') return Promise.resolve('already-ready');
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                this.installDebugApi();
                this.debugLog('init', 'FilterModule init start', { version: '__VERSION__' });
                const snapshot = await this.loadBootSnapshot();
                await this.cleanupLegacyManagedBlockConfig(snapshot);
                await this.reloadSettings(snapshot);
                await this.refreshBlockedUidsCache(snapshot.blockedUidsRaw);
                if (!this._visibilityChangeHandler) {
                    this._visibilityChangeHandler = () => this.handleVisibilityChange();
                    document.addEventListener('visibilitychange', this._visibilityChangeHandler);
                }
                if (!this._blockedUidPagehideHandler) {
                    this._blockedUidPagehideHandler = () => {
                        void this.flushBlockedUidCache('pagehide').catch((error) => {
                            console.warn('DCinside User Filter: pagehide blocked UID flush failed.', error);
                        });
                    };
                    window.addEventListener('pagehide', this._blockedUidPagehideHandler);
                }
                this.initializeUniversalObserver();
                window.__dcufBootController?.note?.('boot.local-filter-settings-ready');
                if (snapshot.thresholdMissing) {
                    const showFirstRunSettings = async () => {
                        await GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0);
                        await this.showSettings();
                    };
                    const bootController = window.__dcufBootController;
                    if (typeof bootController?.onReady === 'function') bootController.onReady(showFirstRunSettings);
                    else queueMicrotask(showFirstRunSettings);
                }
                this._initState = 'ready';
                return 'ready';
            })().catch((error) => {
                this._initState = 'failed';
                this._initPromise = null;
                throw error;
            });
            return this._initPromise;
        }
    };

    // post-main-fixes.js는 별도 IIFE 스코프라 FilterModule 심볼을 직접 못 잡을 수 있습니다.
    // 유지보수 시 후처리 코드가 FilterModule을 참조해야 하면 이 브리지로 접근하세요.
    window.__dcufFilterModule = FilterModule;
