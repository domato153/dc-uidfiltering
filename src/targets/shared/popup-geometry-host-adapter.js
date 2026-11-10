    const __dcufPopupGeometryHostAdapter = (() => {
        const bindings = new WeakMap();

        const connect = (target, options = {}) => {
            if (!target || typeof target.addEventListener !== 'function') {
                throw new TypeError('PopupGeometryHostAdapter.connect requires an element');
            }
            const existing = bindings.get(target);
            if (existing) return existing;

            const scope = DCUF_UI_CONTRACTS.createDisposableScope('popup-pinch-resize');
            const baseMinWidth = Number(options.minWidth) || 320;
            const baseMinHeight = Number(options.minHeight) || 260;
            const maxWidthOption = Number(options.maxWidth) || 0;
            const maxHeightOption = Number(options.maxHeight) || 0;
            let isPinching = false;
            let startDistance = 0;
            let startWidth = 0;
            let startHeight = 0;
            let startAnchorX = 0.5;
            let startAnchorY = 0.5;
            let lastMoveTs = 0;
            let lastMoveDistance = -1;
            let pointerInteraction = null;
            let pointerPoint = null;
            let pointerFrameId = 0;

            const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
            const getDistance = (first, second) => Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
            const getMidpoint = (first, second) => ({ x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 });
            const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });
            const normalizeFixedPosition = () => {
                const rect = target.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(target);
                if (computedStyle.transform && computedStyle.transform !== 'none') {
                    target.style.setProperty('transform', 'none', 'important');
                    target.style.setProperty('left', `${rect.left}px`, 'important');
                    target.style.setProperty('top', `${rect.top}px`, 'important');
                }
                target.style.setProperty('box-sizing', 'border-box', 'important');
                target.style.setProperty('width', `${rect.width}px`, 'important');
                target.style.setProperty('height', `${rect.height}px`, 'important');
                return target.getBoundingClientRect();
            };
            const isTouchInsideRect = (touch, rect, padding = 24) => (
                touch.clientX >= rect.left - padding
                && touch.clientX <= rect.right + padding
                && touch.clientY >= rect.top - padding
                && touch.clientY <= rect.bottom + padding
            );
            const canStartPinch = (touches, rect) => {
                if (!touches || touches.length < 2) return false;
                const first = touches[0];
                const second = touches[1];
                if (!isTouchInsideRect(first, rect) || !isTouchInsideRect(second, rect)) return false;
                const midpoint = getMidpoint(first, second);
                return isTouchInsideRect({ clientX: midpoint.x, clientY: midpoint.y }, rect, 48);
            };
            const startPinch = (touches) => {
                const rect = normalizeFixedPosition();
                if (!canStartPinch(touches, rect)) return;
                const distance = getDistance(touches[0], touches[1]);
                if (!distance || !Number.isFinite(distance)) return;
                isPinching = true;
                startDistance = distance;
                startWidth = rect.width;
                startHeight = rect.height;
                const midpoint = getMidpoint(touches[0], touches[1]);
                startAnchorX = rect.width > 0 ? clamp((midpoint.x - rect.left) / rect.width, 0, 1) : 0.5;
                startAnchorY = rect.height > 0 ? clamp((midpoint.y - rect.top) / rect.height, 0, 1) : 0.5;
                lastMoveTs = 0;
                lastMoveDistance = -1;
            };
            const onTouchStart = (event) => {
                if (!target.isConnected || !event.touches || event.touches.length < 2) return;
                startPinch(event.touches);
                if (!isPinching) return;
                if (event.cancelable) event.preventDefault();
                event.stopPropagation();
            };
            const onTouchMove = (event) => {
                if (!target.isConnected || !isPinching) return;
                if (!event.touches || event.touches.length < 2) {
                    isPinching = false;
                    return;
                }
                const distance = getDistance(event.touches[0], event.touches[1]);
                if (!distance || !Number.isFinite(distance)) return;
                const now = Date.now();
                if (lastMoveDistance >= 0 && Math.abs(distance - lastMoveDistance) < 0.0001 && now - lastMoveTs < 6) {
                    if (event.cancelable) event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                lastMoveDistance = distance;
                lastMoveTs = now;
                const midpoint = getMidpoint(event.touches[0], event.touches[1]);
                const viewport = viewportSize();
                const maxViewportWidth = Math.max(120, viewport.width - 8);
                const maxViewportHeight = Math.max(120, viewport.height - 8);
                const dynamicMinWidth = Math.max(120, Math.min(baseMinWidth, Math.max(120, viewport.width - 12)));
                const dynamicMinHeight = Math.max(120, Math.min(baseMinHeight, Math.max(120, viewport.height - 12)));
                const configuredMaxWidth = maxWidthOption > 0 ? Math.min(maxWidthOption, maxViewportWidth) : maxViewportWidth;
                const configuredMaxHeight = maxHeightOption > 0 ? Math.min(maxHeightOption, maxViewportHeight) : maxViewportHeight;
                const maxWidth = Math.max(dynamicMinWidth, configuredMaxWidth);
                const maxHeight = Math.max(dynamicMinHeight, configuredMaxHeight);
                const requestedScale = distance / startDistance;
                const minScale = Math.min(1, Math.max(dynamicMinWidth / startWidth, dynamicMinHeight / startHeight));
                const maxScale = Math.max(1, Math.min(maxWidth / startWidth, maxHeight / startHeight));
                const scale = clamp(requestedScale, minScale, maxScale);
                const nextWidth = startWidth * scale;
                const nextHeight = startHeight * scale;
                const gap = 4;
                const rawLeft = midpoint.x - nextWidth * startAnchorX;
                const rawTop = midpoint.y - nextHeight * startAnchorY;
                const nextLeft = clamp(rawLeft, gap, Math.max(gap, viewport.width - nextWidth - gap));
                const nextTop = clamp(rawTop, gap, Math.max(gap, viewport.height - nextHeight - gap));
                for (const [property, value] of [
                    ['min-width', dynamicMinWidth], ['min-height', dynamicMinHeight],
                    ['max-width', maxWidth], ['max-height', maxHeight],
                    ['width', nextWidth], ['height', nextHeight], ['left', nextLeft], ['top', nextTop],
                ]) target.style.setProperty(property, `${value}px`, 'important');
                if (event.cancelable) event.preventDefault();
                event.stopPropagation();
            };
            const onTouchEnd = () => { isPinching = false; };

            const pointerDragSelector = typeof options.pointerDragSelector === 'string'
                ? options.pointerDragSelector : '';
            const pointerResizeSelector = typeof options.pointerResizeSelector === 'string'
                ? options.pointerResizeSelector : '';
            const pointerInteractiveSelector = typeof options.pointerInteractiveSelector === 'string'
                ? options.pointerInteractiveSelector : 'button, input, label, a';
            const viewportGap = Number.isFinite(Number(options.viewportGap)) ? Number(options.viewportGap) : 4;
            const applyPointerGeometry = () => {
                pointerFrameId = 0;
                if (!pointerInteraction || !pointerPoint) return;
                const point = pointerPoint;
                pointerPoint = null;
                const viewport = viewportSize();
                if (pointerInteraction.mode === 'drag') {
                    const maxLeft = Math.max(viewportGap, viewport.width - pointerInteraction.width - viewportGap);
                    const maxTop = Math.max(viewportGap, viewport.height - pointerInteraction.height - viewportGap);
                    target.style.setProperty('left', `${clamp(point.x - pointerInteraction.offsetX, viewportGap, maxLeft)}px`, 'important');
                    target.style.setProperty('top', `${clamp(point.y - pointerInteraction.offsetY, viewportGap, maxTop)}px`, 'important');
                    return;
                }
                const maxWidth = Math.max(120, viewport.width - pointerInteraction.left - viewportGap);
                const maxHeight = Math.max(120, viewport.height - pointerInteraction.top - viewportGap);
                const minWidth = Math.min(baseMinWidth, maxWidth);
                const minHeight = Math.min(baseMinHeight, maxHeight);
                const nextWidth = clamp(pointerInteraction.width + point.x - pointerInteraction.startX, minWidth, maxWidth);
                const nextHeight = clamp(pointerInteraction.height + point.y - pointerInteraction.startY, minHeight, maxHeight);
                for (const [property, value] of [
                    ['min-width', minWidth], ['min-height', minHeight],
                    ['max-width', maxWidth], ['max-height', maxHeight],
                    ['width', nextWidth], ['height', nextHeight],
                ]) target.style.setProperty(property, `${value}px`, 'important');
            };
            const finishPointerInteraction = (event) => {
                if (!pointerInteraction || (event && event.pointerId !== pointerInteraction.pointerId)) return;
                if (pointerFrameId) cancelAnimationFrame(pointerFrameId);
                applyPointerGeometry();
                if (target.hasPointerCapture?.(pointerInteraction.pointerId)) target.releasePointerCapture(pointerInteraction.pointerId);
                pointerInteraction = null;
                pointerPoint = null;
                target.removeAttribute('data-dcuf-pointer-interacting');
            };
            const onPointerDown = (event) => {
                if (pointerInteraction || event.button !== 0 || event.isPrimary === false) return;
                const eventTarget = event.target instanceof Element ? event.target : null;
                if (!eventTarget) return;
                const resizeHandle = pointerResizeSelector ? eventTarget.closest(pointerResizeSelector) : null;
                const dragHandle = pointerDragSelector ? eventTarget.closest(pointerDragSelector) : null;
                if (!resizeHandle && (!dragHandle || eventTarget.closest(pointerInteractiveSelector))) return;
                const rect = normalizeFixedPosition();
                pointerInteraction = {
                    mode: resizeHandle ? 'resize' : 'drag',
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                };
                target.setAttribute('data-dcuf-pointer-interacting', 'true');
                target.setPointerCapture?.(event.pointerId);
                event.preventDefault();
            };
            const onPointerMove = (event) => {
                if (!pointerInteraction || event.pointerId !== pointerInteraction.pointerId) return;
                pointerPoint = { x: event.clientX, y: event.clientY };
                if (!pointerFrameId) pointerFrameId = requestAnimationFrame(applyPointerGeometry);
                event.preventDefault();
            };
            const keepInsideViewport = () => {
                if (!target.isConnected) return;
                const rect = normalizeFixedPosition();
                const viewport = viewportSize();
                const width = Math.min(rect.width, Math.max(120, viewport.width - (viewportGap * 2)));
                const height = Math.min(rect.height, Math.max(120, viewport.height - (viewportGap * 2)));
                target.style.setProperty('width', `${width}px`, 'important');
                target.style.setProperty('height', `${height}px`, 'important');
                target.style.setProperty('left', `${clamp(rect.left, viewportGap, Math.max(viewportGap, viewport.width - width - viewportGap))}px`, 'important');
                target.style.setProperty('top', `${clamp(rect.top, viewportGap, Math.max(viewportGap, viewport.height - height - viewportGap))}px`, 'important');
            };

            if (!target.hasAttribute('data-dcuf-role')) target.setAttribute('data-dcuf-role', 'resizable-popup');
            target.setAttribute('data-dcuf-resizable', 'true');
            target.setAttribute('data-dcuf-pinch-resize-bound', '1');
            scope.listen(target, 'touchstart', onTouchStart, { passive: false });
            scope.listen(target, 'touchmove', onTouchMove, { passive: false });
            scope.listen(target, 'touchend', onTouchEnd, { passive: true });
            scope.listen(target, 'touchcancel', onTouchEnd, { passive: true });
            if (pointerDragSelector || pointerResizeSelector) {
                target.setAttribute('data-dcuf-pointer-geometry-bound', '1');
                scope.listen(target, 'pointerdown', onPointerDown);
                scope.listen(target, 'pointermove', onPointerMove);
                scope.listen(target, 'pointerup', finishPointerInteraction);
                scope.listen(target, 'pointercancel', finishPointerInteraction);
                scope.listen(window, 'resize', keepInsideViewport, { passive: true });
                if (window.visualViewport) scope.listen(window.visualViewport, 'resize', keepInsideViewport, { passive: true });
                scope.own(() => {
                    if (pointerFrameId) cancelAnimationFrame(pointerFrameId);
                    pointerFrameId = 0;
                });
            }
            const connection = Object.freeze({
                target,
                refresh: () => target.getBoundingClientRect(),
                dispose: () => {
                    if (bindings.get(target) !== connection) return;
                    scope.dispose();
                    target.removeAttribute('data-dcuf-pinch-resize-bound');
                    target.removeAttribute('data-dcuf-pointer-geometry-bound');
                    target.removeAttribute('data-dcuf-pointer-interacting');
                    target.removeAttribute('data-dcuf-resizable');
                    bindings.delete(target);
                },
            });
            bindings.set(target, connection);
            return connection;
        };

        return DCUF_UI_CONTRACTS.createHostSurfaceAdapter({
            connect,
            refresh(target) { return bindings.get(target)?.refresh() || null; },
            mountOwnedRoot(target) { return target; },
            invokeNative(action, target, options) {
                if (action === 'connect-pinch-resize') return connect(target, options);
                if (action === 'get-binding') return bindings.get(target) || null;
                throw new Error(`Unsupported popup geometry host action: ${action}`);
            },
            dispose(target) { bindings.get(target)?.dispose(); },
        });
    })();
