import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = process.env.DCUF_VISUAL_REVIEW_OUTPUT;
if (!output) throw new Error('Run through node tools/visual-review.mjs --help');
export default {
    testDir: path.dirname(fileURLToPath(import.meta.url)),
    testMatch: 'image-review.spec.mjs',
    outputDir: path.join(output, 'results'),
    snapshotPathTemplate: path.join(output, 'baselines', '{arg}{ext}'),
    updateSnapshots: 'none',
    workers: 1,
    retries: 0,
    forbidOnly: true,
    reporter: [['list'], ['html', { outputFolder: path.join(output, 'report'), open: 'never' }], ['json', { outputFile: path.join(output, 'results.json') }]],
    expect: { toMatchSnapshot: { threshold: 0.2, maxDiffPixels: 0 } }
};
