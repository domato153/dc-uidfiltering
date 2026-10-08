export function policyBrowserSequenceIsValid(development) {
    development = development.replace(/\r\n/g, '\n');
    const policyJob = development.split('\n  policy:\n')[1]?.split('\n  affected:\n')[0] || '';
    const position = command => {
        const matches = [...policyJob.matchAll(/^ {8}run: ([^\r\n]+)\r?$/gm)].filter(match => match[1] === command);
        return matches.length === 1 ? matches[0].index : -1;
    };
    const locked = position('pnpm install --frozen-lockfile');
    const browser = position('node testbed/node_modules/playwright/cli.js install --with-deps chromium');
    const gate = position('node tools/run-gates.mjs artifacts/impact.json artifacts/policy-result.json --only policy,proof-core,proof-runtime');
    return locked >= 0 && browser > locked && gate > browser
        && policyJob.includes("if: steps.route.outputs.proofRuntime == 'true'");
}

export function developmentJobRoutingIsValid(development) {
    const text = development.replace(/\r\n/g, '\n');
    return text.includes("if: github.event_name != 'push' && needs.policy.outputs.focused == 'true'")
        && text.includes("if: always() && github.event_name != 'push' && needs.policy.result == 'success' && needs.policy.outputs.acceptance == 'true' && (needs.affected.result == 'success' || needs.affected.result == 'skipped')")
        && text.includes('needs: [policy, affected]')
        && text.includes('full_acceptance:\n        description: Run full product and adversarial acceptance for a stage boundary\n        type: boolean\n        default: false')
        && text.includes(' --ci-output "$GITHUB_OUTPUT"')
        && !/node tools\/resolve-impact\.mjs[^\n]*--head HEAD --full/.test(text)
        && (text.match(/uses: actions\/cache@0057852bfaa89a56745cba8c7296529d2fc39830/g) || []).length === 4
        && (text.match(/run: pnpm install --frozen-lockfile/g) || []).length === 2;
}
