// Read rendered labels, not declarations from the presenter under test.
export function readToolbarVisualContract(toolbar) {
    const box = element => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        return { x: rect.x, right: rect.right, y: rect.y, height: rect.height,
            textY: text.y, textHeight: text.height, textCenter: text.y + text.height / 2 };
    };
    const tabs = [...toolbar.querySelectorAll('.array_tab button')].map(box).filter(x => x.height > 0);
    const scrollport = toolbar.querySelector('[data-dcuf-role="category-list"], .center_box ul');
    const bounds = scrollport?.getBoundingClientRect();
    const categories = [...(scrollport?.querySelectorAll('li > a') || [])].map(box)
        .filter(x => x.height > 0 && x.textHeight > 0 && x.x >= bounds.left - 1 && x.right <= bounds.right + 1);
    const after = getComputedStyle(toolbar, '::after');
    return { toolbar: box(toolbar), tabs, categories, layout: getComputedStyle(toolbar).display,
        clearfix: { display: after.display, content: after.content } };
}

// Same-line labels should share an optical centre; allow small font rounding.
// This is a composition defect check, never an aesthetic score/material oracle.
export function assessToolbarVisualContract(snapshot, { sameRow = true } = {}) {
    const findings = [];
    if (sameRow) {
        if (!snapshot.tabs.length || !snapshot.categories.length) findings.push({ code: 'UNMEASURED_GROUP', message: 'Both visible groups are required' });
        else {
            const centre = snapshot.tabs.reduce((sum, x) => sum + x.textCenter, 0) / snapshot.tabs.length;
            const offsets = snapshot.categories.map(x => x.textCenter - centre);
            if (offsets.some(x => Math.abs(x) > 3)) findings.push({ code: 'CATEGORY_LABEL_ALIGNMENT', message: 'Categories sit above/below the adjacent tab labels', offsets });
        }
    }
    if (snapshot.layout === 'grid' && snapshot.clearfix?.display !== 'none'
        && ['""', "''"].includes(snapshot.clearfix?.content)) {
        findings.push({ code: 'LEGACY_CLEARFIX_GRID_ITEM', message: 'Native float clearfix creates a blank grid row and gap' });
    }
    return findings;
}
