import assert from 'node:assert/strict';

export const CHECKS = Object.freeze(['desktopEnvironment', 'extensionExecuted', 'hostPresent', 'rowsVisible', 'titleHit', 'keyboardFocus', 'articleVisible', 'noScriptErrors']);
export function selectCases(contract, suite) {
    assert.equal(contract.schemaVersion, 1);
    assert.ok(['smoke', 'full'].includes(suite), 'Unknown suite');
    assert.match(contract.extension.sha256, /^[A-F0-9]{64}$/);
    assert.match(contract.control.sha256, /^[A-F0-9]{64}$/);
    assert.equal(contract.extension.storeId, 'dhdgffkkebhmkfjojejmpbldmpobfkfo');
    assert.equal(contract.candidatePath, 'testbed/artifacts/runtime-under-test.user.js');
    assert.equal(contract.control.path, 'testbed/artifacts/baseline-mobile-stable.user.js');
    assert.deepEqual(contract.viewports, [{ id: 'wide', width: 1280, height: 900 }]);
    const cases = contract.routes.map(route => {
        assert.match(route.id, /^(major|minor)-(list|view)$/, 'Unsafe case identifier');
        const url = new URL(route.url);
        assert.equal(url.origin, 'https://gall.dcinside.com', 'Only public DCInside is in scope');
        assert.ok(/^\/(?:mgallery\/)?board\/(lists|view)\/$/.test(url.pathname), 'Unsafe route');
        assert.equal(route.kind, url.pathname.includes('/lists/') ? 'list' : 'view');
        assert.equal(route.id.endsWith('-view'), route.kind === 'view');
        assert.equal(route.id.startsWith('minor-'), url.pathname.startsWith('/mgallery/'));
        return { ...route, id: route.id + '-wide', viewport: contract.viewports[0] };
    });
    assert.equal(new Set(cases.map(c => c.id)).size, cases.length, 'Duplicate case');
    assert.ok(contract.smokeCases.length > 0 && new Set(contract.smokeCases).size === contract.smokeCases.length);
    assert.ok(contract.smokeCases.every(id => cases.some(c => c.id === id)), 'Unknown smoke case');
    return suite === 'full' ? cases : cases.filter(c => contract.smokeCases.includes(c.id));
}

export function caseVerdict(result) {
    if (result.unavailable) return 'UNAVAILABLE';
    return result.httpStatus === 200 && CHECKS.every(key => result.checks?.[key] === true) ? 'PASS' : 'FAIL';
}

// Control failures stay visible; they do not bless a candidate or fail an improved candidate.
// A missing control prevents an observed comparison. Every selected candidate must pass.
export function reportVerdict(report) {
    if (report.setupFailure || !report.selectedCases?.length) return 'UNAVAILABLE';
    if (!['candidateSha256', 'controlSha256', 'extensionSha256'].every(key => /^[A-F0-9]{64}$/.test(report.binding?.[key] || ''))) return 'UNAVAILABLE';
    if (report.results?.length !== report.selectedCases.length * 2 || new Set(report.selectedCases).size !== report.selectedCases.length) return 'UNAVAILABLE';
    for (const role of ['control', 'candidate']) {
        const setup = report.profiles?.[role];
        if (!setup?.installed || !setup?.userScriptsAllowed || !setup?.registeredAtDocumentStart || !setup?.isolated
            || setup.servedSha256 !== report.binding[role + 'Sha256']) return 'UNAVAILABLE';
        for (const id of report.selectedCases) {
            const matches = report.results.filter(r => r.role === role && r.id === id);
            if (matches.length !== 1 || caseVerdict(matches[0]) === 'UNAVAILABLE') return 'UNAVAILABLE';
        }
    }
    return report.results.filter(r => r.role === 'candidate').every(r => caseVerdict(r) === 'PASS') ? 'PASS' : 'FAIL';
}
