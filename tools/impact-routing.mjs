export const PROFILE_ORDER = ['policy', 'proof-core', 'proof-runtime', 'header-focused', 'mobile-focused', 'pc-focused', 'acceptance', 'promotion-windows', 'live-canary'];

export function minimizeProfiles(profiles, gates) {
    const selected = new Set(profiles);
    for (const [owner, covered] of Object.entries(gates.profileSupersedence || {})) {
        if (selected.has(owner)) for (const profile of covered) selected.delete(profile);
    }
    return [...selected].sort((a, b) => PROFILE_ORDER.indexOf(a) - PROFILE_ORDER.indexOf(b));
}

export function validateImpactPolicy(registry, gates) {
    if (JSON.stringify(gates.profileSupersedence) !== JSON.stringify({ acceptance: ['mobile-focused', 'pc-focused', 'header-focused'], 'header-focused': ['mobile-focused'] })) {
        throw new Error('Unproven profile supersedence');
    }
    for (const relation of registry.relations) {
        if (!['runtime', 'verification', 'constraint'].includes(gates.relationImpact?.[relation.kind])) {
            throw new Error(`Unknown impact relation kind: ${relation.kind}`);
        }
    }
    for (const [owner, covered] of Object.entries(gates.profileSupersedence || {})) {
        if (!gates.profiles[owner] || covered.some(profile => !gates.profiles[profile] || profile === owner)) {
            throw new Error('Invalid profile supersedence');
        }
    }
    const header = gates.boundedScopes?.['header-navigation'];
    if (!header || header.profile !== 'header-focused' || !header.sourcePaths?.length) throw new Error('Missing bounded header coverage');
    for (const file of header.sourcePaths) {
        const owners = registry.components.filter(component => component.sourceRefs.includes(file));
        if (owners.length !== 1 || !['presentation-source', 'adapter-contract'].includes(owners[0].classification)
            || !/^src\/targets\/mobile\/(?:header-|gallery-page-head-)/.test(file)) {
            throw new Error(`Unsafe bounded header source: ${file}`);
        }
    }
}

export function isProofInput(file) {
    return file === 'AGENTS.md' || /^(?:architecture|verification|\.agents|vendor)\//.test(file)
        || /^(?:tools|\.github\/workflows)\//.test(file)
        || /^(?:package\.json|pnpm-lock\.yaml|testbed\/package\.json)$/.test(file)
        || file === 'docs/work/MOBILE_UI_MODERNIZATION.md' || file === 'docs/ui-surface-contracts.md';
}

export function requiresRuntimeProof(file) {
    return /^tools\/(?:audit-proof-system|proof-audit-progress|evidence-binding)(?:\.mjs)$/.test(file)
        || /^testbed\/(?:harness|fixtures|public|server)\//.test(file)
        || /^testbed\/run-.*\.mjs$/.test(file)
        || /^src\/targets\/mobile\/(?:native-form-|write-)/.test(file);
}
