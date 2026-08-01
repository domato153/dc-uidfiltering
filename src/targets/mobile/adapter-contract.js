export const MOBILE_ADAPTER_CONTRACT = Object.freeze({
    name: 'mobile',
    responsibilities: [
        'Collect list rows, article comments, and dynamic rerender targets from the mobile script runtime',
        'Extract FilterSubject-compatible values from existing mobile DOM selectors',
        'Apply FilterDecision results without duplicating filter rules locally',
        'Preserve current popup, typography, reply-merge, and mirrored-list behavior while the shared core is extracted',
    ],
    highRiskAreas: [
        'boot overlay and hidden-body release timing',
        'mirrored post list visibility sync',
        'parent comment visibility plus delayed reply reruns',
        'late popup and layer position fixes',
    ],
});
