# Next bounded task

Introduce the internal UI boundary without moving visible owners yet:

1. Submit a candidate registry overlay for `UiPort`, immutable `UiSnapshot`, typed `UiIntent`, `CommandResult`, `UiSurface`, `DisposableScope`, and `HostSurfacePort`.
2. Add the application-owned store and legacy adapter while keeping the current renderers and host nodes unchanged.
3. Prove that state notifications occur only after committed semantic state changes and never from the filter hot path.
4. Add lifecycle tests for subscribe/unsubscribe and scope disposal, plus a control=candidate rejection in the differential oracle.
5. Promote the overlay only after mobile and PC semantic receipts remain equal except for the declared boot-lock repair.

Do not begin visual redesign or move a surface owner in this step.
