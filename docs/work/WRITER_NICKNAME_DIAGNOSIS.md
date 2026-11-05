# Writer nickname overlap —2026-11-05

User interrupts official publication for diagnosis first. No production fix or release publication in this investigation. Source HEAD1f3b435;Mobile3.5.6 runtime SHA9EEDA68520CD5A39C734E2F7D269E045D838437BA651D382669DA41CD891EF34.

Actual public minor writer,GET/HEAD-only source injection,Chrome156.0.8078.80,layout980×2306/screen412×1006/touch proxy reproduces the defect. No submission,credentials or stored user settings used. This is not physical-device/installed-extension proof.

- Existing desktop-site form scaling shrinks its local usable width while the viewport min-width900 media rule still selects four equal identity columns.
- Nickname parent is84 local CSS px;the input reserves12px left plus108px right padding unconditionally. Border-box minimum becomes122px and measured text room is0. Input rendered width289.42px exceeds parent198.81px and enters the password region. The recommended nickname value exists;its text is squeezed out rather than absent from data.
- Clearing the recommended nickname retains the same cramped direct input. Native94px use-nickname button also exceeds the84px wrapper.
- Isolated browser-only two-column counterfactual gives each wrapper416.66 rendered px;direct input width matches wrapper and the use button fits. This confirms the width/scaling mismatch,not a missing nickname or submit/network failure. Production CSS was not changed by the probe.

Fixed on user request:the existing scaled-phone mode keeps the base two identity columns instead of applying the wide-desktop four-column override. Readonly recommended input reserves44px for the clear control;editable input retains108px for the use control. No owner,handler,form value,submission or PC changes. Added real screen412/layout980/touch scaling and positive text-room/containment checks in both themes. Old artifact fails with0px text room;final artifact passes. Existing writer composition/native transitions and14-palette checks also pass:3 selected tests,0 failures. Release verification passes. Final Mobile3.5.6 SHAFCBFB8A0B6D580A3493B791CFA717B6AA88A5F79D8694FC6CBBE493538C6AD55.

Actual public writer GET/HEAD-only final check:two columns,nickname parent/input both175 local px,117px text room;rendered input/parent both416.66px and password in its separate column. Recommended/direct native transition observed. No detailed comparison gallery per user.

Root/dist Mobile3.5.6 are rebuilt. Previous release bundle/checksums/draft asset and writer examples are stale and must refresh before resuming official publication. No external release mutation in this fix. PC remains unchanged.

User requests artifacts cleanup after work finishes. Keep current authoritative screenshots,receipts and needed release/reproduction bytes until completion;then inventory/delete redundant local artifacts with path containment and recovery checks. No cleanup during this diagnosis;never include user-owned debug.log or credentials.
