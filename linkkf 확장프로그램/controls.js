// --- START OF FILE controls.js (Ctrl + Arrow Keys Feature Added) ---

if (typeof window.linkkfExtensionInitialized === 'undefined') {
    window.linkkfExtensionInitialized = true;

    // 1. 상위 창의 전역 변수를 확인하는 가장 확실한 방법
    let isVideoFrame = false;
    try {
        if (window.top?.player_aaaa?.actual_url === window.location.href) {
            isVideoFrame = true;
        }
    } catch (e) { /* Cross-origin, 무시 */ }

    // 2. 위 방법 실패 시, URL 파라미터를 확인하는 예비 방법
    const urlParams = new URLSearchParams(window.location.search);
    if (!isVideoFrame && urlParams.has('url')) {
        isVideoFrame = true;
    }

    // 비디오 프레임으로 확정된 경우에만 핵심 기능 실행
    if (isVideoFrame) {
        const SAVE_SLOT_COUNT = 3;
        let currentSlotIndex = 0;
        let videoId_base = null;
        let progressSaveInterval = null;
        let isFeatureSetupDone = false;

        function setupVideoFeatures(videoElement) {
            if (isFeatureSetupDone) return;
            isFeatureSetupDone = true;

            const urlKey = urlParams.get('url');
            if (!urlKey) return; // 고유 키 없으면 기능 전체 중단
            videoId_base = `linkkf-progress-${urlKey}`;

            const loadProgress = () => {
                if (!videoId_base) return;
                let validSaves = [];
                for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
                    const key = `${videoId_base}_${i}`;
                    const rawData = localStorage.getItem(key);
                    if (rawData) {
                        try {
                            const data = JSON.parse(rawData);
                            if (data && typeof data.time === 'number' && isFinite(data.time) && data.time > 1) {
                                validSaves.push(data);
                            }
                        } catch (e) { localStorage.removeItem(key); }
                    }
                }
                if (validSaves.length > 0) {
                    validSaves.sort((a, b) => b.timestamp - a.timestamp);
                    const timeToRestore = validSaves[0].time;
                    videoElement.addEventListener('play', () => {
                        if (videoElement.currentTime < 3) videoElement.currentTime = timeToRestore;
                    }, { once: true });
                }
            };

            const saveProgress = () => {
                if (videoId_base && videoElement.duration > 0 && !videoElement.paused) {
                    try {
                        const currentTime = videoElement.currentTime;
                        const duration = videoElement.duration;
                        if (currentTime > duration - 15) { clearProgress(); return; }
                        const dataToSave = { time: currentTime, duration: duration, timestamp: Date.now() };
                        localStorage.setItem(`${videoId_base}_${currentSlotIndex}`, JSON.stringify(dataToSave));
                        currentSlotIndex = (currentSlotIndex + 1) % SAVE_SLOT_COUNT;
                    } catch (e) {}
                }
            };

            const clearProgress = () => {
                if (!videoId_base) return;
                for (let i = 0; i < SAVE_SLOT_COUNT; i++) localStorage.removeItem(`${videoId_base}_${i}`);
                if (progressSaveInterval) clearInterval(progressSaveInterval);
            };

            window.addEventListener('keydown', (event) => {
                if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
                
                let executed = false;
                const seekAmount = event.ctrlKey ? 5 : 10; // Ctrl 키가 눌렸으면 5초, 아니면 10초

                switch (event.key.toLowerCase()) {
                    case ' ':
                        videoElement.paused ? videoElement.play() : videoElement.pause();
                        executed = true;
                        break;
                    case 'arrowleft':
                        videoElement.currentTime -= seekAmount; 
                        executed = true; 
                        break;
                    case 'arrowright':
                        videoElement.currentTime += seekAmount; 
                        executed = true; 
                        break;
                    case 'f':
                        document.querySelector('.vjs-fullscreen-control')?.click(); 
                        executed = true; 
                        break;
                    case 'arrowup':
                        videoElement.volume = Math.min(1, videoElement.volume + 0.05); 
                        executed = true; 
                        break;
                    case 'arrowdown':
                        videoElement.volume = Math.max(0, videoElement.volume - 0.05); 
                        executed = true; 
                        break;
                }
                if (executed) { 
                    event.preventDefault(); 
                    event.stopPropagation(); 
                }
            }, { capture: true });

            loadProgress();
            if (progressSaveInterval) clearInterval(progressSaveInterval);
            progressSaveInterval = setInterval(saveProgress, 5000);
            videoElement.addEventListener('ended', clearProgress);
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveProgress(); });
            window.addEventListener('pagehide', saveProgress);
        }

        function initializeVideoFinder() {
            const observer = new MutationObserver((mutations, obs) => {
                const videoElement = document.querySelector('video.vjs-tech');
                if (videoElement) {
                    setupVideoFeatures(videoElement);
                    obs.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 30000);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeVideoFinder);
        } else {
            initializeVideoFinder();
        }
    }
}