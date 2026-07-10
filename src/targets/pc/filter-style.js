    GM_addStyle(`
        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
            position: absolute;
        }
        .switch-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: #c7cfdb;
            transition: .2s;
            border-radius: 999px;
        }
        .switch-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: #fff;
            transition: .2s;
            border-radius: 50%;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
        }
        .switch input:checked + .switch-slider {
            background-color: #3b71fd;
        }
        .switch input:checked + .switch-slider:before {
            transform: translateX(18px);
        }

        #dcinside-filter-setting,
        #dcinside-shortcut-modal {
            font-family: "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important;
        }
        #dcinside-filter-setting {
            min-width: 420px !important;
            max-width: min(92vw, 760px) !important;
            max-height: 92vh !important;
            overflow: hidden !important;
            border-color: #273142 !important;
            box-shadow: 0 20px 48px rgba(17, 24, 39, 0.24) !important;
        }
        #dcinside-filter-setting .dcuf-settings-header {
            cursor: move;
        }
        #dcinside-filter-setting .dcuf-settings-body {
            max-height: calc(92vh - 158px) !important;
            overflow-y: auto !important;
            padding-right: 4px !important;
        }
        #dcinside-filter-setting .dcuf-settings-section {
            background: #fbfcfe;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px;
        }
        #dcinside-filter-setting .dcuf-settings-guest-controls {
            background: #fff;
            border: 1px solid #d9e0ea;
            border-radius: 8px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
        }
        #dcinside-filter-setting #dcinside-threshold-input,
        #dcinside-filter-setting #dcinside-ratio-min,
        #dcinside-filter-setting #dcinside-ratio-max {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            box-sizing: border-box !important;
        }
        #dcinside-filter-setting #dcinside-threshold-save {
            min-width: 110px;
            font-weight: 700;
        }
        #dcinside-filter-setting.dcuf-pop-leave {
            opacity: 0 !important;
            transform: translate(-50%, -48%) scale(0.985) !important;
            transition: opacity 0.13s ease, transform 0.13s ease !important;
            pointer-events: none !important;
        }

        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dcinside-shortcut-modal {
            background: #232a34 !important;
            color: #e8edf7 !important;
            border-color: #4b5b74 !important;
            box-shadow: 0 24px 58px rgba(0, 0, 0, 0.44) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-section {
            background: #2c3440 !important;
            border-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls {
            background: #26303c !important;
            border-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting div,
        body.dc-filter-dark-mode #dcinside-filter-setting label,
        body.dc-filter-dark-mode #dcinside-filter-setting h3,
        body.dc-filter-dark-mode #dcinside-filter-setting b,
        body.dc-filter-dark-mode #dcinside-filter-setting a,
        body.dc-filter-dark-mode #dcinside-shortcut-modal h4,
        body.dc-filter-dark-mode #dcinside-shortcut-modal div {
            color: #e8edf7 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-threshold-input,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-min,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-max,
        body.dc-filter-dark-mode #dcinside-shortcut-modal #dcinside-new-shortcut-preview {
            background: #1d2430 !important;
            color: #eef3ff !important;
            border-color: #51617d !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group {
            background: #1d2430 !important;
            border-color: #51617d !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting button,
        body.dc-filter-dark-mode #dcinside-shortcut-modal button {
            border-color: #5f6f89 !important;
        }

        @media (max-width: 760px) {
            #dcinside-filter-setting {
                min-width: auto !important;
                width: min(96vw, 760px) !important;
            }
            #dcinside-filter-setting .dcuf-settings-threshold {
                flex-direction: column !important;
                align-items: stretch !important;
            }
            #dcinside-filter-setting #dcinside-ratio-section > div:first-child {
                flex-direction: column !important;
            }
        }

        #dc-personal-block-fab {
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 2147483640;
            min-width: 84px !important;
            height: 42px !important;
            padding: 0 14px !important;
            border-radius: 999px !important;
            background: linear-gradient(180deg, #fbfcfe 0%, #f1f4f8 100%) !important;
            color: #4d5e76 !important;
            border: 1px solid #c7d2df !important;
            box-shadow: 0 10px 24px rgba(43, 61, 96, 0.14) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
            line-height: 1 !important;
            white-space: nowrap !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background-color 0.18s ease-out !important;
        }
        #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #ffffff 0%, #eef2f7 100%) !important;
            border-color: #b6c2d1 !important;
            box-shadow: 0 8px 18px rgba(36, 49, 72, 0.14) !important;
        }
        #dc-personal-block-fab:active {
            transform: scale(0.97) !important;
            cursor: grabbing !important;
        }

        #dc-selection-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483641 !important;
            background: #fff !important;
            border: 1px solid #d7deea !important;
            border-radius: 12px !important;
            padding: 20px !important;
            box-shadow: 0 14px 36px rgba(36, 49, 72, 0.18) !important;
            min-width: 360px !important;
            max-width: min(92vw, 520px) !important;
            text-align: center !important;
        }
        #dc-selection-popup h4 {
            margin: 0 0 20px 0 !important;
            font-size: 18px !important;
            font-weight: 600 !important;
        }
        #dc-selection-popup .block-options {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            margin-bottom: 20px !important;
        }
        #dc-selection-popup .block-option {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background-color: #f8fbff !important;
            border: 1px solid #e4e9f3 !important;
            padding: 12px !important;
            border-radius: 9px !important;
            gap: 12px !important;
        }
        #dc-selection-popup .block-option span {
            font-size: 15px !important;
            color: #333 !important;
            word-break: break-all !important;
            margin-right: 15px !important;
            text-align: left !important;
        }
        #dc-selection-popup .block-option button {
            font-size: 14px !important;
            padding: 6px 12px !important;
            cursor: pointer !important;
            border: none !important;
            border-radius: 6px !important;
            background-color: #4263eb !important;
            color: #fff !important;
            font-weight: 500 !important;
        }
        #dc-selection-popup .block-option button.btn-unblock {
            background-color: #e03131 !important;
        }
        #dc-selection-popup .popup-buttons button {
            width: 100% !important;
            font-size: 16px !important;
            padding: 10px !important;
            cursor: pointer !important;
            border: none !important;
            border-radius: 8px !important;
            background-color: #e9ecef !important;
            color: #555 !important;
        }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            cursor: pointer !important;
            outline: 2px dashed #4263eb !important;
        }

        #dc-block-management-panel-overlay,
        #dc-backup-popup-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.55) !important;
            z-index: 2147483645 !important;
            backdrop-filter: blur(2px) !important;
        }
        #dc-block-management-panel,
        #dc-backup-popup {
            touch-action: pan-x pan-y !important;
        }
        #dc-block-management-panel {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: #fff !important;
            border: 1px solid #d9e1ef !important;
            border-radius: 18px !important;
            box-shadow: 0 18px 44px rgba(34, 51, 84, 0.18) !important;
            z-index: 2147483646 !important;
            display: flex !important;
            flex-direction: column !important;
            width: 400px !important;
            height: 500px !important;
            min-width: 350px !important;
            min-height: 300px !important;
            resize: both !important;
            overflow: hidden !important;
        }
        #dc-block-management-panel .panel-header {
            display: flex !important;
            align-items: center !important;
            padding: 16px 18px 14px !important;
            background: #fff !important;
            border-bottom: 1px solid #e6ebf4 !important;
            cursor: move !important;
            user-select: none !important;
        }
        #dc-block-management-panel .panel-header h3 {
            margin: 0 !important;
            font-size: 16px !important;
        }
        #dc-block-management-panel .panel-close-btn {
            font-size: 20px !important;
            cursor: pointer !important;
            border: none !important;
            background: none !important;
            margin-left: auto !important;
        }
        #dc-block-management-panel .panel-tabs {
            display: flex !important;
            background: #fff !important;
            border-bottom: 1px solid #e6ebf4 !important;
        }
        #dc-block-management-panel .panel-tab {
            flex: 1 !important;
            padding: 14px 8px !important;
            text-align: center !important;
            cursor: pointer !important;
            border-right: 1px solid #e6ebf4 !important;
            background: #fff !important;
            color: #4b5563 !important;
            font-weight: 600 !important;
            position: relative !important;
        }
        #dc-block-management-panel .panel-tab:last-child {
            border-right: none !important;
        }
        #dc-block-management-panel .panel-tab.active {
            color: #1d4ed8 !important;
            font-weight: 700 !important;
        }
        #dc-block-management-panel .panel-tab.active::after {
            content: '' !important;
            position: absolute !important;
            left: 16px !important;
            right: 16px !important;
            bottom: 8px !important;
            height: 2px !important;
            border-radius: 999px !important;
            background: #3b71fd !important;
        }
        #dc-block-management-panel .panel-body {
            flex-grow: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            background: #fff !important;
            padding: 0 12px 12px !important;
        }
        #dc-block-management-panel .panel-list-controls {
            padding: 10px 0 12px !important;
            text-align: left !important;
            background: transparent !important;
        }
        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn {
            min-height: 36px !important;
            font-size: 13px !important;
            padding: 4px 10px !important;
            cursor: pointer !important;
            border: 1px solid #d4dbe8 !important;
            background: #fff !important;
            border-radius: 8px !important;
            margin-left: 5px !important;
            color: #374151 !important;
            font-weight: 600 !important;
            transition: background-color 0.14s ease, border-color 0.14s ease !important;
        }
        #dc-block-management-panel .select-all-btn:hover,
        #dc-block-management-panel .select-all-global-btn:hover,
        #dc-block-management-panel .panel-backup-btn:hover {
            background: #f6f9ff !important;
            border-color: #b8c8ea !important;
        }
        #dc-block-management-panel .panel-content {
            flex-grow: 1 !important;
            overflow-y: auto !important;
            border: 1px solid #e6ebf4 !important;
            border-radius: 14px !important;
            background: #fff !important;
        }
        #dc-block-management-panel .blocked-list {
            list-style: none !important;
            margin: 0 !important;
            padding: 6px 12px 12px !important;
        }
        #dc-block-management-panel .blocked-item {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            min-height: 52px !important;
            padding: 12px 8px !important;
            border-bottom: 1px solid #eef2f7 !important;
            transition: background-color 0.14s ease, opacity 0.14s ease !important;
            background: #fff !important;
        }
        #dc-block-management-panel .blocked-item:hover {
            background: #f6f9ff !important;
        }
        #dc-block-management-panel .blocked-item.item-to-delete {
            text-decoration: line-through !important;
            opacity: 0.5 !important;
        }
        #dc-block-management-panel .item-name {
            font-size: 14px !important;
            word-break: break-all !important;
        }
        #dc-block-management-panel .delete-item-btn {
            cursor: pointer !important;
            color: #e03131 !important;
            font-weight: bold !important;
            padding: 0 5px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 24px !important;
            height: 24px !important;
            border-radius: 999px !important;
            background: #fff0f2 !important;
        }
        #dc-block-management-panel .panel-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 14px !important;
            border-top: 1px solid #e6ebf4 !important;
            background: #fff !important;
        }
        #dc-block-management-panel .panel-footer-left {
            display: flex !important;
            align-items: center !important;
        }
        #dc-block-management-panel .panel-save-btn {
            min-height: 38px !important;
            padding: 0 18px !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            background: #3b71fd !important;
            color: #fff !important;
            border: none !important;
            border-radius: 9px !important;
            cursor: pointer !important;
            box-shadow: 0 6px 16px rgba(59, 113, 253, 0.24) !important;
        }
        #dc-block-management-panel .panel-resize-handle {
            position: absolute !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 15px !important;
            height: 15px !important;
            cursor: nwse-resize !important;
        }

        #dc-backup-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: #fff !important;
            border: 1px solid #d9e1ef !important;
            border-radius: 18px !important;
            box-shadow: 0 18px 44px rgba(34, 51, 84, 0.18) !important;
            z-index: 2147483647 !important;
            padding: 18px !important;
            min-width: 420px !important;
            min-height: 320px !important;
            width: min(92vw, 520px) !important;
            overflow: hidden !important;
            resize: both !important;
        }
        #dc-backup-popup .popup-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-bottom: 16px !important;
            padding: 0 4px 12px !important;
            border-bottom: 1px solid #e6ebf4 !important;
            background: #fff !important;
        }
        #dc-backup-popup .popup-header h4 {
            margin: 0 !important;
            font-size: 16px !important;
        }
        #dc-backup-popup .popup-close-btn {
            font-size: 20px !important;
            background: none !important;
            border: none !important;
            cursor: pointer !important;
            color: #888 !important;
        }
        #dc-backup-popup .popup-content {
            display: flex !important;
            flex-direction: column !important;
            gap: 22px !important;
            max-height: calc(92vh - 96px) !important;
            overflow-y: auto !important;
            padding-right: 2px !important;
        }
        #dc-backup-popup label {
            font-size: 14px !important;
            font-weight: bold !important;
        }
        #dc-backup-popup .description {
            font-size: 12px !important;
            color: #6b7280 !important;
            line-height: 1.5 !important;
        }
        #dc-backup-popup .import-controls {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
        }
        #dc-backup-popup .import-file-input,
        #dc-backup-popup textarea {
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 8px !important;
            border: 1px solid #d2dae8 !important;
            border-radius: 8px !important;
            background: #fff !important;
            color: #333 !important;
        }
        #dc-backup-popup textarea {
            height: 100px !important;
            resize: vertical !important;
            font-size: 12px !important;
            font-family: Consolas, "Courier New", monospace !important;
        }
        #dc-backup-popup button {
            padding: 8px 12px !important;
            border: none !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-weight: 700 !important;
        }
        #dc-backup-popup .export-btn {
            background-color: #3b71fd !important;
            color: #fff !important;
            border: 1px solid #3b71fd !important;
            flex: 1 !important;
        }
        #dc-backup-popup .export-btn-download {
            background: #eef4ff !important;
            border: 1px solid #c8d8ff !important;
            color: #315fc2 !important;
        }
        #dc-backup-popup .import-btn {
            background-color: #3b71fd !important;
            color: #fff !important;
            border: 1px solid #3b71fd !important;
            width: 100% !important;
            margin-top: 8px !important;
        }

        @keyframes dcuf-popup-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes dcuf-overlay-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        #dc-selection-popup.dcuf-pop-leave,
        #dc-backup-popup.dcuf-pop-leave,
        #dc-block-management-panel.dcuf-pop-leave {
            animation: dcuf-popup-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }
        #dc-block-management-panel-overlay.dcuf-overlay-leave,
        #dc-backup-popup-overlay.dcuf-overlay-leave {
            animation: dcuf-overlay-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }

        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg, #313948 0%, #242b36 100%) !important;
            color: #e6eefc !important;
            border-color: #50617d !important;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32) !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
            border-color: #555 !important;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.7) !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup .block-option,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-content,
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item {
            background: #252b36 !important;
            border-color: #46506a !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup h4,
        body.dc-filter-dark-mode #dc-selection-popup .block-option span,
        body.dc-filter-dark-mode #dc-backup-popup .description,
        body.dc-filter-dark-mode #dc-backup-popup h4,
        body.dc-filter-dark-mode #dc-block-management-panel .item-name {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header {
            background: transparent !important;
            border-color: #4a556b !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            background: transparent !important;
            border-right-color: #46506a !important;
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            color: #8db2ff !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-global-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-backup-btn {
            background-color: #555 !important;
            color: #fff !important;
            border-color: #777 !important;
        }
        body.dc-filter-dark-mode #dc-backup-popup .export-btn-download {
            background: #2d3950 !important;
            border-color: #4b5f83 !important;
            color: #dbe6ff !important;
        }
        body.dc-filter-dark-mode #dc-backup-popup .import-file-input,
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background: #252b36 !important;
            border-color: #47556f !important;
            color: #eef3ff !important;
        }
    `);
