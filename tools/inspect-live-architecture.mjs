import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArchitectureState } from './architecture-state.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function inspectSurfaceLinks({ registry, targets, surfaces, sourceTexts, existingPaths }) {
    const findings = [];
    const mobileInputs = new Set((targets.mobile?.inputs || []).map((input) => input.path));
    const pcInputs = new Set((targets.pc?.inputs || []).map((input) => input.path));
    const views = surfaces.map((surface) => {
        const sources = surface.sourceRefs.map((sourceRef) => {
            const owners = registry.components.filter((component) => component.sourceRefs.includes(sourceRef));
            if (!existingPaths.has(sourceRef)) findings.push(`${surface.id}: missing source ${sourceRef}`);
            if (!mobileInputs.has(sourceRef)) findings.push(`${surface.id}: source absent from mobile build ${sourceRef}`);
            if (owners.length !== 1) findings.push(`${surface.id}: source has ${owners.length} exact architecture owners ${sourceRef}`);
            return {
                path: sourceRef,
                component: owners.length === 1 ? owners[0].id : null,
                layer: owners.length === 1 ? owners[0].layer : null,
                targets: [mobileInputs.has(sourceRef) && 'mobile', pcInputs.has(sourceRef) && 'pc'].filter(Boolean),
            };
        });
        const styles = surface.styleIds.map((styleId) => {
            const declaredIn = surface.sourceRefs.filter((sourceRef) => sourceTexts.get(sourceRef)?.includes(styleId));
            if (declaredIn.length === 0) findings.push(`${surface.id}: style ID has no listed source owner ${styleId}`);
            return { id: styleId, sourceRefs: declaredIn };
        });
        for (const testRef of surface.testRefs) {
            if (!existingPaths.has(testRef)) findings.push(`${surface.id}: missing test ${testRef}`);
        }
        return {
            id: surface.id,
            state: surface.state,
            risk: surface.risk,
            visualOwner: surface.currentVisualOwner,
            adapter: surface.adapter,
            presenter: surface.presenter,
            routes: surface.routeFamilies,
            sources,
            styles,
            tests: surface.testRefs,
            canaryCheckpoint: surface.canaryCheckpoint,
        };
    });
    return { findings, surfaces: views };
}

async function readOptional(relative) {
    try {
        return await readFile(path.join(rootDir, relative));
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

export async function inspectLiveArchitecture() {
    const state = await loadArchitectureState(rootDir);
    const [buildBytes, surfaceBytes] = await Promise.all([
        readFile(path.join(rootDir, 'build/targets.json')),
        readFile(path.join(rootDir, 'architecture/ui-surfaces.json')),
    ]);
    const targets = JSON.parse(buildBytes).targets;
    const manifest = JSON.parse(surfaceBytes);
    const references = [...new Set(manifest.surfaces.flatMap((surface) => [...surface.sourceRefs, ...surface.testRefs]))];
    const contents = await Promise.all(references.map(readOptional));
    const existingPaths = new Set(references.filter((_, index) => contents[index] !== null));
    const sourceTexts = new Map(references.map((reference, index) => [reference, contents[index]?.toString('utf8')]));
    const inspected = inspectSurfaceLinks({ registry: state.effective, targets, surfaces: manifest.surfaces, sourceTexts, existingPaths });
    return {
        schemaVersion: 1,
        scope: 'repository-source-and-build-only',
        liveSiteState: 'not-checked',
        acceptedRegistrySha256: state.acceptedSha256,
        candidateOverlays: state.candidates.map((candidate) => path.relative(rootDir, candidate.path).replace(/\\/g, '/')),
        buildManifestSha256: digest(buildBytes),
        surfaceManifestSha256: digest(surfaceBytes),
        findings: [...state.candidateFailures, ...inspected.findings],
        surfaces: inspected.surfaces,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const allowed = new Set(['--check', '--surface']);
    if (args.some((arg) => arg.startsWith('--') && !allowed.has(arg))) {
        console.error('Usage: node tools/inspect-live-architecture.mjs [--check] [--surface surface-id]');
        process.exitCode = 2;
    } else {
        const requestedIndex = args.indexOf('--surface');
        const requestedSurface = requestedIndex >= 0 ? args[requestedIndex + 1] : null;
        const result = await inspectLiveArchitecture();
        if (requestedIndex >= 0 && (!requestedSurface || !result.surfaces.some((surface) => surface.id === requestedSurface))) {
            console.error(`Unknown surface: ${requestedSurface || '(missing)'}`);
            process.exitCode = 2;
        } else {
            if (requestedSurface) result.surfaces = result.surfaces.filter((surface) => surface.id === requestedSurface);
            if (args.includes('--check')) {
                console.log(`Live architecture links: ${result.findings.length ? 'FAIL' : 'PASS'}; ${result.surfaces.length} surface(s); accepted registry ${result.acceptedRegistrySha256}; live site not checked.`);
                for (const finding of result.findings) console.error(` - ${finding}`);
                if (result.findings.length) process.exitCode = 1;
            } else {
                console.log(JSON.stringify(result, null, 2));
            }
        }
    }
}
