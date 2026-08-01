# DCUF mobile host-surface contracts

This compact map covers only the approved 3.5.4 correction surfaces. DCInside owns its DOM, forms, events, and native popup lifecycle. DCUF owns only its existing settings UI and the narrow style rules named below.

## Surface map

| Surface | Live root / owner | Required result | Regression gate |
| --- | --- | --- | --- |
| Filter master | Existing DCUF filter settings control | Disables filter/statistics decisions only; convenience settings remain independently effective | Master-off convenience behavior and unchanged stored setting shapes |
| Scroll restoration | Existing convenience settings/runtime | No user setting or dedicated list-position restore; stale stored `listRestore` data is ignored without a write or reset | UI absence, stale-data load, and no scroll-restore listener |
| PUMX initialization | Site-owned `#btn_pumx` and native state/handler | If enabled by the existing setting, activate at most once after both the button and native handler are ready; stop bounded retries and clean up on exit | Late button, late handler, already-active, timeout, teardown, and call-count cases |
| Non-member modify/delete | Native password form and its direct action row | Preserve form action/method/hidden fields/types/handlers; cancel left and submit right, with both fully reachable | Submit/Enter, close/reopen, order, positive bounds, and multi-point `elementFromPoint` |
| Authenticated delete | Native confirmation popup/card | Preserve original confirmation handler and lifecycle; no overlay covers the right action | One native call, close/reopen, overlay and hit-testing checks |
| Recommendation | `div.btn_recommend_box.recomuse_y.morebox` | Content-sized, centered, parent-contained, and naturally responsive; CAPTCHA and every native action remain visible and interactive | Narrow/wide geometry, CAPTCHA containment, and exact native click counts |
| Palette documentation | Existing 3.5.3 palette data and `dcuf_mobile_ui_palette` | Preserve all 14 IDs, light/dark values, and stored-value compatibility; documentation lists the same IDs | Runtime/document ID equality and login/main lookup behavior |

## Ownership and selector rules

- Preserve site-owned nodes in place. Do not wrap, clone, move, replace, or portal the affected controls.
- Scope popup CSS to the exact route/card root plus its direct action row. Never restyle every `.pop_wrap`.
- Scope recommendation CSS to `div.btn_recommend_box.recomuse_y.morebox` in the article context. Do not redefine the article/container width.
- Prefer normal flow, grid/flex, `max-inline-size`, `inline-size`, and `margin-inline:auto`. Do not use `100vw` or fixed test coordinates.
- Reuse an existing scheduler or lifecycle hook. Any PUMX retry must have a deadline, duplicate guard, and teardown path.
- `!important` is allowed only for a verified host inline/important conflict and must use the narrowest affected selector with a recorded reason.

## Required contexts

- Logged-in and logged-out states where applicable.
- Normal, minor, and mini gallery routes.
- Narrow mobile and wider desktop-site mobile layouts.
- Recommendation variants with and without CAPTCHA/extra actions.
- Popup closed, open, closed-after-use, and reopened states.

Screenshots may support review but are not approval. Structural preservation, reachability, event call counts, containment, and lifecycle cleanup are executable gates. Live-site approval remains a user step.
