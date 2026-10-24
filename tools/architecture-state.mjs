import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SECTIONS = Object.freeze(['authorities', 'contracts', 'components', 'relations', 'invariants']);

export function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

export function stableSortRegistry(registry) {
    const next = structuredClone(registry);
    for (const section of SECTIONS) {
        next[section] = [...(next[section] || [])].sort((a, b) => a.id.localeCompare(b.id));
    }
    return next;
}

function upsertById(items, updates = []) {
    const map = new Map(items.map((item) => [item.id, item]));
    for (const item of updates) map.set(item.id, item);
    return [...map.values()];
}

function removeById(items, ids = []) {
    const removed = new Set(ids);
    return items.filter((item) => !removed.has(item.id));
}

export function applyArchitectureOverlay(registry, overlay) {
    const next = structuredClone(registry);
    const changes = overlay.changes || {};
    const operations = {
        authorities: ['upsertAuthorities', 'removeAuthorities'],
        contracts: ['upsertContracts', 'removeContracts'],
        components: ['upsertComponents', 'removeComponents'],
        relations: ['upsertRelations', 'removeRelations'],
        invariants: ['upsertInvariants', 'removeInvariants'],
    };
    for (const [section, [upsertName, removeName]] of Object.entries(operations)) {
        next[section] = upsertById(next[section] || [], changes[upsertName] || []);
        next[section] = removeById(next[section], changes[removeName] || []);
    }
    return stableSortRegistry(next);
}

export async function loadArchitectureState(rootDir) {
    const registryPath = path.join(rootDir, 'architecture', 'registry.json');
    const candidatesDir = path.join(rootDir, 'architecture', 'candidates');
    const registryBytes = await readFile(registryPath);
    const accepted = stableSortRegistry(JSON.parse(registryBytes.toString('utf8')));
    const entries = await readdir(candidatesDir, { withFileTypes: true });
    const names = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name)
        .sort();
    const candidates = await Promise.all(names.map(async (name) => ({
        path: path.join(candidatesDir, name),
        value: JSON.parse(await readFile(path.join(candidatesDir, name), 'utf8')),
    })));
    const acceptedSha256 = sha256(registryBytes);
    const candidateFailures = [];
    let effective = accepted;
    for (const candidate of candidates) {
        if (candidate.value.schemaVersion !== 1 || !candidate.value.id) {
            candidateFailures.push(`${path.basename(candidate.path)}: invalid candidate header`);
        }
        if (candidate.value.baseRegistrySha256 !== acceptedSha256) {
            candidateFailures.push(`${path.basename(candidate.path)}: baseRegistrySha256 does not match accepted registry`);
        }
        effective = applyArchitectureOverlay(effective, candidate.value);
    }
    return Object.freeze({
        registryBytes,
        accepted,
        acceptedSha256,
        candidates,
        candidateFailures,
        effective,
    });
}
