import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectHeaderCases, headerCaseVerdict, headerChecks } from '../testbed/harness/header-live-canary.mjs';
import { reportVerdict } from '../testbed/harness/live-site-contract.mjs';

const contract = JSON.parse(await readFile('verification/header-live-canary.json'));
const startupContract = JSON.parse(await readFile('verification/live-site-canary.json'));
const cases = selectHeaderCases(contract, startupContract);
assert.equal(cases.length, 16);
const copy = value => structuredClone(value);
const popup = { display: 'block', area: [200, 100], hit: true, inViewport: true, underSource: true };
const closed = { ready: true, drawerOpen: '0', sourceMarker: null, sourceArea: [0, 0], cloneCount: 0, topology: true, ownerCount: 1,
  tip: { display: 'none', area: [0, 0] }, rank: { display: 'none', area: [0, 0] } };
const opened = { ...closed, drawerOpen: '1', sourceMarker: '1', sourceArea: [360, 100], sourceHit: true, nativeActionHit: true, childWidthsContained: true };
const positive = { httpStatus: 200, surface: 'minor', dcufErrorCount: 0,
  url: 'https://gall.dcinside.com/mgallery/board/lists/?id=aoegame', finalUrl: 'https://gall.dcinside.com/mgallery/board/lists/?id=aoegame',
  environment: { viewport: [390, 500], desktopUA: true, gmShimPresent: false, dark: true, nativeDarkSheet: true, requestedDark: true },
  gnb: { positive: true, contained: true, background: 'rgb(56, 104, 223)', expectedBackground: 'rgb(56, 104, 223)' },
  steps: [{ label: 'initial', observation: closed }, { label: 'open-drawer', action: 'completed' }, { label: 'drawer-open', observation: opened },
    ...['tip', 'rank'].flatMap(name => [
      { label: `open-${name}`, action: 'completed' }, { label: `${name}-open`, observation: { ...opened, [name]: popup } },
      { label: `close-drawer-with-${name}`, action: 'completed' },
      { label: `${name}-popup-only`, observation: { ...opened, drawerOpen: '0', popupOnly: '1', [name]: popup } },
      { label: `close-${name}`, action: 'completed' }, { label: `${name}-closed`, observation: closed }
    ]), { label: 'drawer-closed', observation: closed }] };
assert.equal(headerCaseVerdict(positive), 'PASS');
let count = 1;
for (const mutate of [
  r => { r.steps.find(s => s.label === 'tip-open').observation.tip.area = [0, 0]; },
  r => { r.steps.find(s => s.label === 'rank-popup-only').observation.rank.hit = false; },
  r => { r.steps.find(s => s.label === 'rank-popup-only').observation.rank.inViewport = false; },
  r => { r.steps.find(s => s.label === 'tip-closed').observation.tip = popup; },
  r => { r.steps.find(s => s.label === 'rank-closed').observation.rank = popup; },
  r => { r.steps.find(s => s.label === 'tip-popup-only').observation.drawerOpen = '1'; },
  r => { r.steps.find(s => s.label === 'drawer-open').observation.cloneCount = 1; },
  r => { r.steps.at(-1).observation.sourceMarker = '1'; },
  r => { r.steps.at(-1).observation.topology = false; },
  r => { r.steps.find(s => s.label === 'open-rank').action = 'failed'; },
  r => { r.steps = r.steps.filter(s => s.label !== 'close-tip'); },
  r => { r.environment.nativeDarkSheet = false; },
  r => { r.environment.gmShimPresent = true; },
  r => { r.gnb.background = 'rgb(59, 72, 144)'; },
  r => { r.steps.find(s => s.label === 'drawer-open').observation.ownerCount = 2; },
  r => { r.dcufErrorCount = 1; },
  r => { r.finalUrl = 'https://gall.dcinside.com/mgallery/board/lists/?id=other-gallery'; },
  r => { r.checks = Object.fromEntries(Object.keys(headerChecks(r)).map(k => [k, true])); r.steps = []; }
]) { const result = copy(positive); mutate(result); assert.equal(headerCaseVerdict(result), 'FAIL'); count++; }
const major = copy(positive); major.surface = 'major';
major.steps = major.steps.filter(s => !/tip|rank/.test(s.label));
major.steps.find(s => s.label === 'drawer-open').observation.pager = '1/2';
major.steps.splice(-1, 0, { label: 'next-page', action: 'completed' }, { label: 'after-next', observation: { ...opened, pager: '2/2' } });
assert.equal(headerCaseVerdict(major), 'PASS'); count++;
major.steps.find(s => s.label === 'after-next').observation.pager = '1/2';
assert.equal(headerCaseVerdict(major), 'FAIL'); count++;
for (const mutate of [c => { c.routes[0].url = 'https://gall.dcinside.com/board/delete/'; },
  c => { c.routes[0].url = 'https://example.org/board/lists/'; }, c => { c.viewports[0].width = 10000; },
  c => { c.themes.push('private-theme'); }, c => { c.control.path = 'debug.log'; }]) {
  const changed = copy(contract); mutate(changed); assert.throws(() => selectHeaderCases(changed, startupContract)); count++;
}
console.log(`Header actual-extension contracts: ${count} positive/negative controls PASS; no live PASS implied.`);
const binding = { candidateSha256: 'A'.repeat(64), controlSha256: 'B'.repeat(64), extensionSha256: 'C'.repeat(64) };
const good = { binding, selectedCases: ['sample'], profiles: Object.fromEntries(['candidate', 'control'].map(role => [role,
  { installed: true, userScriptsAllowed: true, registeredAtDocumentStart: true, isolated: true, servedSha256: binding[role + 'Sha256'] }])),
  results: ['candidate', 'control'].map(role => ({ ...copy(positive), role, id: 'sample' })) };
assert.equal(reportVerdict(good, headerCaseVerdict), 'PASS');
const changed = copy(good); changed.results[1].steps = []; assert.equal(reportVerdict(changed, headerCaseVerdict), 'PASS');
changed.results[0].steps = []; assert.equal(reportVerdict(changed, headerCaseVerdict), 'FAIL');
const partial = copy(good); partial.results.pop(); assert.equal(reportVerdict(partial, headerCaseVerdict), 'UNAVAILABLE');
const unavailable = copy(good); unavailable.results[1].unavailable = '403'; assert.equal(reportVerdict(unavailable, headerCaseVerdict), 'UNAVAILABLE');
const observer = await readFile('testbed/harness/header-live-canary.mjs', 'utf8');
assert.ok(!/\.addInitScript\s*\(|gm-shim\.js|createTestPage\s*\(|eval\s*\(|force:\s*true|\.dispatchEvent\s*\(/.test(observer), 'Synthetic execution/forced pointer is forbidden');
console.log('Header aggregate controls: 6 isolation/false-pass/native-input controls PASS.');
const markerStripped = copy(good); markerStripped.results[1].httpStatus = 403;
assert.equal(reportVerdict(markerStripped, headerCaseVerdict), 'UNAVAILABLE', 'Non-200 control cannot bless a candidate');
assert.throws(() => selectHeaderCases(contract, { ...startupContract, candidatePath: 'Dc_UserFilter_Mobile_v3.5.5.user.js' }),
  'Cross-contract candidate path must remain guarded');
console.log('Header stripped-marker/cross-contract controls: 2 PASS.');
