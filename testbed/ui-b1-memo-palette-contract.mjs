import assert from 'node:assert/strict';
import {createSettingsState} from './ui-b1-native-settings-contract.mjs';
import {populateMemoRows} from './ui-b1-memo-workbench-contract.mjs';
import {assertNoRuntimeErrors,getMetrics,storageKeys} from './harness/runner-utils.mjs';

// Exercise the real palette dialog/commit port against synthetic Testbed GM
// storage. No root-attribute shortcut, live user settings or native memo save.
export async function runMemoPaletteContract({browser,server}) {
 const records=[];
 for(const dark of [false,true]) {
  const e=await createSettingsState(browser,server,{dark});
  try {
   await e.page.evaluate(()=>window.__settingsFixture.open('memo'));
   await e.page.waitForFunction(()=>document.querySelector('#user_memo_config')?.dataset.dcufGalleryPageHeadRole==='settings-popup-memo');
   await populateMemoRows(e.page);
   await e.page.locator('#chk_sample_0').check();
   const read=()=>e.page.evaluate(()=>{
    const root=document.querySelector('#user_memo_config'),style=q=>getComputedStyle(root.querySelector(q));
    const tab=style('.tab_menubox button.on'),sort=style('.sort button.on'),box=style('#chk_sample_0'),row=style('.memo_list > li:has(input:checked)'),primary=style('#user_memo_cont > .btn_box > button');
    return {tabInk:tab.color,tabUnderline:tab.borderBottomColor,sortInk:sort.color,sortFace:sort.backgroundColor+'|'+sort.backgroundImage,checkbox:box.accentColor,selectedRow:row.backgroundColor,primaryInk:primary.color,primaryFace:primary.backgroundColor+'|'+primary.backgroundImage,authoredMemoColors:[...root.querySelectorAll('.mone')].map(n=>({inline:n.style.color,rendered:getComputedStyle(n).color}))};
   });
   const initial=await read(),samples=[];
   for(const id of ['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']) {
    await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
    const panel=e.page.locator('#dcuf-palette-panel');
    await panel.locator(`[data-palette-id="${id}"]`).click();
    assert.equal(await e.page.locator('html').getAttribute('data-dcuf-palette'),id,'Actual palette preview updates');
    const preview=await read();
    await panel.locator('[data-dcuf-palette-action="save"]').click();
    await panel.waitFor({state:'detached'});
    assert.equal(await e.page.evaluate(key=>window.__dcufTestbedGM.snapshot().values[key],storageKeys.palette),id,'Synthetic palette commit persisted');
    const saved=await read();assert.deepEqual(saved,preview,'All memo accents keep the selected palette after save');
    assert.deepEqual(saved.authoredMemoColors,initial.authoredMemoColors,'User-authored memo colors are independent of UI accent');
    samples.push({id,...saved});
   }
   for(const key of ['tabInk','tabUnderline','sortInk','sortFace','checkbox','selectedRow','primaryInk','primaryFace']) {
    assert.equal(new Set(samples.map(s=>s[key])).size,14,`${key} follows every existing ${dark?'dark':'light'} palette`);
   }
   // Cancel must restore every dependent accent, rather than only the palette ID.
   const committed=await read();await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
   const panel=e.page.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="blue"]').click();
   assert.notDeepEqual(await read(),committed);await panel.locator('[data-dcuf-palette-action="cancel"]').click();
   assert.deepEqual(await read(),committed,'Cancel restores all dependent surfaces');
   assert.equal(await e.page.evaluate(()=>window.__settingsFixture.preserved()),true);
   assert.equal(await e.page.evaluate(()=>window.__settingsFixture.traces.some(t=>/writeSet|chkDel|chkCopy/.test(t.action))),false);
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({dark,palettes:samples.length,accentProperties:8,cancelRestored:true});
  } finally {await e.close()}
 }
 return records;
}
