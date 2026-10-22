import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPage } from '../testbed/fixtures/pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const b1PreviewOutput = path.join(root, 'artifacts/ui-overview-2026-10-17/b1-list');

// A design-only consumer of the existing non-sensitive native-shaped fixture.
// It is not part of either userscript build and never injects a second runtime.
export async function buildB1ListPreview() {
    await mkdir(b1PreviewOutput, { recursive: true });
    let html = listPage({ variant: 'minor' });
    html = html.replace('<title>DCUF minor list fixture</title>', '<title>B1 · 글 목록 동작 시안</title>')
        .replace('<link rel="stylesheet" href="/__testbed/fixture.css">', '<link rel="stylesheet" href="presentation.css">')
        .replace('<body data-fixture-page=', '<body data-b1-preview="1" data-theme="light" data-fixture-page=')
        .replace(/<aside id="dcuf-testbed-controls"[\s\S]*?<\/aside>/, '')
        .replace(/<a id="fixture-to-view"[\s\S]*?<\/a>/, '')
        .replace('src="/__testbed/fixture-client.js"', 'src="fixture-client.js"')
        .replace('</body>', '<script type="module" src="host-preview.mjs"></script></body>');
    await writeFile(path.join(b1PreviewOutput, 'list.html'), html);
    await copyFile(path.join(root, 'testbed/public/fixture-client.js'), path.join(b1PreviewOutput, 'fixture-client.js'));
    for (const name of ['presentation.css', 'host-preview.mjs', 'index.html']) {
        await copyFile(path.join(root, 'design-prototypes/b1-list', name), path.join(b1PreviewOutput, name));
    }
    return b1PreviewOutput;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(await buildB1ListPreview());
}
