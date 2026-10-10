    const __dcufNativeFormPresenter = (() => {
        const VERSION = 'native-form-semantic-write-complete-v1';
        const styles = Object.freeze([
            Object.freeze({
                key: 'modify-delete',
                id: 'dcuf-mobile-modify-theme',
                css: `
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            min-width: 0 !important;
            margin: 0 !important;
            background: var(--dcuf-theme-page, #f2f6fb) !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            overflow-x: clip !important;
        }
        [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: calc(100dvh - 170px) !important;
            margin: 0 !important;
            padding: 6px 12px 28px !important;
            background: transparent !important;
        }
        [data-dcuf-native-form-role="page-section"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="page-section"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            width: min(760px, 100%) !important;
            min-width: 0 !important;
            margin: 0 auto !important;
        }
        [data-dcuf-native-form-role="page-header"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="page-header"][data-dcuf-native-form-state="delete-confirm"] {
            width: 100% !important;
            margin: 0 !important;
            padding: 12px 4px !important;
            border-bottom-color: var(--dcuf-theme-accent, #3f6de0) !important;
            color: var(--dcuf-theme-accent, #3f6de0) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="password"] {
            box-sizing: border-box !important;
            display: grid !important;
            width: 100% !important;
            min-height: min(520px, calc(100dvh - 250px)) !important;
            margin: 0 !important;
            padding: 24px 0 !important;
            place-items: center !important;
        }
        [data-dcuf-native-form-role="content"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="popup"][data-dcuf-native-form-state="password"] {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 520px !important;
            min-width: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="password"] {
            overflow: hidden !important;
            border: 1px solid var(--dcuf-theme-border-strong, #cbd2db) !important;
            border-radius: 20px !important;
            background: linear-gradient(160deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-card-bottom, #fafbfc)) !important;
            box-shadow: var(--dcuf-theme-panel-shadow, 0 18px 42px rgba(31, 45, 68, .16)) !important;
        }
        [data-dcuf-native-form-role="panel"][data-dcuf-native-form-state="password"] {
            box-sizing: border-box !important;
            display: grid !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 30px 26px 24px !important;
            gap: 16px !important;
            place-items: stretch !important;
            text-align: center !important;
        }
        [data-dcuf-native-form-role="message"][data-dcuf-native-form-state="password"] {
            display: block !important;
            margin: 0 !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            font-size: 17px !important;
            font-weight: 800 !important;
            line-height: 1.45 !important;
        }
        [data-dcuf-native-form-role="password-field"][data-dcuf-native-form-state="password"] {
            box-sizing: border-box !important;
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            height: 50px !important;
            margin: 0 !important;
            padding: 0 14px !important;
            border: 1px solid var(--dcuf-theme-border-strong, #cbd2db) !important;
            border-radius: 12px !important;
            outline: 0 !important;
            background: var(--dcuf-theme-surface-input, #fff) !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            font: 700 17px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
            box-shadow: inset 0 2px 5px color-mix(in srgb, var(--dcuf-theme-accent) 6%, transparent) !important;
        }
        [data-dcuf-native-form-role="password-field"][data-dcuf-native-form-state="password"]:focus {
            border-color: var(--dcuf-theme-accent, #3f6de0) !important;
            box-shadow: 0 0 0 3px var(--dcuf-theme-focus-ring, rgba(63, 109, 224, .18)) !important;
        }
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="password"] {
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 10px !important;
        }
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="password"] > [data-dcuf-native-form-role="cancel"],
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="password"] > [data-dcuf-native-form-role="submit"] {
            box-sizing: border-box !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            transform: none !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            margin: 0 !important;
            padding: 10px 12px !important;
            border: 1px solid var(--dcuf-theme-border-strong, #cbd2db) !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-surface-input, #f7f8fa)) !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
            cursor: pointer !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            display: grid !important;
            width: 100% !important;
            min-height: min(520px, calc(100dvh - 250px)) !important;
            margin: 0 !important;
            padding: 24px 0 !important;
            place-items: center !important;
        }
        [data-dcuf-native-form-role="content"][data-dcuf-native-form-state="delete-confirm"],
        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="delete-confirm"],
        [data-dcuf-native-form-role="popup"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 520px !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="delete-confirm"] {
            position: static !important;
            transform: none !important;
        }
        [data-dcuf-native-form-role="popup"][data-dcuf-native-form-state="delete-confirm"] {
            position: static !important;
            inset: auto !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            transform: none !important;
            z-index: auto !important;
        }
        [data-dcuf-native-form-role="panel"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            position: relative !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 30px 26px 24px !important;
            border: 1px solid var(--dcuf-theme-border-strong, #cbd2db) !important;
            border-radius: 20px !important;
            background: linear-gradient(160deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-card-bottom, #fafbfc)) !important;
            box-shadow: var(--dcuf-theme-panel-shadow, 0 18px 42px rgba(31, 45, 68, .16)) !important;
            text-align: center !important;
        }
        [data-dcuf-native-form-role="message-shell"][data-dcuf-native-form-state="delete-confirm"] {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            font-size: 17px !important;
            font-weight: 800 !important;
            line-height: 1.45 !important;
        }
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="delete-confirm"] {
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            margin: 20px 0 0 !important;
            padding: 0 !important;
            gap: 10px !important;
        }
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="delete-confirm"] > [data-dcuf-native-form-role="cancel"],
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="delete-confirm"] > [data-dcuf-native-form-role="submit"] {
            box-sizing: border-box !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            transform: none !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            margin: 0 !important;
            padding: 10px 12px !important;
            border: 1px solid var(--dcuf-theme-border-strong, #cbd2db) !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-surface-input, #f7f8fa)) !important;
            color: var(--dcuf-theme-fg, #27313f) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
            cursor: pointer !important;
        }
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="password"] > [data-dcuf-native-form-role="submit"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="delete-confirm"] > [data-dcuf-native-form-role="submit"][data-dcuf-native-form-state="delete-confirm"] {
            border-color: var(--dcuf-theme-accent-strong, #245bda) !important;
            background-color: var(--dcuf-theme-accent-strong, #245bda) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-primary-top, #5d87f0), var(--dcuf-theme-accent-strong, #245bda)) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
            box-shadow: 0 8px 18px var(--dcuf-theme-accent-shadow, rgba(36, 91, 218, .25)) !important;
        }
        [data-dcuf-native-form-role="trailing-chrome"][data-dcuf-native-form-state="password"],
        [data-dcuf-native-form-role="trailing-chrome"][data-dcuf-native-form-state="delete-confirm"] {
            display: none !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="password"].dc-filter-dark-mode [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="password"] {
            box-shadow: 0 20px 46px rgba(0, 0, 0, .44) !important;
        }
        @media screen and (max-width: 480px) {
            [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="password"],
            [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="delete-confirm"] { padding: 4px 10px 20px !important; }
            [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="password"],
            [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="delete-confirm"] {
                min-height: calc(100dvh - 220px) !important;
                padding: 16px 0 !important;
            }
            [data-dcuf-native-form-role="panel"][data-dcuf-native-form-state="password"] {
                padding: 24px 18px 18px !important;
            }
            [data-dcuf-native-form-role="panel"][data-dcuf-native-form-state="delete-confirm"] {
                padding: 24px 18px 18px !important;
            }
        }
    `,
            }),
            Object.freeze({
                key: 'write',
                id: 'dcuf-mobile-write-theme',
                css: `
        [data-dcuf-native-form-role="document-root"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"] {
            overflow-x: hidden !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            --dcuf-write-fg: #22324c;
            --dcuf-write-fg-sub: #5f6f86;
            --dcuf-write-accent: var(--dcuf-theme-accent, #3f6de0);
            --dcuf-write-accent-strong: var(--dcuf-theme-accent-strong, #245bda);
            --dcuf-write-surface: #ffffff;
            --dcuf-write-surface-muted: var(--dcuf-theme-surface-muted, #f6f8fb);
            --dcuf-write-border: var(--dcuf-theme-border, #d7e0ec);
            --dcuf-write-border-strong: var(--dcuf-theme-border-strong, #c7d3e4);
            --dcuf-write-shadow: 0 8px 24px rgba(18, 35, 69, 0.08);
            background: #f2f6fb !important;
            overflow-x: clip !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode {
            --dcuf-write-fg: #edf3ff;
            --dcuf-write-fg-sub: #b6c4d9;
            --dcuf-write-accent: var(--dcuf-theme-accent, #8cb4ff);
            --dcuf-write-accent-strong: var(--dcuf-theme-accent-strong, #6f9dff);
            --dcuf-write-surface: #18212d;
            --dcuf-write-surface-muted: var(--dcuf-theme-surface-muted, #1e2a39);
            --dcuf-write-border: var(--dcuf-theme-border, #314258);
            --dcuf-write-border-strong: var(--dcuf-theme-border-strong, #45607c);
            --dcuf-write-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
            background: #121922 !important;
        }
        [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="top-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="content-column"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="write-shell"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        [data-dcuf-native-form-role="top-shell"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
        }
        [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"] {
            padding: 8px !important;
            background: transparent !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="write-shell"][data-dcuf-native-form-state="write-editor"] {
            padding-right: 0 !important;
            padding-left: 0 !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dcuf-write-desktop-site-mobile [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"] {
            width: var(--dcuf-write-device-width) !important;
            max-width: var(--dcuf-write-device-width) !important;
            padding: 8px !important;
            zoom: var(--dcuf-write-desktop-site-scale);
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dcuf-write-desktop-site-mobile {
            padding-right: 0 !important;
            padding-left: 0 !important;
        }
        [data-dcuf-native-form-role="content-column"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="write-shell"][data-dcuf-native-form-state="write-editor"] {
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            display: block !important;
            width: min(100%, 1120px) !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 auto !important;
            padding: 12px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 12px !important;
            background: var(--dcuf-write-surface) !important;
            box-shadow: var(--dcuf-write-shadow) !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-box-sizing="border-box"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-box-sizing="border-box"]::before,
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-box-sizing="border-box"]::after {
            box-sizing: border-box;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="decoy-input"][data-dcuf-native-form-state="write-editor"] {
            width: 0 !important;
            height: 0 !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            position: absolute !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
        }
        [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="fields-legend"][data-dcuf-native-form-state="write-editor"] {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        [data-dcuf-native-form-role="guest-field"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="subject-field"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="captcha-image-shell"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            float: none !important;
        }
        [data-dcuf-native-form-role="subject-field"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="field-clear"][data-dcuf-native-form-state="write-editor"] {
            grid-column: 1 / -1;
        }
        [data-dcuf-native-form-role="field-clear"][data-dcuf-native-form-state="write-editor"] {
            display: none !important;
        }
        [data-dcuf-native-form-role="captcha-image-shell"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 46px !important;
            padding: 4px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 9px !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        [data-dcuf-native-form-role="captcha-image"][data-dcuf-native-form-state="write-editor"] {
            display: block !important;
            width: auto !important;
            max-width: 100% !important;
            height: 38px !important;
            object-fit: contain !important;
        }
        [data-dcuf-native-form-role="fields-table"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="fields-table-body"][data-dcuf-native-form-state="write-editor"] {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            border-spacing: 0 !important;
        }
        [data-dcuf-native-form-role="subject-row"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="identity-row"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 0 10px !important;
            padding: 0 !important;
            border: 0 !important;
        }
        [data-dcuf-native-form-role="subject-row"][data-dcuf-native-form-state="write-editor"] {
            display: grid !important;
            grid-template-columns: 58px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
        }
        [data-dcuf-native-form-role="identity-row"][data-dcuf-native-form-state="write-editor"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
        }
        [data-dcuf-native-form-role="subject-label-cell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="subject-control-cell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="identity-label-cell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="identity-field-cell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="captcha-cell"][data-dcuf-native-form-state="write-editor"] {
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        [data-dcuf-native-form-role="identity-label-cell"][data-dcuf-native-form-state="write-editor"] {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        [data-dcuf-native-form-role="captcha-cell"][data-dcuf-native-form-state="write-editor"] {
            grid-column: 1 / -1;
        }
        [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="name-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="password-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="captcha-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="form-select"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 46px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 9px !important;
            outline: none !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-control-kind="input"]:focus,
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-control-kind="select"]:focus,
        [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"]:focus,
        [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"]:focus {
            border-color: var(--dcuf-write-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-write-accent) 18%, transparent) !important;
        }
        [data-dcuf-native-form-role="captcha-panel"][data-dcuf-native-form-state="write-editor"] {
            display: grid !important;
            grid-template-columns: minmax(108px, 0.42fr) minmax(0, 1fr);
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 8px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        [data-dcuf-native-form-role="captcha-label"][data-dcuf-native-form-state="write-editor"] {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        [data-dcuf-native-form-role="captcha-image"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 38px !important;
            object-fit: contain !important;
            border-radius: 7px !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 0 10px !important;
            padding: 6px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            position: relative !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 3px !important;
            flex: 1 1 auto !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 4px 0 0 !important;
            float: none !important;
            list-style: none !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            overscroll-behavior-inline: contain;
            scroll-behavior: smooth;
            scroll-snap-type: x proximity;
            scroll-padding-inline: 12px;
            scrollbar-width: none !important;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x pinch-zoom;
            cursor: grab;
            user-select: none;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"].dcuf-headtext-dragging {
            cursor: grabbing;
            scroll-behavior: auto;
            scroll-snap-type: none;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"]::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 48px !important;
            min-height: 38px !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 10px !important;
            float: none !important;
            flex: 0 0 auto !important;
            scroll-snap-align: start;
            border-radius: 999px !important;
            cursor: pointer;
        }
        [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-tooltip"][data-dcuf-native-form-state="write-editor"] {
            position: fixed !important;
            left: var(--dcuf-headtext-tip-left, 8px) !important;
            top: var(--dcuf-headtext-tip-top, 8px) !important;
            right: auto !important;
            bottom: auto !important;
            z-index: 1200 !important;
            max-width: min(320px, var(--dcuf-headtext-tip-max-width, calc(100vw - 16px))) !important;
        }
        [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"] {
            flex: 0 0 auto !important;
            padding: 0 6px !important;
            color: var(--dcuf-write-fg-sub) !important;
            font-weight: 700 !important;
        }
        [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="headtext-option-control"][data-dcuf-native-form-state="write-editor"] {
            min-width: 48px !important;
            min-height: 38px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 999px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-option-state="selected"],
        [data-dcuf-native-form-role="headtext-option-control"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-option-state="selected"] {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: var(--dcuf-write-accent-strong) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
        }
        [data-dcuf-native-form-role="editor-wrapper"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-area"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        [data-dcuf-native-form-role="editor-wrapper"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"] {
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface) !important;
            position: relative !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-toolbar-kind~="primary"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-toolbar-kind~="media"] {
            position: relative !important;
            z-index: 3 !important;
            border-radius: 13px 13px 0 0 !important;
        }
        [data-dcuf-native-form-role="editor-area"][data-dcuf-native-form-state="write-editor"] {
            position: relative !important;
            z-index: 0 !important;
            overflow: hidden !important;
        }
        [data-dcuf-native-form-role="editor-statusbar"][data-dcuf-native-form-state="write-editor"] {
            border-radius: 0 0 13px 13px !important;
        }
        [data-dcuf-native-form-role="headtext-feedback"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="headtext-tooltip"][data-dcuf-native-form-state="write-editor"] {
            z-index: 1000 !important;
            max-width: calc(100vw - 24px) !important;
            visibility: visible;
            pointer-events: auto;
        }
        [data-dcuf-native-form-role="headtext-tooltip"][data-dcuf-native-form-state="write-editor"]:not(.dcuf-headtext-tip-positioned) {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        [data-dcuf-native-form-role="headtext-tooltip"][data-dcuf-native-form-state="write-editor"].dcuf-headtext-tip-positioned {
            visibility: visible !important;
            pointer-events: auto !important;
        }
        [data-dcuf-native-form-layer-kind]:not([data-dcuf-native-form-layer-state="positioned"]) {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        [data-dcuf-native-form-layer-kind][data-dcuf-native-form-layer-state="positioned"] {
            visibility: visible !important;
            pointer-events: auto !important;
        }
        [data-dcuf-native-form-layer-kind~="popup"][data-dcuf-native-form-layer-state="positioned"],
        [data-dcuf-native-form-layer-kind~="external-dccon"][data-dcuf-native-form-layer-state="positioned"] {
            position: fixed !important;
            zoom: var(--dcuf-write-desktop-site-inverse-scale, 1);
        }
        [data-dcuf-native-form-layer-kind~="dropdown"][data-dcuf-native-form-layer-state="positioned"] {
            position: fixed !important;
            zoom: 1 !important;
        }
        [data-dcuf-native-form-layer-kind][data-dcuf-native-form-layer-state="positioned"] {
            left: var(--dcuf-editor-layer-left) !important;
            top: var(--dcuf-editor-layer-top) !important;
            right: auto !important;
            bottom: auto !important;
            z-index: 2147483647 !important;
        }
        [data-dcuf-native-form-layer-kind~="dropdown"][data-dcuf-native-form-layer-state="positioned"] {
            max-width: var(--dcuf-editor-layer-max-width) !important;
            max-height: var(--dcuf-editor-layer-max-height) !important;
            overflow: auto !important;
            overscroll-behavior: contain !important;
            -webkit-overflow-scrolling: touch !important;
        }
        [data-dcuf-native-form-role="editor-toolbar-group"][data-dcuf-native-form-state="write-editor"]:has([data-dcuf-surface="write-font-menu"]) [data-dcuf-native-form-toolbar-control~="fontname"],
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"]:has([data-dcuf-surface="write-font-menu"]) [data-dcuf-native-form-toolbar-control~="fontname"] {
            width: auto !important;
            min-width: 88px !important;
            max-width: 132px !important;
            flex: 0 0 auto !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-font-label"][data-dcuf-native-form-state="write-editor"] {
            display: inline-block !important;
            min-width: 42px !important;
            max-width: 88px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            color: var(--dcuf-write-fg) !important;
            -webkit-text-fill-color: currentColor !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-font-label"][data-dcuf-native-form-state="write-editor"]:empty::before {
            content: "글꼴";
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 5px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 !important;
            padding: 5px !important;
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-toolbar-item="1"] {
            flex: 0 0 auto !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-toolbar-scroll="horizontal"] {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            overscroll-behavior-inline: contain;
            scroll-behavior: smooth;
            scrollbar-width: none !important;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x pinch-zoom;
            cursor: grab;
            user-select: none;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-toolbar-state="dragging"] {
            scroll-behavior: auto;
            cursor: grabbing;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-toolbar-scroll="horizontal"]::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"] {
            min-width: 38px !important;
            min-height: 38px !important;
            padding: 0 9px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 8px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
        }
        [data-dcuf-native-form-toolbar-control~="danger"][data-dcuf-native-form-state="write-editor"] {
            border-color: #d5525b !important;
            background: #d5525b !important;
            color: #fff !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-label"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-height: 38px !important;
            margin-left: auto !important;
            padding: 0 9px !important;
            color: var(--dcuf-write-fg-sub) !important;
            white-space: nowrap !important;
        }
        [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 320px !important;
            padding: 14px !important;
            border: 0 !important;
            border-radius: 0 !important;
            outline: none !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            line-height: 1.6 !important;
            resize: vertical !important;
            overflow-wrap: anywhere !important;
        }
        [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"] {
            display: block !important;
        }
        [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"] {
            display: none !important;
        }
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-editor-mode="source"] [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"][hidden],
        [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"][hidden] {
            display: none !important;
        }
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-editor-mode="source"] [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"] {
            display: block !important;
        }
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"]:has([data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"][hidden]) [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"]:not([hidden]) {
            display: block !important;
        }
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"][hidden],
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"][hidden] {
            display: none !important;
        }
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"]:has([data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"][hidden]) [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"]:not([hidden]) {
            display: block !important;
        }
        [data-dcuf-native-form-role="editor-statusbar"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-info"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-list-shell"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 10px 0 0 !important;
            padding: 10px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            overflow: hidden !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-input"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 38px !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-list"][data-dcuf-native-form-state="write-editor"] {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-item"][data-dcuf-native-form-state="write-editor"] {
            max-width: 100% !important;
            background: color-mix(in srgb, var(--dcuf-write-accent) 12%, var(--dcuf-write-surface)) !important;
            color: var(--dcuf-write-fg) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-shell"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 8px 0 0 !important;
            overflow: hidden !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt"][data-dcuf-native-form-state="write-editor"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto auto !important;
            align-items: stretch !important;
            gap: 6px !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-input-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-input"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-input-shell"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            align-items: center !important;
            overflow: hidden !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-input"][data-dcuf-native-form-state="write-editor"] {
            flex: 1 1 auto !important;
            resize: none !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="write-option-shell"][data-dcuf-native-form-state="write-editor"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="adult-control"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-height: 38px !important;
            margin: 8px 0 0 !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            align-items: stretch !important;
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 10px 0 0 !important;
            padding: 10px 0 0 !important;
            border-top: 1px solid var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="outer-action-item"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            float: none !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 9px !important;
            background: var(--dcuf-write-surface-muted) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            text-align: center !important;
            text-decoration: none !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-primary-top, #426fe4) 0%, var(--dcuf-write-accent-strong) 100%) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
        }
        /* Visual refinement: match the mobile list/article card language. */
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            border-radius: 16px !important;
            box-shadow: 0 12px 30px color-mix(in srgb, var(--dcuf-write-accent) 10%, transparent) !important;
        }
        [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="name-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="password-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="captcha-input"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            border-radius: 11px !important;
            background: #fff !important;
            box-shadow: 0 2px 7px color-mix(in srgb, var(--dcuf-write-accent) 6%, transparent) !important;
        }
        [data-dcuf-native-form-role="captcha-image-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="captcha-panel"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            background: #fff !important;
            box-shadow: 0 2px 7px rgba(25, 50, 92, 0.04) !important;
        }
        [data-dcuf-native-form-role="captcha-image"][data-dcuf-native-form-state="write-editor"] {
            background: #fff !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"] {
            min-height: 52px !important;
            padding: 7px 9px !important;
            border-color: #d7e2f0 !important;
            border-radius: 13px !important;
            background: #fff !important;
            box-shadow: 0 3px 10px rgba(25, 50, 92, 0.05) !important;
        }
        [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"]::before,
        [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"]::after {
            min-height: 38px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            content: none !important;
        }
        [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"]::before,
        [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"]::after {
            display: none !important;
            content: none !important;
        }
        [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            align-self: center !important;
            min-width: 58px !important;
            min-height: 36px !important;
            margin: 0 4px 0 0 !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 9px !important;
            background: #eef2f7 !important;
            color: #4d5e76 !important;
            box-shadow: none !important;
            line-height: 1 !important;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"] {
            border: 1px solid transparent !important;
            background: transparent !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        [data-dcuf-native-form-role="headtext-list"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-option-state="selected"] {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: var(--dcuf-write-accent-strong) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
            box-shadow: 0 4px 10px var(--dcuf-theme-accent-shadow, rgba(36, 91, 218, 0.2)) !important;
        }
        [data-dcuf-native-form-role="editor-wrapper"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            border-radius: 14px !important;
            box-shadow: 0 5px 16px color-mix(in srgb, var(--dcuf-write-accent) 7%, transparent) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"] {
            border-bottom: 1px solid var(--dcuf-write-border) !important;
            background: linear-gradient(180deg, var(--dcuf-write-surface) 0%, var(--dcuf-write-surface-muted) 100%) !important;
        }
        [data-dcuf-native-form-role="editor-toolbar-group"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"] {
            position: relative !important;
            float: none !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        [data-dcuf-native-form-role="editor-toolbar-group"][data-dcuf-native-form-state="write-editor"]::before,
        [data-dcuf-native-form-role="editor-toolbar-group"][data-dcuf-native-form-state="write-editor"]::after,
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"]::before,
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"]::after {
            display: none !important;
            content: none !important;
            border: 0 !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"] {
            order: 99 !important;
            margin-left: auto !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-group"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            align-self: center !important;
            position: relative !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 0 0 auto !important;
            padding: 0 !important;
            float: none !important;
            transform: none !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-control"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: 38px !important;
            min-width: 70px !important;
            min-height: 38px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            float: none !important;
            transform: none !important;
            overflow: visible !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-label"][data-dcuf-native-form-state="write-editor"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            float: none !important;
            transform: none !important;
            white-space: nowrap !important;
            line-height: 1 !important;
        }
        [data-dcuf-native-form-role="editor-html-toggle-input"][data-dcuf-native-form-state="write-editor"] {
            appearance: auto !important;
            display: inline-block !important;
            position: static !important;
            inset: auto !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            margin: 0 6px 0 0 !important;
            padding: 0 !important;
            clip: auto !important;
            clip-path: none !important;
            opacity: 1 !important;
            float: none !important;
            transform: none !important;
            pointer-events: auto !important;
            vertical-align: middle !important;
        }
        [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border-strong, #d4e0ef) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface, #fff) !important;
            box-shadow: 0 2px 6px var(--dcuf-theme-accent-shadow, rgba(25, 50, 92, 0.05)) !important;
        }
        [data-dcuf-native-form-role="editor-statusbar"][data-dcuf-native-form-state="write-editor"] {
            background: #f7faff !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] {
            position: static !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] {
            position: relative !important;
        }
        [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] {
            clear: both !important;
            float: none !important;
            transform: none !important;
            gap: 10px !important;
            margin: 12px 0 0 !important;
            padding: 10px !important;
            border: 1px solid #dbe6f3 !important;
            border-radius: 14px !important;
            background: linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%) !important;
            box-shadow: 0 4px 12px rgba(25, 50, 92, 0.06) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
            min-height: 48px !important;
            border-radius: 12px !important;
            box-shadow: 0 3px 8px rgba(25, 50, 92, 0.06) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
            border-color: #cbd8e9 !important;
            background: #fff !important;
            color: #42536d !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-primary-top, #426fe4) 0%, var(--dcuf-write-accent-strong) 100%) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
            box-shadow: 0 6px 14px var(--dcuf-theme-accent-shadow, rgba(36, 91, 218, 0.24)) !important;
        }
        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            position: fixed !important;
            inset: 50% auto auto 50% !important;
            width: min(420px, calc(100vw - 32px)) !important;
            min-width: 0 !important;
            max-width: calc(100vw - 32px) !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: calc(100dvh - 32px) !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 16px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            transform: translate(-50%, -50%) !important;
            overflow: hidden auto !important;
            z-index: 2147483646 !important;
            box-shadow: 0 20px 54px rgba(15, 28, 52, 0.28), 0 0 0 100vmax rgba(15, 23, 42, 0.28) !important;
            isolation: isolate !important;
            pointer-events: auto !important;
            animation: none !important;
            transition: none !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dcuf-write-desktop-site-mobile [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="write-editor"] {
            zoom: var(--dcuf-write-desktop-site-inverse-scale) !important;
        }
        [data-dcuf-native-form-role="popup-panel"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            position: relative !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
        }
        [data-dcuf-native-form-role="popup-heading"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            height: 52px !important;
            margin: 0 !important;
            padding: 0 56px 0 18px !important;
            border: 0 !important;
            border-radius: 15px 15px 0 0 !important;
            background: linear-gradient(135deg, var(--dcuf-write-accent) 0%, var(--dcuf-write-accent-strong) 100%) !important;
        }
        [data-dcuf-native-form-role="popup-title"][data-dcuf-native-form-state="write-editor"] {
            margin: 0 !important;
            padding: 0 !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
            font-size: 17px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
        }
        [data-dcuf-native-form-role="popup-content"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 28px 24px 24px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            text-align: center !important;
        }
        [data-dcuf-native-form-role="message"][data-dcuf-native-form-state="write-editor"] {
            margin: 0 !important;
            padding: 0 !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.5 !important;
        }
        [data-dcuf-native-form-role="popup-actions"][data-dcuf-native-form-state="write-editor"] {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 20px 0 0 !important;
            padding: 0 !important;
            gap: 10px !important;
            float: none !important;
        }
        [data-dcuf-native-form-role="popup-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="popup-cancel"],
        [data-dcuf-native-form-role="popup-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="popup-confirm"] {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 1 1 0 !important;
            width: auto !important;
            max-width: 132px !important;
            min-width: 0 !important;
            min-height: 44px !important;
            margin: 0 !important;
            padding: 0 16px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 15px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            box-shadow: none !important;
            cursor: pointer !important;
        }
        [data-dcuf-native-form-role="popup-actions"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="popup-confirm"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-primary-top, #426fe4) 0%, var(--dcuf-write-accent-strong) 100%) !important;
            color: var(--dcuf-theme-on-accent, #fff) !important;
            box-shadow: 0 6px 14px var(--dcuf-theme-accent-shadow, rgba(36, 91, 218, 0.22)) !important;
        }
        [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"] {
            box-sizing: border-box !important;
            position: absolute !important;
            inset: 0 0 auto auto !important;
            width: 52px !important;
            min-width: 52px !important;
            height: 52px !important;
            min-height: 52px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 15px 0 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            cursor: pointer !important;
        }
        [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]::before,
        [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]::after {
            content: '' !important;
            position: absolute !important;
            top: 25px !important;
            left: 15px !important;
            width: 22px !important;
            height: 1px !important;
            border: 0 !important;
            background: var(--dcuf-theme-on-accent, #fff) !important;
            transform: rotate(45deg) !important;
        }
        [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]::after {
            transform: rotate(-45deg) !important;
        }
        [data-dcuf-native-form-role="popup-close-icon"][data-dcuf-native-form-state="write-editor"] {
            display: none !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
            box-shadow: 0 22px 58px rgba(0, 0, 0, 0.48), 0 0 0 100vmax rgba(0, 0, 0, 0.52) !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="popup-cancel"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border-strong, #40526b) !important;
            background: var(--dcuf-write-surface, #233044) !important;
            color: #edf3ff !important;
        }
        @media screen and (max-width: 480px) {
            [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="write-editor"] {
                width: calc(100vw - 24px) !important;
                max-width: calc(100vw - 24px) !important;
                border-radius: 14px !important;
            }
            [data-dcuf-native-form-role="popup-heading"][data-dcuf-native-form-state="write-editor"] {
                height: 48px !important;
                padding: 0 52px 0 16px !important;
                border-radius: 13px 13px 0 0 !important;
            }
            [data-dcuf-native-form-role="popup-content"][data-dcuf-native-form-state="write-editor"] {
                padding: 24px 16px 18px !important;
            }
            [data-dcuf-native-form-role="popup-actions"][data-dcuf-native-form-state="write-editor"] {
                margin-top: 18px !important;
            }
            [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"] {
                width: 48px !important;
                min-width: 48px !important;
                height: 48px !important;
                min-height: 48px !important;
                border-radius: 0 13px 0 0 !important;
            }
            [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]::before,
            [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]::after {
                top: 23px !important;
                left: 14px !important;
                width: 20px !important;
            }
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="captcha-image-shell"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="captcha-panel"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="name-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="password-input"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="captcha-input"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"] {
            background: #273446 !important;
            color: #d2dced !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="form-select"][data-dcuf-native-form-state="write-editor"] {
            border-color: #40526b !important;
            background: #233044 !important;
            color: #edf3ff !important;
            -webkit-text-fill-color: #edf3ff !important;
            box-shadow: 0 2px 7px rgba(0, 0, 0, 0.2) !important;
            opacity: 1 !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-toolbar-content="1"] {
            color: inherit !important;
            -webkit-text-fill-color: inherit !important;
            opacity: 1 !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="headtext-option"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-option-state="available"] {
            color: #d2dced !important;
            -webkit-text-fill-color: #d2dced !important;
        }
        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"].dc-filter-dark-mode [data-dcuf-native-form-role="editor-html-toggle-input"][data-dcuf-native-form-state="write-editor"] {
            accent-color: var(--dcuf-write-accent-strong) !important;
        }
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="hidden-chrome"][data-dcuf-native-form-state="write-editor"],
        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-info"][data-dcuf-native-form-state="write-editor"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: hidden !important;
        }
        @media screen and (max-width: 480px) {
            [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"] {
                padding: 6px !important;
            }
            [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] {
                padding: 10px !important;
                border-radius: 11px !important;
            }
            [data-dcuf-native-form-role="subject-row"][data-dcuf-native-form-state="write-editor"] {
                grid-template-columns: 50px minmax(0, 1fr);
                gap: 6px;
            }
        }
        @media screen and (min-width: 900px) {
            [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"] {
                padding: 16px 24px !important;
            }
            [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] {
                padding: 18px !important;
            }
            [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
            [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] > [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"],
            [data-dcuf-native-form-role="subject-field"][data-dcuf-native-form-state="write-editor"],
            [data-dcuf-native-form-role="field-clear"][data-dcuf-native-form-state="write-editor"] {
                grid-column: 1 / -1;
            }
        }
    `,
            }),
        ]);
        const styleByKey = new Map(styles.map((style) => [style.key, style]));

        const getStyle = (key) => styleByKey.get(key) || null;

        return Object.freeze({
            VERSION,
            styles,
            getStyle,
        });
    })();
    __dcufRoot.__dcufNativeFormPresenter = __dcufNativeFormPresenter;
