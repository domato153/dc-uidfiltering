import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const storeId = 'dhdgffkkebhmkfjojejmpbldmpobfkfo';
export const downloadUrl = 'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=149.0.7827.55&acceptformat=crx3&x='
    + encodeURIComponent(`id=${storeId}&installsource=ondemand&uc`);
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

export function unpackCrx(bytes) {
    assert.equal(bytes.subarray(0, 4).toString(), 'Cr24', 'Not a CRX package');
    assert.equal(bytes.readUInt32LE(4), 3, 'Only signed CRX3 packages are supported');
    const start = 12 + bytes.readUInt32LE(8);
    assert.ok(start < bytes.length && bytes.readUInt32LE(start) === 0x04034b50, 'Missing CRX ZIP payload');
    const zip = bytes.subarray(start);
    let end = zip.length - 22;
    while (end >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(end) !== 0x06054b50) end--;
    assert.ok(end >= 0 && zip.readUInt32LE(end) === 0x06054b50, 'Missing ZIP central directory');
    assert.equal(zip.readUInt16LE(end + 4), 0, 'Multi-disk ZIP is unsupported');
    assert.equal(zip.readUInt16LE(end + 6), 0, 'Multi-disk ZIP is unsupported');
    const count = zip.readUInt16LE(end + 10);
    assert.ok(count > 0 && count < 10000, 'Invalid ZIP entry count');
    let cursor = zip.readUInt32LE(end + 16);
    const entries = new Map();
    let total = 0;
    for (let index = 0; index < count; index++) {
        assert.equal(zip.readUInt32LE(cursor), 0x02014b50, 'Invalid ZIP directory entry');
        const flags = zip.readUInt16LE(cursor + 8);
        const method = zip.readUInt16LE(cursor + 10);
        const compressed = zip.readUInt32LE(cursor + 20);
        const size = zip.readUInt32LE(cursor + 24);
        const nameSize = zip.readUInt16LE(cursor + 28);
        const extraSize = zip.readUInt16LE(cursor + 30);
        const commentSize = zip.readUInt16LE(cursor + 32);
        const mode = zip.readUInt32LE(cursor + 38) >>> 16;
        const offset = zip.readUInt32LE(cursor + 42);
        const name = zip.subarray(cursor + 46, cursor + 46 + nameSize).toString('utf8');
        assert.ok(name && !name.startsWith('/') && !name.includes('\\') && !name.includes(':')
            && !name.includes('\0') && !name.split('/').includes('..'), 'Unsafe ZIP path');
        assert.ok((mode & 0xf000) !== 0xa000 && !(flags & 1), 'Symlink/encrypted ZIP entry');
        assert.ok([0, 8].includes(method) && size <= 32 * 1024 * 1024, 'Unsupported/oversized ZIP entry');
        total += size;
        assert.ok(total <= 128 * 1024 * 1024, 'Oversized extension');
        assert.equal(zip.readUInt32LE(offset), 0x04034b50, 'Invalid ZIP local entry');
        const dataOffset = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
        assert.ok(dataOffset + compressed <= zip.length, 'Truncated ZIP entry');
        const data = zip.subarray(dataOffset, dataOffset + compressed);
        const content = method === 8 ? inflateRawSync(data, { maxOutputLength: 32 * 1024 * 1024 }) : data;
        assert.equal(content.length, size, 'Wrong ZIP expanded size');
        assert.ok(!entries.has(name), 'Duplicate ZIP entry');
        if (!name.endsWith('/')) entries.set(name, content);
        cursor += 46 + nameSize + extraSize + commentSize;
    }
    return entries;
}

export function verifyPackage(bytes, expected) {
    assert.equal(sha256(bytes), expected.sha256, 'Extension package changed: review and renew its explicit pin');
    const entries = unpackCrx(bytes);
    const manifest = JSON.parse(entries.get('manifest.json'));
    assert.equal(manifest.manifest_version, 3, 'Actual-extension Canary requires current Manifest V3');
    assert.equal(manifest.version, expected.version, 'Extension version changed');
    assert.ok([...manifest.permissions || [], ...manifest.optional_permissions || []].includes('userScripts'),
        'Missing userScripts permission');
    return { entries, manifest };
}

export async function prepareExtension({ discover = false } = {}) {
    const base = path.join(root, 'testbed/artifacts/live-site-extension');
    await mkdir(base, { recursive: true });
    const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(45000) });
    assert.ok(response.ok, `Official extension download failed: HTTP ${response.status}`);
    const final = new URL(response.url);
    assert.ok(final.protocol === 'https:' && /(^|\.)(google\.com|googleusercontent\.com)$/.test(final.hostname),
        'Unexpected extension download origin');
    const chunks = [];
    let received = 0;
    for await (const chunk of response.body) {
        received += chunk.length;
        assert.ok(received < 64 * 1024 * 1024, 'Oversized extension download');
        chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    assert.ok(bytes.length > 0 && bytes.length < 64 * 1024 * 1024, 'Invalid extension package size');
    const contract = discover ? null : JSON.parse(await readFile(path.join(root, 'verification/live-site-canary.json'), 'utf8'));
    const parsed = discover ? { entries: unpackCrx(bytes) } : verifyPackage(bytes, contract.extension);
    const manifest = parsed.manifest || JSON.parse(parsed.entries.get('manifest.json'));
    const directory = await mkdtemp(path.join(base, 'package-'));
    const packagePath = path.join(base, `official-${sha256(bytes)}.crx`);
    await writeFile(packagePath, bytes);
    for (const [name, content] of parsed.entries) {
        const target = path.resolve(directory, name);
        assert.ok(target.startsWith(directory + path.sep), 'ZIP extraction escaped destination');
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content);
    }
    const receipt = { schemaVersion: 1, source: downloadUrl, storeId, sha256: sha256(bytes),
        version: manifest.version, manifestVersion: manifest.manifest_version, directory, packagePath,
        pinned: !discover, fileCount: parsed.entries.size };
    await writeFile(path.join(base, 'extension-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt, null, 2));
    return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await prepareExtension({ discover: process.argv.includes('--discover') });
}
