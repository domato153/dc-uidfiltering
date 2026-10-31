import assert from 'node:assert/strict';
import { parse } from 'acorn';
import { restoreConcept01HeaderVisualDelta } from './concept01-header-visual-delta.mjs';

// Frozen FD58 palette delta: only these55 important tokens may become normal.
// Restore them before the independent historical/full-artifact comparisons.
export const palettePriorityProfile = Object.freeze({
  "header-shell": {
    "family": "HeaderShell",
    "rules": [
      {
        "rule": 0,
        "declarations": [
          "border-color: var(--dcuf-theme-border-strong);"
        ]
      },
      {
        "rule": 1,
        "declarations": [
          "border-color: var(--dcuf-theme-accent-strong);"
        ]
      },
      {
        "rule": 2,
        "declarations": [
          "box-shadow: inset 0 0 0 1px var(--dcuf-theme-accent-strong);"
        ]
      },
      {
        "rule": 3,
        "declarations": [
          "border-color: var(--dcuf-theme-accent-strong);"
        ]
      },
      {
        "rule": 4,
        "declarations": [
          "content: \"\";",
          "display: block;",
          "width: 12px;",
          "height: 12px;",
          "margin: auto;",
          "border: 3px solid var(--dcuf-theme-on-accent);",
          "border-radius: 50%;",
          "box-shadow: 7px 7px 0 -5px var(--dcuf-theme-on-accent);"
        ]
      }
    ]
  },
  "gallery-page-head": {
    "family": "GalleryPageHead",
    "rules": [
      {
        "rule": 0,
        "declarations": [
          "border-color: var(--dcuf-theme-border-strong);"
        ]
      },
      {
        "rule": 1,
        "declarations": [
          "border-color: var(--dcuf-theme-accent-strong);",
          "background-color: var(--dcuf-theme-accent-strong);",
          "background-image: none;",
          "color: var(--dcuf-theme-on-accent);"
        ]
      },
      {
        "rule": 2,
        "declarations": [
          "color: var(--dcuf-theme-accent);"
        ]
      },
      {
        "rule": 3,
        "declarations": [
          "border-color: var(--dcuf-theme-accent);",
          "color: var(--dcuf-theme-accent);"
        ]
      },
      {
        "rule": 4,
        "declarations": [
          "display: inline-flex;",
          "width: 26px;",
          "height: 20px;",
          "margin-left: 5px;",
          "align-items: center;",
          "justify-content: center;",
          "border: 2px solid var(--dcuf-theme-accent);",
          "border-radius: 2px;",
          "background: none;",
          "background-position: 0 0;",
          "text-indent: 0;",
          "overflow: hidden;",
          "color: var(--dcuf-theme-accent);",
          "font-size: 0;",
          "line-height: 1;",
          "box-sizing: border-box;",
          "vertical-align: middle;"
        ]
      },
      {
        "rule": 5,
        "declarations": [
          "content: \"m\";",
          "font: 900 12px/1 Arial, sans-serif;",
          "text-transform: lowercase;"
        ]
      },
      {
        "rule": 6,
        "declarations": [
          "content: \"mi\";",
          "font-size: 10px;"
        ]
      }
    ]
  },
  "header-gnb": {
    "family": "HeaderGnb",
    "rules": [
      {
        "rule": 0,
        "declarations": [
          "border-color: var(--dcuf-theme-accent-strong);",
          "color: var(--dcuf-theme-on-accent);"
        ]
      },
      {
        "rule": 1,
        "declarations": [
          "display: inline-block;",
          "width: 0;",
          "height: 0;",
          "margin-left: 8px;",
          "border: 0 solid transparent;",
          "border-right-width: 7px;",
          "border-left-width: 7px;",
          "border-top: 10px solid var(--dcuf-theme-on-accent);",
          "filter: none;",
          "vertical-align: middle;"
        ]
      }
    ]
  },
  "header-recent-visit": {
    "family": "HeaderRecentVisit",
    "rules": []
  },
  "header-drawer": {
    "family": "HeaderDrawer",
    "rules": [
      {
        "rule": 0,
        "declarations": [
          "box-shadow: inset 0 2px 0 color-mix(in srgb, var(--dcuf-theme-accent) 78%, transparent);"
        ]
      }
    ]
  }
});
export const retainedPalettePriorities = Object.freeze([
  "shell:1:background-color",
  "shell:1:background-image",
  "shell:1:color",
  "page:4:background-image",
  "gnb:1:background",
  "recent:0:color",
  "drawer:0:border-top-color"
]);

export function transformHeaderPalettePriorities(source, direction = 'restore') {
    source = restoreConcept01HeaderVisualDelta(source);
    assert.ok(['restore', 'normalize'].includes(direction), 'Unknown palette direction');
    const offset = source.charCodeAt(0) === 0xFEFF ? 1 : 0;
    const parsed = parse(source.slice(offset), { ecmaVersion: 'latest' });
    const declarations = [];
    const walk = node => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'FunctionDeclaration') declarations.push(node);
        for (const [key, value] of Object.entries(node)) {
            if (key === 'start' || key === 'end') continue;
            if (Array.isArray(value)) value.forEach(walk);
            else if (value && typeof value === 'object') walk(value);
        }
    };
    walk(parsed);
    const patches = [];
    let changed = 0, owners = 0;
    for (const [stem, { family, rules }] of Object.entries(palettePriorityProfile)) {
        const functions = declarations.filter(n => n.id.name === '__dcufBuild' + family + 'ThemeCss');
        if (!functions.length) continue;
        assert.equal(functions.length, 1, 'Exactly one palette factory per owner');
        const template = functions[0].body.body.find(n => n.type === 'ReturnStatement')?.argument;
        assert.equal(template?.type, 'TemplateLiteral', 'Pure palette template required');
        let index = 0, ownerChanges = 0;
        for (const quasi of template.quasis) {
            const from = quasi.start + offset, to = quasi.end + offset, original = source.slice(from, to);
            const text = original.replace(/\{([^{}]*)\}/g, (full, body) => {
                const ruleIndex = index++;
                const entry = rules.find(r => r.rule === ruleIndex);
                if (!entry) return full;
                for (const normal of entry.declarations) {
                    const important = normal.replace(';', ' !important;');
                    const before = direction === 'restore' ? normal : important;
                    const after = direction === 'restore' ? important : normal;
                    assert.equal(body.split(before).length - 1, 1, stem + ': exactly one ' + before);
                    body = body.replace(before, after); changed++; ownerChanges++;
                }
                return '{' + body + '}';
            });
            if (text !== original) patches.push({ from, to, text });
        }
        assert.equal(ownerChanges, rules.reduce((n, r) => n + r.declarations.length, 0), 'Complete palette owner delta');
        owners++;
    }
    assert.ok(owners > 0, 'Known palette factory required');
    for (const patch of patches.sort((a, b) => b.from - a.from)) source = source.slice(0, patch.from) + patch.text + source.slice(patch.to);
    return { source, changed, owners };
}
