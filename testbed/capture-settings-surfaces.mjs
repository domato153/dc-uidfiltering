import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';
import { startServer } from './server/server.mjs';

const testbedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const rootDir = path.resolve(testbedDir, '..');
const outputIndex = process.argv.indexOf('--output-dir');
const outputDir = path.resolve(rootDir, outputIndex >= 0 ? process.argv[outputIndex + 1] : 'artifacts/settings-surfaces');
const captureDark = process.argv.includes('--dark');
await mkdir(outputDir, { recursive: true });
const runtimePath = await resolveBuiltUserscript();
const runtimeBytes = await readFile(runtimePath);
console.log(`Runtime under capture: ${runtimePath}`);
console.log(`Runtime SHA-256: ${createHash('sha256').update(runtimeBytes).digest('hex').toUpperCase()}`);

const server = await startServer();
const browser = await launchBrowser();
const storage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
    [storageKeys.palette]: 'blue',
};
const surfaces = [
    { id: 'filter-settings', label: '글댓합 설정하기', selector: '#dcinside-filter-setting' },
    { id: 'personal-management', label: '차단 유저 관리', selector: '#dc-block-management-panel' },
    { id: 'convenience-settings', label: '모바일 편의기능 설정', selector: '#dcuf-mobile-convenience-settings' },
    { id: 'palette', label: 'UI 색상 설정', selector: '#dcuf-palette-panel' },
];

try {
    for (const surface of surfaces) {
        const session = await createTestPage(browser, server.baseUrl, { storage, viewport: { width: 390, height: 844 } });
        try {
            await session.goto('/board/lists?id=test');
            if (captureDark) await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            await session.page.evaluate((label) => window.__dcufTestbedGM.invokeMenu(label), surface.label);
            const panel = session.page.locator(surface.selector);
            await panel.waitFor({ state: 'visible' });
            const filePath = path.join(outputDir, `${surface.id}${captureDark ? '-dark' : ''}.png`);
            await panel.screenshot({ path: filePath, animations: 'disabled' });
            console.log(`${surface.id}: ${filePath}`);

            if (surface.id === 'personal-management') {
                await panel.locator('.panel-backup-btn').click();
                const backup = session.page.locator('#dc-backup-popup');
                await backup.waitFor({ state: 'visible' });
                const backupPath = path.join(outputDir, `backup${captureDark ? '-dark' : ''}.png`);
                await backup.screenshot({ path: backupPath, animations: 'disabled' });
                console.log(`backup: ${backupPath}`);
            }
        } finally {
            await session.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}
