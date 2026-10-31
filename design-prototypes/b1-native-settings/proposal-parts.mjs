// Independent target projection, native anatomy acquired before product styling.
export function projectSettingsProposal() {
 const attr='data-dcuf-gallery-page-head-role';
 const roots=[['#user_memo_config:has(> .umome_wrap)','memo'],['#user_block','block'],['#headTail_lay','headtail'],['#spoiler_set_lyr','spoiler'],['#trusted_site_config','trusted'],['#autozzal_setting_pop','auto']];
 for(const[selector,kind]of roots)for(const root of document.querySelectorAll(selector)){
  const mark=(selector,role,base=root)=>base.querySelectorAll(selector).forEach(n=>n.setAttribute(attr,'settings-'+role));root.setAttribute(attr,'settings-popup-'+kind);
  mark('.pop_content','panel');mark('.pop_head','head');mark('.pop_head > h3','title');mark(':scope > .pop_content > .inner,.block_setting_box > .inner,.post_guide > .guide_txtbox','body');
  mark('.tab_menubox,.block_tab','tabs');mark('.tab_menubox > button,.block_tab > button','tab');mark('.tabbox,.set_cont,.spoiler_subject,.spoiler_memo','section');mark('.inr,.setting_onoff,.set_cont.add_text,.part_schbox','row');
  mark('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),textarea','field');mark('textarea','textarea');mark('.textarea_box','field-wrap');
  mark('button:not(.sel_color):not(.sp_img),.btn_txtbox > button','button');mark('.btn_blue,.btn_apply,.btn_enroll','primary');
  mark('.tab_menubox > button,.block_tab > button','tab');mark('.setting_onoff > button','switch');mark('.pop_head .btn_my_autozzal','head-action');
  mark('.btn_box','actions');mark('.btn_box > .btn_blue,.btn_box > .btn_apply','primary');mark('.pop_info,.info_txt,.info_txtbox,.empty_box','message');
  mark('.memo_list,.site_list,.block_list,.scrollarea','list');mark('.cont_tit,.tit,.set_cont.add_text > label','label');mark('.block_setting_box','flow');mark('.info_txt > p,.info_txtbox > p,.pop_info > p,.empty_box > p,.guide_txtbox > p,.set_cont > p','message-copy');mark('.sel_color','swatch');
  mark('.poply_whiteclose,.poply_bgblueclose,.under.poply_close','close');mark('.poply_whiteclose > .sp_img,.poply_bgblueclose > .sp_img,.under.poply_close > .sp_img','close-icon');
  mark('#user_memo_backup,#um_picker_lay,#picker_lay,#another_go,#img_up_info_pop,#autozzal_img_notice_box','popup-nested');mark('.pop_bg','scrim');
 }
}
