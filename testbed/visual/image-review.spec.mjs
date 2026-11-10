import { test, expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const output = process.env.DCUF_VISUAL_REVIEW_OUTPUT;
const input = JSON.parse(await readFile(path.join(output, 'inputs.json'), 'utf8'));
for (const item of input.cases) {
    test(`${item.id} · ${item.width}×${item.height} · ${item.theme}`, async ({}, testInfo) => {
        await testInfo.attach('provenance', { body: JSON.stringify({ purpose: input.purpose, provenance: input.provenance, ...item }, null, 2), contentType: 'application/json' });
        if (input.designReference) await testInfo.attach('selected-design-reference', { path: path.join(output, input.designReference.preview), contentType: 'image/png' });
        // Keep Playwright's decoder, pixelmatch, error, attachments and native
        // expected/actual/diff viewer together; do not reimplement a diff engine.
        expect(await readFile(path.join(output, 'candidates', `${item.id}.png`))).toMatchSnapshot(`${item.id}.png`);
    });
}
