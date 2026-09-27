import { parse } from 'acorn';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArchitectureState } from './architecture-state.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mutationFlagIndex = process.argv.indexOf('--audit-inject-forbidden');
const mutationComponentId = mutationFlagIndex >= 0 ? process.argv[mutationFlagIndex + 1] : null;
const mutationVariant = mutationFlagIndex >= 0 ? process.argv[mutationFlagIndex + 2] || 'bare-gm' : null;
if (mutationFlagIndex >= 0 && (!mutationComponentId || mutationComponentId.startsWith('--'))) {
    throw new Error('--audit-inject-forbidden requires a presentation component id');
}
const auditMutations = Object.freeze({
    'bare-gm': 'void GM_setValue;',
    'member-gm': 'void globalThis.GM_setValue;',
    'computed-gm': "void globalThis['GM_setValue'];",
    'destructured-gm': 'const { GM_setValue: dcufAuditWrite } = globalThis; void dcufAuditWrite;',
    'computed-destructured-gm': "const { ['GM_setValue']: dcufAuditWrite } = globalThis; void dcufAuditWrite;",
    'aliased-destructured-gm': 'const dcufAuditGlobal = globalThis; const { GM_setValue: dcufAuditWrite } = dcufAuditGlobal; void dcufAuditWrite;',
    'dynamic-destructured-global': "const { ['GM_' + 'setValue']: dcufAuditWrite } = globalThis; void dcufAuditWrite;",
    'aliased-dynamic-global': "const dcufAuditGlobal = globalThis; void dcufAuditGlobal['GM_' + 'setValue'];",
    'aliased-dynamic-destructured-global': "const dcufAuditGlobal = globalThis; const { ['GM_' + 'setValue']: dcufAuditWrite } = dcufAuditGlobal; void dcufAuditWrite;",
    'nested-global-alias': 'const dcufAuditGlobal = window.globalThis; void dcufAuditGlobal.GM_setValue;',
    'destructured-global-alias': 'const { globalThis: dcufAuditGlobal } = window; void dcufAuditGlobal.GM_setValue;',
    'member-document': 'void window.document;',
    'member-fetch': 'void globalThis.fetch;',
    'member-observer': 'void new globalThis.MutationObserver(() => {});',
    'member-timeout': 'void globalThis.setTimeout(() => {}, 0);',
    'member-interval': 'void window.setInterval(() => {}, 1000);',
    'member-raf': 'void window.requestAnimationFrame(() => {});',
    'dynamic-global': "void globalThis['GM_' + 'setValue'];",
    'benign-member-fetch': 'const dcufAuditRecord = { fetch: true }; void dcufAuditRecord.fetch;',
    'benign-destructured-document': "const dcufAuditViewModel = { document: 'title' }; const { document: dcufAuditTitle } = dcufAuditViewModel; void dcufAuditTitle;",
    'benign-object-document': "const dcufAuditTitle = 'title'; void ({ document: dcufAuditTitle });",
    'benign-shadowed-window': 'function dcufAuditShadow(window) { return window.fetch; } void dcufAuditShadow({ fetch: true });',
    'benign-shadowed-timeout': 'function dcufAuditShadow(setTimeout) { return setTimeout; } void dcufAuditShadow(true);',
    'application-member-document': 'void globalThis.document;',
    'adapter-member-gm': 'void globalThis.GM_setValue;',
    'adapter-member-fetch': 'void globalThis.fetch;',
    'presentation-broad-selector': 'void `\nbutton { color: red; }`;',
    'presentation-host-selector': 'void `\n.gall_writer { color: red; }`;',
    'presentation-important-style': "void 'color: red !important';",
    'presentation-profiled-important-style': '\n[data-dcuf-native-form-role="page"] { outline: 0 !important; }\n',
});
if (mutationVariant && !Object.hasOwn(auditMutations, mutationVariant)) {
    throw new Error(`Unknown UI-boundary audit mutation: ${mutationVariant}`);
}
const architectureState = await loadArchitectureState(rootDir);
if (architectureState.candidateFailures.length) {
    throw new Error(`Invalid architecture candidate:\n${architectureState.candidateFailures.join('\n')}`);
}
const registry = architectureState.effective;
const uiSurfaces = JSON.parse(await readFile(path.join(rootDir, 'architecture', 'ui-surfaces.json'), 'utf8'));
const forbiddenIdentifiers = new Set([
    'GM_getValue',
    'GM_setValue',
    'GM_registerMenuCommand',
    'GM_xmlhttpRequest',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'MutationObserver',
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'localStorage',
    'sessionStorage',
    'document',
]);
const applicationHostForbiddenIdentifiers = new Set([
    'document',
    'window',
    'self',
    'unsafeWindow',
    'MutationObserver',
    'IntersectionObserver',
    'ResizeObserver',
    'HTMLElement',
    'Element',
    'Node',
    'Document',
    'DocumentFragment',
    'getComputedStyle',
    'localStorage',
    'sessionStorage',
]);
const adapterEffectForbiddenIdentifiers = new Set([
    'GM_getValue',
    'GM_setValue',
    'GM_registerMenuCommand',
    'GM_xmlhttpRequest',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
]);
const failures = [];
let filesChecked = 0;
let mutationInjected = false;
const globalRoots = new Set(['globalThis', 'window', 'self', 'unsafeWindow']);

function staticPropertyName(member) {
    if (!member.computed && member.property?.type === 'Identifier') return member.property.name;
    if (member.computed && member.property?.type === 'Literal' && typeof member.property.value === 'string') {
        return member.property.value;
    }
    if (member.computed && member.property?.type === 'TemplateLiteral'
        && member.property.expressions.length === 0 && member.property.quasis.length === 1) {
        return member.property.quasis[0].value.cooked;
    }
    return null;
}

function createScope(parent, type) {
    return { parent, type, bindings: new Map() };
}

function nearestVarScope(scope) {
    let current = scope;
    while (current.parent && current.type !== 'function' && current.type !== 'program') current = current.parent;
    return current;
}

function declarePattern(pattern, scope, bindingByIdentifier) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') {
        let binding = scope.bindings.get(pattern.name);
        if (!binding) {
            binding = { name: pattern.name, globalAlias: false };
            scope.bindings.set(pattern.name, binding);
        }
        bindingByIdentifier.set(pattern, binding);
        return;
    }
    if (pattern.type === 'AssignmentPattern') return declarePattern(pattern.left, scope, bindingByIdentifier);
    if (pattern.type === 'RestElement') return declarePattern(pattern.argument, scope, bindingByIdentifier);
    if (pattern.type === 'ArrayPattern') {
        for (const element of pattern.elements || []) declarePattern(element, scope, bindingByIdentifier);
        return;
    }
    if (pattern.type === 'ObjectPattern') {
        for (const property of pattern.properties || []) {
            if (property.type === 'RestElement') declarePattern(property.argument, scope, bindingByIdentifier);
            else declarePattern(property.value, scope, bindingByIdentifier);
        }
    }
}

function buildScopes(ast) {
    const nodeScopes = new WeakMap();
    const bindingByIdentifier = new WeakMap();
    const programScope = createScope(null, 'program');
    const walk = (node, scope, parent = null) => {
        if (!node || typeof node !== 'object') return;
        nodeScopes.set(node, scope);
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
            if (node.type === 'FunctionDeclaration') declarePattern(node.id, scope, bindingByIdentifier);
            const functionScope = createScope(scope, 'function');
            if (node.type === 'FunctionExpression') declarePattern(node.id, functionScope, bindingByIdentifier);
            for (const parameter of node.params || []) declarePattern(parameter, functionScope, bindingByIdentifier);
            if (node.id) walk(node.id, node.type === 'FunctionDeclaration' ? scope : functionScope, node);
            for (const parameter of node.params || []) walk(parameter, functionScope, node);
            walk(node.body, functionScope, node);
            return;
        }
        if (node.type === 'BlockStatement') {
            const blockScope = createScope(scope, 'block');
            for (const statement of node.body || []) walk(statement, blockScope, node);
            return;
        }
        if (node.type === 'CatchClause') {
            const catchScope = createScope(scope, 'block');
            declarePattern(node.param, catchScope, bindingByIdentifier);
            walk(node.param, catchScope, node);
            walk(node.body, catchScope, node);
            return;
        }
        if (node.type === 'ForStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
            const loopScope = createScope(scope, 'block');
            for (const key of ['init', 'left', 'right', 'test', 'update', 'body']) walk(node[key], loopScope, node);
            return;
        }
        if (node.type === 'SwitchStatement') {
            const switchScope = createScope(scope, 'block');
            walk(node.discriminant, switchScope, node);
            for (const switchCase of node.cases || []) walk(switchCase, switchScope, node);
            return;
        }
        if (node.type === 'VariableDeclaration') {
            const declarationScope = node.kind === 'var' ? nearestVarScope(scope) : scope;
            for (const declaration of node.declarations || []) declarePattern(declaration.id, declarationScope, bindingByIdentifier);
        } else if (node.type === 'ImportDeclaration') {
            for (const specifier of node.specifiers || []) declarePattern(specifier.local, scope, bindingByIdentifier);
        } else if (node.type === 'ClassDeclaration') {
            declarePattern(node.id, scope, bindingByIdentifier);
        }
        for (const [key, value] of Object.entries(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') continue;
            if (Array.isArray(value)) for (const child of value) walk(child, scope, node);
            else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value, scope, node);
        }
    };
    walk(ast, programScope);
    return { nodeScopes, bindingByIdentifier };
}

function resolveBinding(scope, name) {
    let current = scope;
    while (current) {
        if (current.bindings.has(name)) return current.bindings.get(name);
        current = current.parent;
    }
    return null;
}

function isGlobalObjectExpression(node, scope) {
    let current = node;
    while (current?.type === 'ChainExpression') current = current.expression;
    if (current?.type === 'Identifier') {
        const binding = resolveBinding(scope, current.name);
        return binding ? binding.globalAlias : globalRoots.has(current.name);
    }
    return current?.type === 'MemberExpression'
        && isGlobalObjectExpression(current.object, scope)
        && globalRoots.has(staticPropertyName(current));
}

function markGlobalAliasTarget(pattern, scope, bindingByIdentifier) {
    if (pattern?.type === 'Identifier') {
        const binding = bindingByIdentifier.get(pattern) || resolveBinding(scope, pattern.name);
        if (binding && !binding.globalAlias) {
            binding.globalAlias = true;
            return true;
        }
    }
    if (pattern?.type === 'AssignmentPattern') return markGlobalAliasTarget(pattern.left, scope, bindingByIdentifier);
    return false;
}

function markDestructuredGlobalAliases(pattern, scope, bindingByIdentifier) {
    if (pattern?.type !== 'ObjectPattern') return false;
    let changed = false;
    for (const property of pattern.properties || []) {
        if (property.type !== 'Property') continue;
        const propertyName = staticPatternPropertyName(property);
        if (!globalRoots.has(propertyName)) continue;
        const target = property.value?.type === 'AssignmentPattern' ? property.value.left : property.value;
        changed = markGlobalAliasTarget(target, scope, bindingByIdentifier) || changed;
        if (target?.type === 'ObjectPattern') changed = markDestructuredGlobalAliases(target, scope, bindingByIdentifier) || changed;
    }
    return changed;
}

function collectGlobalAliases(ast, nodeScopes, bindingByIdentifier) {
    let changed = true;
    const scan = (node) => {
        if (!node || typeof node !== 'object') return;
        const scope = nodeScopes.get(node);
        if (node.type === 'VariableDeclarator' && isGlobalObjectExpression(node.init, scope)) {
            changed = markGlobalAliasTarget(node.id, scope, bindingByIdentifier) || changed;
            changed = markDestructuredGlobalAliases(node.id, scope, bindingByIdentifier) || changed;
        }
        if (node.type === 'AssignmentExpression' && node.operator === '=' && isGlobalObjectExpression(node.right, scope)) {
            changed = markGlobalAliasTarget(node.left, scope, bindingByIdentifier) || changed;
            changed = markDestructuredGlobalAliases(node.left, scope, bindingByIdentifier) || changed;
        }
        for (const [key, value] of Object.entries(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') continue;
            if (Array.isArray(value)) for (const child of value) scan(child);
            else if (value && typeof value === 'object' && typeof value.type === 'string') scan(value);
        }
    };
    while (changed) {
        changed = false;
        scan(ast);
    }
}

function staticPatternPropertyName(property) {
    if (!property.computed && property.key?.type === 'Identifier') return property.key.name;
    if (property.computed && property.key?.type === 'Literal' && typeof property.key.value === 'string') {
        return property.key.value;
    }
    if (property.computed && property.key?.type === 'TemplateLiteral'
        && property.key.expressions.length === 0 && property.key.quasis.length === 1) {
        return property.key.quasis[0].value.cooked;
    }
    return null;
}

function reportGlobalObjectPattern(pattern, report, activeForbiddenIdentifiers = forbiddenIdentifiers) {
    if (pattern?.type !== 'ObjectPattern') return;
    for (const property of pattern.properties || []) {
        if (property.type !== 'Property') continue;
        const propertyName = staticPatternPropertyName(property);
        if (property.computed && propertyName === null) {
            report('dynamic global property', property.key.loc?.start.line || property.loc?.start.line || 0);
        }
        if (propertyName && activeForbiddenIdentifiers.has(propertyName)) {
            report(propertyName, property.key.loc?.start.line || property.loc?.start.line || 0);
        }
        const nestedPattern = property.value?.type === 'AssignmentPattern' ? property.value.left : property.value;
        reportGlobalObjectPattern(nestedPattern, report, activeForbiddenIdentifiers);
    }
}

function visit(node, parent, grandparent, nodeScopes, report, activeForbiddenIdentifiers = forbiddenIdentifiers) {
    if (!node || typeof node !== 'object') return;
    const scope = nodeScopes.get(node);
    if (node.type === 'VariableDeclarator' && isGlobalObjectExpression(node.init, scope)) {
        reportGlobalObjectPattern(node.id, report, activeForbiddenIdentifiers);
    } else if (node.type === 'AssignmentExpression' && isGlobalObjectExpression(node.right, scope)) {
        reportGlobalObjectPattern(node.left, report, activeForbiddenIdentifiers);
    }
    if (node.type === 'MemberExpression') {
        const propertyName = staticPropertyName(node);
        let root = node;
        while (root?.type === 'ChainExpression') root = root.expression;
        while (root?.type === 'MemberExpression') root = root.object;
        const globalMember = isGlobalObjectExpression(root, scope);
        if (globalMember && propertyName && activeForbiddenIdentifiers.has(propertyName)) {
            report(propertyName, node.property.loc?.start.line || node.loc?.start.line || 0);
        } else if (globalMember && node.computed && propertyName === null) {
            report('dynamic global property', node.property.loc?.start.line || node.loc?.start.line || 0);
        }
    }
    if (node.type === 'Identifier' && activeForbiddenIdentifiers.has(node.name)) {
        const isProperty = parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
        const isObjectPatternPart = parent?.type === 'Property' && grandparent?.type === 'ObjectPattern';
        const isObjectKey = parent?.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand;
        const isLocallyBound = Boolean(resolveBinding(scope, node.name));
        if (!isProperty && !isObjectPatternPart && !isObjectKey && !isLocallyBound) report(node.name, node.loc?.start.line || 0);
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        if (Array.isArray(value)) for (const child of value) visit(child, node, parent, nodeScopes, report, activeForbiddenIdentifiers);
        else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value, node, parent, nodeScopes, report, activeForbiddenIdentifiers);
    }
}

function staticObjectPropertyName(property) {
    if (property?.type !== 'Property') return null;
    if (!property.computed && property.key?.type === 'Identifier') return property.key.name;
    if (property.key?.type === 'Literal' && typeof property.key.value === 'string') return property.key.value;
    return null;
}

function staticObjectString(objectExpression, propertyName) {
    const property = objectExpression?.properties?.find((candidate) => staticObjectPropertyName(candidate) === propertyName);
    if (property?.value?.type === 'Literal' && typeof property.value.value === 'string') return property.value.value;
    if (property?.value?.type === 'TemplateLiteral' && property.value.expressions.length === 0) {
        return property.value.quasis.map((quasi) => quasi.value.cooked).join('');
    }
    return null;
}

function extractStaticCssPayloads(ast) {
    const payloads = [];
    const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ObjectExpression') {
            const cssProperty = node.properties.find((property) => staticObjectPropertyName(property) === 'css');
            if (cssProperty?.value?.type === 'TemplateLiteral' && cssProperty.value.expressions.length === 0) {
                const styleKey = staticObjectString(node, 'key');
                if (!styleKey) throw new Error('Static CSS payload with !important declarations must have a literal key');
                payloads.push({
                    styleKey,
                    css: cssProperty.value.quasis.map((quasi) => quasi.value.cooked).join(''),
                });
            }
        }
        for (const [key, value] of Object.entries(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') continue;
            if (Array.isArray(value)) for (const child of value) walk(child);
            else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value);
        }
    };
    walk(ast);
    return payloads;
}

function importantLedger(css) {
    const normalizeSelector = (value) => value.replace(/\s+/g, ' ').trim();
    const normalizedCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const declarations = [];
    const matches = Array.from(normalizedCss.matchAll(/([\w-]+)\s*:\s*[^;{}]*!important/g));
    for (const match of matches) {
        const openingBrace = normalizedCss.lastIndexOf('{', match.index);
        const selectorStart = Math.max(normalizedCss.lastIndexOf('{', openingBrace - 1), normalizedCss.lastIndexOf('}', openingBrace - 1));
        const selector = openingBrace > selectorStart ? normalizeSelector(normalizedCss.slice(selectorStart + 1, openingBrace)) : '';
        declarations.push({ selector, property: match[1].toLowerCase() });
    }
    return {
        declarations,
        totalCount: normalizedCss.match(/!important/g)?.length || 0,
        sha256: createHash('sha256').update(JSON.stringify(declarations)).digest('hex'),
    };
}

function verifyConformingPresentationCss(component, reference, source, ast) {
    if (component.classification !== 'presentation-source' || component.boundaryState !== 'conforming') return;
    const normalizeSelector = (value) => value.replace(/\s+/g, ' ').trim();
    const matchingSurfaces = (uiSurfaces.surfaces || []).filter((surface) => surface.sourceRefs?.includes(reference));
    const registeredExceptions = matchingSurfaces
        .flatMap((surface) => surface.cascadeExceptions || [])
        .map((exception) => ({
            selector: normalizeSelector(exception.selector),
            property: exception.property.toLowerCase(),
        }));
    const registeredProfiles = matchingSurfaces.flatMap((surface) => (
        (surface.cascadeExceptionProfiles || [])
            .filter((profile) => profile.sourceRef === reference)
            .map((profile) => ({ surface, profile }))
    ));
    const cssPayloads = extractStaticCssPayloads(ast);
    const profiledStyleKeys = new Set();
    let profiledImportantCount = 0;
    for (const { surface, profile } of registeredProfiles) {
        const payload = cssPayloads.find(({ styleKey }) => styleKey === profile.styleKey);
        if (!payload) {
            failures.push(`${reference}: registered !important profile style ${profile.styleKey} is missing`);
            continue;
        }
        if (surface.state !== 'adapted-zero-delta') {
            failures.push(`${reference}: cascade exception profiles are allowed only for adapted-zero-delta surfaces`);
        }
        if (profiledStyleKeys.has(profile.styleKey)) {
            failures.push(`${reference}: duplicate !important profile for style ${profile.styleKey}`);
            continue;
        }
        profiledStyleKeys.add(profile.styleKey);
        const ledger = importantLedger(payload.css);
        profiledImportantCount += ledger.totalCount;
        if (ledger.declarations.length !== ledger.totalCount) {
            failures.push(`${reference}: style ${profile.styleKey} contains an unparseable !important declaration`);
        }
        if (ledger.totalCount !== profile.declarationCount || ledger.sha256 !== profile.declarationLedgerSha256.toLowerCase()) {
            failures.push(`${reference}: style ${profile.styleKey} !important ledger mismatch (actual count ${ledger.totalCount}, sha256 ${ledger.sha256})`);
        }
        for (const declaration of ledger.declarations) {
            const selectorBranches = declaration.selector.split(',').map((branch) => branch.trim()).filter(Boolean);
            if (!selectorBranches.length || selectorBranches.some((branch) => !branch.startsWith(profile.requiredSelectorPrefix))) {
                failures.push(`${reference}: style ${profile.styleKey} !important selector escapes required prefix ${profile.requiredSelectorPrefix}: ${declaration.selector}`);
                break;
            }
        }
    }
    const importantMatches = Array.from(source.matchAll(/([\w-]+)\s*:\s*[^;{}]*!important/g));
    const importantCount = source.match(/!important/g)?.length || 0;
    if (registeredProfiles.length) {
        if (profiledImportantCount !== importantCount) {
            failures.push(`${reference}: conforming presentation source contains an unregistered !important declaration outside its exact cascade profiles`);
        }
    } else {
        for (const match of importantMatches) {
            const openingBrace = source.lastIndexOf('{', match.index);
            const selectorStart = Math.max(
                source.lastIndexOf('{', openingBrace - 1),
                source.lastIndexOf('}', openingBrace - 1),
                source.lastIndexOf('`', openingBrace - 1),
            );
            const selector = openingBrace > selectorStart
                ? normalizeSelector(source.slice(selectorStart + 1, openingBrace))
                : '';
            const property = match[1].toLowerCase();
            if (!registeredExceptions.some((exception) => exception.selector === selector && exception.property === property)) {
                failures.push(`${reference}: conforming presentation source contains an unregistered !important declaration`);
            }
        }
        if (importantMatches.length !== importantCount) {
            failures.push(`${reference}: conforming presentation source contains an unregistered !important declaration`);
        }
    }
    for (const token of ['.gall_writer', '.ub-writer', '.btn_recommend_box', '.comment_box', '.write_wrap']) {
        if (source.includes(token)) failures.push(`${reference}: conforming presentation source contains raw host selector ${token}`);
    }
    const broadSelector = /(?:^|\n)\s*(html|body|button|input|select|textarea|\*|#[A-Za-z_][\w-]*)[^\n{]*\{/m.exec(source);
    if (broadSelector) {
        failures.push(`${reference}: conforming presentation source contains broad selector ${broadSelector[1]}`);
    }
}

const presentationComponents = registry.components.filter((component) => (
    component.status !== 'retired'
    && component.layer === 'presentation-ui'
    && component.classification === 'presentation-source'
));
const applicationBoundaryIds = new Set(['shared-filter-runtime', 'mobile-personal-block-module', 'mobile-convenience-module']);
const adapterBoundaryIds = new Set(['filter-host-adapter', 'filter-settings-host-adapter', 'personal-block-host-adapter', 'mobile-convenience-host-adapter', 'mobile-list-host-adapter', 'mobile-article-host-adapter', 'mobile-comment-host-adapter', 'mobile-native-form-host-adapter', 'mobile-write-editor-host-adapter', 'mobile-write-draft-host-adapter', 'mobile-write-ad-host-adapter', 'mobile-header-shell-host-adapter', 'mobile-gallery-page-head-host-adapter', 'mobile-header-gnb-host-adapter', 'mobile-header-recent-visit-host-adapter', 'mobile-header-drawer-host-adapter']);
const boundaryPolicies = [
    ...presentationComponents.map((component) => ({
        component,
        policyLabel: 'presentation',
        forbidden: forbiddenIdentifiers,
        mutationVariants: new Set(Object.keys(auditMutations).filter((variant) => !variant.startsWith('application-') && !variant.startsWith('adapter-'))),
    })),
    ...registry.components.filter((component) => component.status !== 'retired' && applicationBoundaryIds.has(component.id)).map((component) => ({
        component,
        policyLabel: 'application runtime',
        forbidden: applicationHostForbiddenIdentifiers,
        mutationVariants: new Set(['application-member-document']),
    })),
    ...registry.components.filter((component) => component.status !== 'retired' && adapterBoundaryIds.has(component.id)).map((component) => ({
        component,
        policyLabel: 'host adapter',
        forbidden: adapterEffectForbiddenIdentifiers,
        mutationVariants: new Set(['adapter-member-gm', 'adapter-member-fetch']),
    })),
];

for (const { component, policyLabel, forbidden, mutationVariants } of boundaryPolicies) {
    let componentFilesChecked = 0;
    for (const reference of component.sourceRefs) {
        if (reference.includes('*')) {
            failures.push(`${component.id}: presentation source reference must be a concrete file: ${reference}`);
            continue;
        }
        const absolutePath = path.join(rootDir, reference);
        let source = await readFile(absolutePath, 'utf8');
        if (component.id === mutationComponentId && mutationVariants.has(mutationVariant) && !mutationInjected) {
            if (mutationVariant === 'presentation-profiled-important-style') {
                const cssPayloadStart = 'css: `';
                if (!source.includes(cssPayloadStart)) throw new Error(`${reference}: profiled CSS mutation target is missing`);
                source = source.replace(cssPayloadStart, `${cssPayloadStart}${auditMutations[mutationVariant]}`);
            } else {
                source += `\n${auditMutations[mutationVariant]}\n`;
            }
            mutationInjected = true;
        }
        const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowAwaitOutsideFunction: true });
        const { nodeScopes, bindingByIdentifier } = buildScopes(ast);
        collectGlobalAliases(ast, nodeScopes, bindingByIdentifier);
        filesChecked += 1;
        componentFilesChecked += 1;
        visit(ast, null, null, nodeScopes, (identifier, line) => failures.push(`${reference}:${line}: ${policyLabel} directly references ${identifier}`), forbidden);
        verifyConformingPresentationCss(component, reference, source, ast);
    }
    if (componentFilesChecked === 0) failures.push(`${component.id}: no concrete ${policyLabel} source file was checked`);
}

if (mutationComponentId && !mutationInjected) {
    failures.push(`audit mutation target or variant is not an active boundary policy: ${mutationComponentId} ${mutationVariant}`);
}

if (failures.length) {
    console.error('UI boundary verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`UI boundary verification passed: ${filesChecked} active presentation, application, and adapter boundary source files checked.`);
}
