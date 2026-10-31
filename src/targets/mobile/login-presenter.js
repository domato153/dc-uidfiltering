// Pure login presentation. Native selectors and host behavior belong to the adapter.
function __dcufCreateLoginPresentation(selectors) {
    const required = ["scope","darkScope","body","page","header","headerInner","logoGroup","logo","darkLogo","loginLink","container","content","card","inputBox","inputInner","fieldset","title","fields","placeholder","primary","primaryHover","options","checkboxGroup","checkbox","checkboxMark","checkboxLabel","security","recovery","recoveryLink","recoverySeparator","advertisement","footer","policy","policyLink","policySeparator","copyright","focus","selection"];
    if (!selectors || !required.every(key => typeof selectors[key] === 'string' && selectors[key].startsWith('[data-dcuf-login]'))) throw new TypeError('Invalid login presentation bindings');
    const css = __dcufBuildThemeBaseCss('data-dcuf-palette') + __dcufBuildB1MaterialCss('data-dcuf-palette') + `
${selectors.scope} { --dcuf-login-input:var(--dcuf-theme-surface-input);--dcuf-login-muted:var(--dcuf-panel-help-ink);color-scheme:light; }
${selectors.darkScope} { color-scheme:dark; }
${selectors.body} {
  min-width:0;margin:0;color:var(--dcuf-theme-fg);
  background:linear-gradient(135deg,color-mix(in srgb,var(--dcuf-theme-accent-soft) 32%,var(--dcuf-b1-canvas)),var(--dcuf-b1-canvas) 65%);
  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
}
${selectors.page} {width:100%;min-width:0;min-height:100svh;}
${selectors.header} {
  width:calc(100% - 32px);max-width:1120px;height:72px;margin:16px auto 0;
  border:1px solid var(--dcuf-b1-rim);border-radius:16px;
  background:var(--dcuf-b1-sheen),var(--dcuf-b1-floating);
  box-shadow:var(--dcuf-b1-shadow);backdrop-filter:blur(12px) saturate(1.1);
}
${selectors.headerInner} {width:auto;height:100%;margin:0;padding:0 24px;display:flex;align-items:center;}
${selectors.logoGroup} {position:static;inset:auto;margin:0;align-items:center;width:100%;}
${selectors.logo} {filter:none;}
${selectors.darkLogo} {filter:invert(1);}
${selectors.loginLink} {margin:0 0 0 auto;color:var(--dcuf-login-muted);font-size:13px;font-weight:650;}
${selectors.container} {width:100%;min-width:0;margin:0;}
${selectors.content} {margin:0;padding:clamp(52px,13vh,126px) 20px 64px;}
${selectors.card} {
  box-sizing:border-box;width:min(520px,100%);height:auto;margin:0 auto;padding:34px 40px 30px;
  border:1px solid var(--dcuf-b1-rim);border-radius:16px;
  background:var(--dcuf-b1-sheen),var(--dcuf-b1-floating);
  box-shadow:var(--dcuf-b1-shadow);backdrop-filter:blur(12px) saturate(1.1);
}
${selectors.inputBox} {float:none;width:100%;background:transparent;}
${selectors.inputInner} {box-sizing:border-box;width:100%;padding:0;}
${selectors.fieldset} {min-inline-size:0;border:0;margin:0;padding:0;}
${selectors.title} {
  position:static;overflow:visible;clip:auto;visibility:visible;width:auto;height:auto;margin:0 0 26px;
  font-size:24px;font-weight:750;letter-spacing:-.025em;line-height:1.3;
}
${selectors.fields} {
  box-sizing:border-box;width:100%;height:50px;margin:0 0 12px;padding:0 15px;
  border:1px solid var(--dcuf-theme-border-strong);border-radius:10px;
  color:var(--dcuf-theme-fg);background:var(--dcuf-login-input);font:inherit;font-size:15px;line-height:normal;
  caret-color:var(--dcuf-theme-accent);
}
${selectors.placeholder} {color:var(--dcuf-login-muted);opacity:1;}
${selectors.primary} {
  box-sizing:border-box;width:100%;height:48px;margin:4px 0 0;padding:0 16px;
  border:1px solid var(--dcuf-control-primary-rim);border-radius:10px;
  background:var(--dcuf-control-primary-bg);box-shadow:var(--dcuf-control-shadow);
  color:var(--dcuf-theme-on-accent);font:inherit;font-size:15px;font-weight:700;line-height:normal;text-shadow:none;
}
${selectors.primaryHover} {filter:brightness(1.07);}
${selectors.options} {display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:17px;color:var(--dcuf-login-muted);font-size:12px;}
${selectors.checkboxGroup} {float:none;display:flex;align-items:center;gap:7px;padding-left:0;}
${selectors.checkbox} {position:static;width:16px;height:16px;margin:0;opacity:1;z-index:auto;appearance:auto;accent-color:var(--dcuf-theme-accent);}
${selectors.checkboxMark} {display:none;}
${selectors.checkboxLabel} {padding:0;line-height:20px;background:none;color:var(--dcuf-login-muted);}
${selectors.security} {float:none;margin:0;white-space:nowrap;color:var(--dcuf-login-muted);}
${selectors.recovery} {display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:27px;padding-top:22px;border-top:1px solid var(--dcuf-theme-border);}
${selectors.recoveryLink} {color:var(--dcuf-login-muted);font-size:12px;line-height:1.6;}
${selectors.recoverySeparator} {display:none;}
${selectors.advertisement} {display:none;}
${selectors.footer} {width:100%;height:auto;margin:0;padding:0 20px 28px;box-sizing:border-box;border-top:0;background:transparent;color:var(--dcuf-login-muted);}
${selectors.policy} {display:flex;width:auto;justify-content:center;flex-wrap:wrap;gap:6px 15px;}
${selectors.policyLink} {padding:0;color:var(--dcuf-login-muted);font-size:11px;line-height:1.8;}
${selectors.policySeparator} {display:none;}
${selectors.copyright} {width:auto;margin-top:16px;color:var(--dcuf-login-muted);font-size:10px;line-height:1.8;}
${selectors.focus} {outline:2px solid var(--dcuf-theme-accent);outline-offset:3px;}
${selectors.selection} {background:var(--dcuf-theme-accent-soft);color:var(--dcuf-theme-fg);}
@media(max-width:560px) {
  ${selectors.header} {width:calc(100% - 24px);height:64px;margin-top:12px;}
  ${selectors.headerInner} {padding:0 18px;}
  ${selectors.content} {padding:48px 16px;}
  ${selectors.card} {padding:30px 22px 26px;}
}
`;
    return Object.freeze({id:'dcuf-mobile-login-style',css});
}
