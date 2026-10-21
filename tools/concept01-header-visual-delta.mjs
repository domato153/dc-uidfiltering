import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Invert only the explicitly approved CSS changes, retaining the independent
// historical reference and every existing purity/owner/phase mutation check.
const registration = JSON.parse(readFileSync(new URL('../verification/concept01-header-visual-delta.json', import.meta.url),'utf8'));
export function restoreConcept01HeaderVisualDelta(source) {
  if (!source.includes('// dcuf-concept01-visual-v1:')) return source;
  source=source.replaceAll('\r\n','\n');
  const owners=registration.sources.filter(({family})=>source.includes(`function __dcufBuild${family}ThemeCss`));
  assert.ok(owners.length,'Registered Concept01 visual owner required');
  for(const owner of owners){
    const functionStart=source.indexOf(`function __dcufBuild${owner.family}ThemeCss`);
    const start=source.lastIndexOf('    // dcuf-concept01-visual-v1:',functionStart);
    const ending=`    __dcufRoot.__dcuf${owner.family}Presenter = __dcuf${owner.family}Presenter;`;
    const end=source.indexOf(ending,functionStart)+ending.length;
    assert.ok(start>=0&&end>functionStart,`Exact owner boundaries: ${owner.sourceRef}`);
    let section=source.slice(start,end)+'\n';
    for(const {candidate,control} of owner.patches){
      assert.equal(section.split(candidate).length-1,1,`Exact approved visual fragment: ${owner.sourceRef}`);
      section=section.replace(candidate,control);
    }
    source=source.slice(0,start)+section.slice(0,-1)+source.slice(end);
  }
  return source;
}
