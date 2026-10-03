export function policyBrowserSequenceIsValid(development) {
    const policyJob = development.split('\n  policy:\n')[1]?.split('\n  affected:\n')[0] || '';
    const position = command => {
        const matches = [...policyJob.matchAll(/^ {8}run: ([^\r\n]+)\r?$/gm)].filter(match => match[1] === command);
        return matches.length === 1 ? matches[0].index : -1;
    };
    const locked = position('pnpm install --frozen-lockfile');
    const browser = position('node testbed/node_modules/playwright/cli.js install --with-deps chromium');
    const gate = position('node tools/run-gates.mjs artifacts/impact.json artifacts/policy-result.json --only policy');
    return locked >= 0 && browser > locked && gate > browser;
}
