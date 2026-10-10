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
        #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .info_policy, .copyrigh, .ad_bottom_list, .bottom_paging_box + div, .intro_bg, .fixed_write_btn, .bottom_movebox, #zzbang_ad ,#zzbang_div,#zzbang_div .my_zzal, .my_dccon,
        .gall_exposure, .stickyunit, #kakao_search, .banner_box, #ad-layer,#ad-layer-closer, #ad_floating, .__dcNewsWidgetTypeB__, .dctrend_ranking, .cm_ad, .con_banner.writing_banbox, [id^="criteo-"], .ad_left_wing_right_top._BTN_AD_, .ad_left_wing_list_top._BTN_AD_,
        .ad_left_wing_list_top, div:has(> script[src*="list@right_wing_game"]),
        .adv_bottom_write, ins.kakao_ad_area, em.icon_ad {
            display: none !important;
        }


        /* --- 기본 레이아웃 재정의 --- */
        ${__dcufBuildHeaderDrawerVisibilityCss()}
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


        html, body, #top, #container, .wrap_inner, .visit_bookmark,
        .list_array_option, .left_content,
        .view_content_wrap, .gall_content, .gall_comment, .comment_box {
            width: 100% !important; /* 100vw 대신 100% 사용 */
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
        ${__dcufBuildHeaderShellResetCss()}
        ${__dcufBuildHeaderGnbResetCss()}
        #container { padding-top: 5px; }


        /* 목록 옵션의 clearfix는 갤러리 헤더와 별개로 유지합니다. */
        .list_array_option::after {
            content: ""; display: table; clear: both;
        }


        /* [추가] 일반/마이너 갤러리 글 목록 상단 공통 여백 */
        .list_array_option {
            margin-bottom: 10px !important;
        }


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
        .gall_content, .gall_tit_box, .gall_writer_info, .view_bottom, .gall_comment {
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

        /* [v2.2.0 이식] 댓글 가독성 개선 (box-sizing 추가를 위해 위치 이동) */
        .comment_box .date_time {
            font-size: 15px !important;
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

        body.dc-filter-dark-mode .minor_intro_area {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
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
        body.dc-filter-dark-mode .view_bottom {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }

        /* 댓글은 반전 필터의 영향을 받지 않으므로 그대로 밝은 색 설정 */
        body.dc-filter-dark-mode .comment_box .usertxt {
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
                /* DCUF_SHARED_FILTER_UI_DARK_END */
    `;

    const __dcufActiveFilterCss = [
        ['.custom-mobile-list', '.dcuf-retired-custom-mobile-list'],
        ['.custom-post-item', '.dcuf-retired-custom-post-item'],
        ['.custom-bottom-controls', '.dcuf-retired-custom-bottom-controls'],
        ['.list_array_option', '.dcuf-retired-list-array-option'],
        ['.post-title', '.dcuf-retired-post-title'],
        ['.post-meta', '.dcuf-retired-post-meta'],
    ].reduce((css, [legacySelector, retiredSelector]) => css.replaceAll(legacySelector, retiredSelector), __dcufAllFilterCss);
    const __dcufCssMarkers = Object.freeze({
        view: '/* DCUF_VIEW_SURFACE_START */',
        ui: '/* DCUF_SHARED_FILTER_UI_START */',
        uiEnd: '/* DCUF_SHARED_FILTER_UI_END */',
        uiDark: '/* DCUF_SHARED_FILTER_UI_DARK_START */',
        uiDarkEnd: '/* DCUF_SHARED_FILTER_UI_DARK_END */'
    });
    const __dcufCssIndex = (marker) => {
        const index = __dcufActiveFilterCss.indexOf(marker);
        if (index < 0) throw new Error(`DCUF CSS marker missing: ${marker}`);
        return index;
    };
    const __dcufViewCssIndex = __dcufCssIndex(__dcufCssMarkers.view);
    const __dcufUiCssIndex = __dcufCssIndex(__dcufCssMarkers.ui);
    const __dcufUiCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiEnd) + __dcufCssMarkers.uiEnd.length;
    const __dcufUiDarkCssIndex = __dcufCssIndex(__dcufCssMarkers.uiDark);
    const __dcufUiDarkCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiDarkEnd) + __dcufCssMarkers.uiDarkEnd.length;
    const __dcufCoreFilterCss = __dcufActiveFilterCss.slice(0, __dcufViewCssIndex);
    const __dcufViewFilterCss = __dcufActiveFilterCss.slice(__dcufViewCssIndex, __dcufUiCssIndex);
    const __dcufGlobalDarkCss = __dcufActiveFilterCss.slice(__dcufUiCssEndIndex, __dcufUiDarkCssIndex);
    const __dcufLazyFilterUiCss = __dcufSharedFilterUiCss;
    const __dcufFabShellCss = __dcufSharedFabShellCss;

    let __dcufFabShellStyleOwner = null;
    if (__dcufFilterPageContext.hasListSurface) {
        GM_addStyle(`${__dcufCoreFilterCss}\n${__dcufGlobalDarkCss}`);
        __dcufHeaderShellHostAdapter.ensureStyle();
        __dcufGalleryPageHeadHostAdapter.ensureStyle();
        __dcufHeaderGnbHostAdapter.ensureStyle();
        __dcufHeaderRecentVisitHostAdapter.ensureStyle();
        __dcufFabShellStyleOwner = GM_addStyle(__dcufFabShellCss) || null;
    }
    if (__dcufFilterPageContext.isView) GM_addStyle(__dcufViewFilterCss);

    let __dcufFilterUiStylesLoaded = false;
    const __dcufEnsureFilterUiStyles = () => {
        if (__dcufFilterUiStylesLoaded) return false;
        GM_addStyle(__dcufLazyFilterUiCss);
        __dcufFabShellStyleOwner?.remove?.();
        __dcufFabShellStyleOwner = null;
        __dcufFilterUiStylesLoaded = true;
        window.__dcufFilterUiStylesLoaded = true;
        window.__dcufDiagnostics?.increment?.('style.filterUi.lazyLoads');
        return true;
    };
    window.__dcufFilterUiStylesLoaded = false;
    window.__dcufEnsureFilterUiStyles = __dcufEnsureFilterUiStyles;


    if (__dcufFilterPageContext.hasListSurface) GM_addStyle(`
        /* [v2.7.5] 댓글/글목록 닉네임 폭 보정 */
        .dcuf-retired-post-meta {
            justify-content: flex-start !important;
            gap: 10px !important;
        }
        .dcuf-retired-post-meta .author {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            max-width: calc(100% - 120px) !important;
            justify-content: flex-start !important;
            overflow: visible !important;
        }
        .dcuf-retired-post-meta .author .gall_writer,
        .dcuf-retired-post-meta .author .addbox {
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
        .dcuf-retired-post-meta .author .nickname {
            max-width: min(56vw, 420px) !important;
        }
        .dcuf-retired-post-meta .author .ip {
            flex: 0 0 auto !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
        }
        .dcuf-retired-post-meta .stats {
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
            .dcuf-retired-post-meta .author {
                max-width: 100% !important;
            }
            .dcuf-retired-post-meta .author .nickname {
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
