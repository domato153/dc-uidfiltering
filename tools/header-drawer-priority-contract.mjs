import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Frozen before product edits: exact 208D output from the actual fifteen-slot
// adapter and the separate characterization-only presenter .style binding.
export const drawerPriorityControl = Object.freeze({
    runtimeSha256: '208D22EDFCADC958774031CCA0AF0FD2953E0B2C2F17AD1F548C5827BC01EB8F',
    sourceSha256: '9f0f835013ba54821099f06522e0f1f93a4739dac6e2615a3d9a64b32d34ab81',
    nonCssSourceSha256: '63f70fdeaf8a11a8b7d3f9eccea3294fce47cd06b2a32101c254712a2c7f94f7',
    actualCssSha256: 'de4f4456a2d8b36d8c4515efefe17162d349a40a953624a69cc8434576b9d8c6',
    diagnosticCssSha256: 'd288c7ee4e2e4a83ffa1237282d886518e41693b263ce39a67f659a91e3096ff',
    removedPriorities: 56,
    retainedLatePriorities: 8,
});
const changes = [
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer-actions=\"1\"]",
    [
      [
        "position",
        "relative"
      ],
      [
        "overflow",
        "visible"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"]",
    [
      [
        "position",
        "relative"
      ],
      [
        "margin",
        "0"
      ],
      [
        "padding",
        "0"
      ],
      [
        "display",
        "inline-flex"
      ],
      [
        "align-items",
        "center"
      ],
      [
        "flex",
        "0 0 auto"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"] .dcuf-header-drawer__toggle",
    [
      [
        "display",
        "inline-flex"
      ],
      [
        "align-items",
        "center"
      ],
      [
        "justify-content",
        "center"
      ],
      [
        "gap",
        "8px"
      ],
      [
        "min-height",
        "32px"
      ],
      [
        "padding",
        "0 12px"
      ],
      [
        "border",
        "1px solid var(--dcuf-border)"
      ],
      [
        "border-radius",
        "999px"
      ],
      [
        "background",
        "rgba(255, 255, 255, 0.94)"
      ],
      [
        "color",
        "var(--dcuf-fg-sub)"
      ],
      [
        "font-size",
        "12px"
      ],
      [
        "font-weight",
        "700"
      ],
      [
        "letter-spacing",
        "-0.01em"
      ],
      [
        "box-shadow",
        "none"
      ],
      [
        "white-space",
        "nowrap"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"] .dcuf-header-drawer__toggle::after",
    [
      [
        "font-size",
        "10px"
      ],
      [
        "transition",
        "transform 0.18s ease"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"][data-open=\"1\"] .dcuf-header-drawer__toggle::after",
    [
      [
        "transform",
        "rotate(180deg)"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"] .dcuf-header-drawer__body",
    [
      [
        "display",
        "none"
      ],
      [
        "max-height",
        "0"
      ],
      [
        "opacity",
        "0"
      ],
      [
        "visibility",
        "hidden"
      ],
      [
        "margin-top",
        "0"
      ],
      [
        "position",
        "absolute"
      ],
      [
        "top",
        "calc(100% + 8px)"
      ],
      [
        "width",
        "min(640px, calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px))"
      ],
      [
        "max-width",
        "calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px)"
      ],
      [
        "overflow",
        "hidden"
      ],
      [
        "pointer-events",
        "none"
      ],
      [
        "z-index",
        "60"
      ],
      [
        "transition",
        "opacity 0.18s ease"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"][data-open=\"1\"] .dcuf-header-drawer__body",
    [
      [
        "display",
        "block"
      ],
      [
        "opacity",
        "1"
      ],
      [
        "visibility",
        "visible"
      ],
      [
        "margin-top",
        "0"
      ],
      [
        "pointer-events",
        "auto"
      ],
      [
        "overflow",
        "visible"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"] [data-dcuf-header-drawer=\"1\"] .dcuf-header-drawer__body-inner:not(:empty)",
    [
      [
        "min-height",
        "0"
      ],
      [
        "overflow",
        "visible"
      ],
      [
        "display",
        "grid"
      ],
      [
        "gap",
        "0"
      ],
      [
        "border",
        "1px solid var(--dcuf-border, #dfe5ee)"
      ],
      [
        "background",
        "#fff"
      ],
      [
        "box-shadow",
        "0 10px 22px rgba(12, 22, 40, 0.12)"
      ]
    ]
  ],
  [
    "[data-dcuf-header-drawer-scope=\"1\"].dc-filter-dark-mode [data-dcuf-header-drawer=\"1\"] .dcuf-header-drawer__toggle",
    [
      [
        "background",
        "rgba(26, 34, 46, 0.92)"
      ],
      [
        "border-color",
        "#3d4c60"
      ],
      [
        "color",
        "#d2dced"
      ],
      [
        "box-shadow",
        "0 10px 20px rgba(0, 0, 0, 0.3)"
      ]
    ]
  ]
];
export const drawerPriorityChanges = Object.freeze(changes.map(([selector, declarations]) => Object.freeze({
    selector, declarations: Object.freeze(declarations.map(([property, value]) => Object.freeze({ property, value }))),
})));
export const canonicalDrawerCss = css => css.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
export const drawerCssSha256 = css => createHash('sha256').update(canonicalDrawerCss(css)).digest('hex');

// Restore only the exact fifty-six normal declarations selected by the owned
// shell/body probes. Eight native-popup priorities, all other values, selectors,
// media, order and bindings must reproduce the frozen complete CSS digest.
export function restoreHistoricalDrawerPriorities(css, binding = 'actual') {
    assert.ok(['actual', 'diagnostic'].includes(binding), 'Unknown drawer CSS binding');
    for (const change of drawerPriorityChanges) {
        const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(match => match[1].trim() === change.selector);
        assert.equal(rules.length, 1, 'Exactly one selected drawer rule required: ' + change.selector);
        const match = rules[0];
        const from = match.index + match[0].indexOf('{') + 1;
        const to = css.indexOf('}', from);
        assert.ok(to >= from, 'Complete drawer rule required');
        let body = css.slice(from, to);
        for (const declaration of change.declarations) {
            const declarations = Array.from(body.matchAll(/([\w-]+)(\s*:\s*)([^;{}]*)(;)/g))
                .filter(item => item[1] === declaration.property);
            assert.equal(declarations.length, 1, 'Exactly one drawer declaration required: ' + change.selector + ' / ' + declaration.property);
            const found = declarations[0];
            assert.equal(found[3].trim(), declaration.value, 'Exact normal drawer declaration required: ' + change.selector + ' / ' + declaration.property);
            const restored = found[1] + found[2] + found[3].trimEnd() + ' !important;';
            body = body.slice(0, found.index) + restored + body.slice(found.index + found[0].length);
        }
        css = css.slice(0, from) + body + css.slice(to);
    }
    assert.equal(drawerCssSha256(css), binding === 'actual' ? drawerPriorityControl.actualCssSha256 : drawerPriorityControl.diagnosticCssSha256,
        'Complete frozen drawer CSS must match after only the declared fifty-six priority restorations');
    return css;
}
