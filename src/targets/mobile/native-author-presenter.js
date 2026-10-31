// Pure native-author presentation. Bindings,DOM and geometry stay in the target adapter.
function __dcufCreateNativeAuthorPresentation(selectors) {
    const required=["shells","menu","menuRows","menuNick","menuLinks","menuLinksHover","menuStats","menuArrows","contents","heads","titles","bodies","sections","groups","labels","fields","placeholders","history","footers","buttons","primary","close","closeIcon","closeBefore","closeAfter","help","helpBefore","swatches","tips","focus","bulkGroup","bulkToggle","bulkIcon","bulkToggleBefore","menuMetadata","bulkExpanded","menuIdentity"];
    if(!selectors||!required.every(k=>typeof selectors[k]==='string'&&selectors[k].startsWith('.dcuf-native-')))throw new TypeError('Invalid native author bindings');
    const cssText=`
/* Independent B1 author/menu/memo target,2026-10-29. Native bindings,not product output. */
${selectors.shells} {box-sizing:border-box;color:var(--dcuf-theme-fg);border:1px solid var(--dcuf-b1-rim);border-radius:14px;background:var(--dcuf-b1-sheen),var(--dcuf-b1-floating);box-shadow:var(--dcuf-b1-shadow),inset 0 1px 0 #ffffff26;backdrop-filter:var(--dcuf-b1-floating-filter);font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;}
${selectors.menu} {width:224px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;padding:6px;font-size:13px;line-height:1.5;}
${selectors.menuRows} {box-sizing:border-box;height:auto;min-height:0;padding:0;margin:0;border:0;background:transparent;list-style:none;}
${selectors.menuNick} {display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:10px 11px 12px;margin-bottom:3px;border-bottom:1px solid var(--dcuf-b1-line);font-weight:700;color:var(--dcuf-theme-fg);background:transparent;}
${selectors.menuLinks} {display:flex;align-items:center;gap:10px;min-height:38px;box-sizing:border-box;padding:8px 11px;border-radius:8px;color:var(--dcuf-theme-fg);background:transparent;font-size:13px;line-height:1.5;text-decoration:none;white-space:nowrap;}
${selectors.menuLinksHover} {color:var(--dcuf-theme-accent-ink);background:var(--dcuf-control-selected-bg);}
${selectors.menuStats} {display:flex;justify-content:space-between;gap:6px;}
${selectors.menuArrows} {position:static;inset:auto;float:none;transform:none;margin:0 0 0 auto;flex:none;}
${selectors.contents} {box-sizing:border-box;width:100%;height:auto;max-height:calc(100dvh - 24px);overflow:auto;background:transparent;border-radius:inherit;scrollbar-width:thin;scrollbar-color:var(--dcuf-theme-border-strong) transparent;}
${selectors.heads} {box-sizing:border-box;height:auto;min-height:58px;padding:13px 52px 13px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--dcuf-b1-line);background:transparent;}
${selectors.titles} {float:none;margin:0;color:var(--dcuf-theme-fg);font-size:17px;line-height:1.5;font-weight:700;}
${selectors.bodies} {box-sizing:border-box;padding:20px;background:transparent;}
${selectors.sections} {padding:0 0 20px;margin:0 0 20px;border:0;border-bottom:1px solid var(--dcuf-b1-line);}
${selectors.groups} {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;}
${selectors.labels} {margin:0;color:var(--dcuf-theme-fg);font-size:13px;line-height:1.5;font-weight:650;}
${selectors.fields} {box-sizing:border-box;width:100%;height:42px;padding:9px 12px;border:1px solid var(--dcuf-theme-border-strong);border-radius:9px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);font:inherit;font-size:14px;line-height:1.5;caret-color:var(--dcuf-theme-accent);}
${selectors.placeholders} {color:var(--dcuf-panel-help-ink);opacity:1;}
${selectors.history} {margin:8px 0 0;padding:0;color:var(--dcuf-theme-fg);background:var(--dcuf-b1-paper);border-radius:8px;list-style:none;}
${selectors.footers} {display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dcuf-b1-line);background:transparent;}
${selectors.buttons} {box-sizing:border-box;width:auto;min-width:80px;height:38px;margin:0;padding:7px 17px;border:1px solid var(--dcuf-control-rim);border-radius:9px;background:var(--dcuf-control-secondary-bg);color:var(--dcuf-theme-fg);box-shadow:var(--dcuf-control-quiet-shadow);font:inherit;font-size:13px;font-weight:700;line-height:1.4;text-shadow:none;white-space:nowrap;cursor:pointer;}
${selectors.primary} {background:var(--dcuf-control-primary-bg);border-color:var(--dcuf-control-primary-rim);color:var(--dcuf-theme-on-accent);box-shadow:var(--dcuf-control-shadow);}
${selectors.close} {position:absolute;top:11px;right:11px;display:block;box-sizing:border-box;width:36px;height:36px;padding:0;margin:0;border:0;border-radius:8px;background:none;color:var(--dcuf-theme-fg-muted);font-size:0;box-shadow:none;cursor:pointer;}
${selectors.closeIcon} {display:none;}
${selectors.closeBefore},${selectors.closeAfter} {content:"";position:absolute;left:50%;top:50%;width:14px;height:1.5px;border-radius:1px;background:currentColor;transform:translate(-50%,-50%) rotate(45deg);}
${selectors.closeAfter} {transform:translate(-50%,-50%) rotate(-45deg);}
${selectors.help} {position:static;inset:auto;transform:none;float:none;flex:none;width:24px;height:24px;margin:0 0 0 auto;border:1px solid var(--dcuf-theme-border);border-radius:50%;background:var(--dcuf-control-secondary-bg);color:var(--dcuf-theme-fg-muted);font-size:0;}
${selectors.helpBefore} {content:"?";font-size:13px;font-weight:700;}
${selectors.swatches} {border:1px solid var(--dcuf-theme-border-strong);border-radius:6px;min-width:40px;min-height:24px;}
${selectors.bulkGroup} {display:flex;align-items:center;gap:6px;}
${selectors.bulkToggle} {position:relative;box-sizing:border-box;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dcuf-theme-fg-muted);}
${selectors.bulkIcon} {display:none;}
${selectors.bulkToggleBefore} {content:"";position:absolute;top:7px;left:8px;width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);}
${selectors.bulkExpanded} {transform:rotate(225deg);}
${selectors.menuIdentity} {position:static;float:none;display:inline;box-sizing:border-box;width:auto;height:auto;max-width:100%;line-height:inherit;overflow-wrap:anywhere;}
${selectors.menuMetadata} {position:static;float:none;display:inline;width:auto;height:auto;margin-left:4px;color:var(--dcuf-panel-help-ink);font-size:12px;font-weight:400;}
${selectors.tips} {box-sizing:border-box;max-width:calc(100vw - 48px);border:1px solid var(--dcuf-theme-border);border-radius:10px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);box-shadow:var(--dcuf-b1-shadow);font-size:13px;}
${selectors.focus} {outline:2px solid var(--dcuf-theme-accent);outline-offset:2px;}
`;
    const compactCss = `
@media(max-width:640px),(max-height:650px) {
${selectors.shells} { --dcuf-author-clearance:128px; }
${selectors.contents} { max-height:calc(100dvh - 128px); }
}
`;
    return Object.freeze({cssText:cssText+compactCss});
}
