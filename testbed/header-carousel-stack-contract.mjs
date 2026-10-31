import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {loadDrawerPresenter} from './header-drawer-body-contract.mjs';
import {drawerPriorityControl,restoreHistoricalDrawerPriorities} from '../tools/header-drawer-priority-contract.mjs';

export const recommendationStackSelector='.issue_wrap:has(#gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"])';
const entries=[
 ['door','.issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"]'],
 ['recommendation','.issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"]'],
 ['relationPopup','.issue_wrap > #relation_popup[data-dcuf-header-relation-popup="1"]'],
 ['relationStatic','.issue_wrap > #relation_popup[data-dcuf-header-relation-static="1"]'],
 ['fluid','*:not(#hot_rank_pop2):not(#hot_rank_pop2 *)'],['intro','.minor_intro_box'],['ranking','.minor_ranking_box'],
 ['buttonDecoration','.btn_mgall_dcp'],['closeDecoration','.under_poply_close'],['rankPopup','#hot_rank_pop2'],['tipPopup','#hot_tip_pop'],
 ['recommendationPaging','.pageing_box'],['recommendationText','.concept_txtlist'],['recommendationImage','.concept_img'],
 ['recommendationStack',recommendationStackSelector]
];
const freeze=rows=>Object.freeze(rows.map(([slot,selector])=>Object.freeze({slot,selector})));
const canonical=css=>css.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').trim();
const hash=css=>createHash('sha256').update(canonical(css)).digest('hex').toUpperCase();
const historicalHash='90B5E8E00C5FA2835915AD3D8F6267655FC43A247615FA26C44FD2418343BC8D'; // Exact F272 control, actual adapter inputs.
const validate=style=>{
 const rule=`            [data-dcuf-header-drawer-scope="1"] ${recommendationStackSelector} {\n                z-index: 1002;\n            }\n`;
 assert.equal(style.css.split(rule).length,2,'Exactly one declared open-ancestor rule');
 const historicalCss=restoreHistoricalDrawerPriorities(style.css);
 assert.equal(hash(historicalCss.replace(rule,'')),historicalHash,'After exactly the declared56 priority restorations, all other CSS, media, predicates and order equal frozen F272');
};
export async function validateCarouselStackBoundary(){
 const source=await readFile('src/targets/mobile/header-drawer-presenter.js','utf8'),adapter=await readFile('src/targets/mobile/header-drawer-host-adapter.js','utf8');
 const presenter=loadDrawerPresenter(source),bindings=freeze(entries),style=presenter.describeNativeStyle(bindings);
 assert.deepEqual(JSON.parse(JSON.stringify(presenter.nativeStyleSlots)),entries.map(([slot])=>slot));
 assert.ok(Object.isFrozen(style));validate(style);validate(presenter.describeNativeStyle(freeze([...entries].reverse())));
 const start=adapter.indexOf("const STYLE_ID = 'dcuf-header-drawer-style';"),end=adapter.indexOf('const BODY_SCOPE_ATTR =',start);assert.ok(start>=0&&end>start);
 const production=vm.runInNewContext(`(()=>{${adapter.slice(start,end)}return nativeStyleDefinition;})()`,{__dcufHeaderDrawerPresenter:presenter});validate(production);
 for(const [slot]of entries){const changed=presenter.describeNativeStyle(freeze(entries.map(([s,selector])=>[s,s===slot?`.negative-${s}`:selector])));
  assert.ok(changed.css.includes(`.negative-${slot}`));assert.notEqual(canonical(changed.css),canonical(style.css));}
 let rejected=0;for(const css of [style.css.replace('z-index: 1002;','z-index: 1001;'),style.css.replace(recommendationStackSelector,'.wrong-native-stack'),style.css.replace('z-index: 60;','z-index: 59;'),
  style.css.replace('position: relative;','position: relative !important;'),style.css.replace('left: 50% !important;','left: 50%;'),style.css+'\n.dcuf-unlisted-carousel-rule { color:red; }']){
  assert.throws(()=>validate({...style,css}));rejected++;}
 for(const malformed of [bindings.slice(0,-1),Object.freeze(bindings.slice(0,-1)),Object.freeze([...bindings,{slot:'extra',selector:'.extra'}]),Object.freeze(bindings.map(x=>({...x})))]){assert.throws(()=>presenter.describeNativeStyle(malformed));rejected++;}
 return {historicalControlSha256:'F272E4FE3A915FA7C0C41D4A46ED7743647751521EFB06AF9004E33593114036',historicalCssSha256:historicalHash,priorityControl:drawerPriorityControl,slots:entries.length,independentSelectorInputs:entries.length,rejectedFaults:rejected,scope:'one declared stacking rule and exact56 priority delta; otherwise full frozen CSS'};
}
