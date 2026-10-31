import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchBrowser} from './harness/runner-utils.mjs';
import {resolveBuiltUserscript} from './harness/userscript-loader.mjs';
import {runLoginEntryContract} from './ui-b1-login-contract.mjs';
assert.ok(process.argv.includes('--require-runtime-under-test'));
const runtime=await resolveBuiltUserscript();assert.equal(path.basename(runtime),'runtime-under-test.user.js');
console.log('Guarded login runtime:',runtime,createHash('sha256').update(await readFile(runtime)).digest('hex').toUpperCase());
const browser=await launchBrowser();try{await runLoginEntryContract({browser,outputDirectory:process.argv.includes('--output-directory')?process.argv[process.argv.indexOf('--output-directory')+1]:undefined});}finally{await browser.close();}
