// 이 스크립트는 모든 iframe에서 실행되지만,
// video 태그나 vjs- 버튼이 있는 linkkf 플레이어에서만 실질적으로 동작합니다.

let videoId = null;
let progressSaveInterval = null;

// --- 기능 설정 함수 ---
function setupFeatures() {
    const videoElement = document.querySelector('video');
    // 비디오 요소를 찾지 못하면 아무것도 하지 않고 종료
    if (!videoElement) {
        return;
    }

    // --- 이어보기 기능 ---
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlKey = urlParams.get('url');
        if (urlKey) {
            videoId = `linkkf-progress-${urlKey}`;
        }
    } catch (e) {}

    const saveProgress = () => {
        if (videoId && videoElement.duration > 0 && !videoElement.paused) {
            if (videoElement.currentTime > videoElement.duration - 15) {
                localStorage.removeItem(videoId);
            } else {
                localStorage.setItem(videoId, videoElement.currentTime);
            }
        }
    };

    const setupLoadProgress = () => {
        if (!videoId) return;
        const savedTime = localStorage.getItem(videoId);
        if (savedTime && parseFloat(savedTime) > 1) {
            videoElement.addEventListener('play', () => {
                if (videoElement.currentTime < 2) {
                    setTimeout(() => {
                        videoElement.currentTime = parseFloat(savedTime);
                    }, 200);
                }
            }, { once: true });
        }
    };

    // --- 단축키 기능 ---
    window.addEventListener('keydown', (event) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
        
        let executed = false;
        switch (event.key.toLowerCase()) {
            case ' ':
                const playButton = document.querySelector('.vjs-play-control.vjs-playing, .vjs-play-control.vjs-paused');
                if (playButton) { playButton.click(); executed = true; }
                break;
            case 'arrowleft':
                const backButton = document.querySelector('.vjs-seek-button.skip-back.skip-10');
                if (backButton) { backButton.click(); executed = true; }
                break;
            case 'arrowright':
                const forwardButton = document.querySelector('.vjs-seek-button.skip-forward.skip-10');
                if (forwardButton) { forwardButton.click(); executed = true; }
                break;
            case 'f':
                const fullscreenButton = document.querySelector('.vjs-fullscreen-control');
                if (fullscreenButton) { fullscreenButton.click(); executed = true; }
                break;
            case 'arrowup':
                if (videoElement) { videoElement.volume = Math.min(1, videoElement.volume + 0.05); executed = true; }
                break;
            case 'arrowdown':
                if (videoElement) { videoElement.volume = Math.max(0, videoElement.volume - 0.05); executed = true; }
                break;
        }
        if (executed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
    }, { capture: true });

    // --- 기능 실행 ---
    setupLoadProgress();
    if (progressSaveInterval) clearInterval(progressSaveInterval);
    progressSaveInterval = setInterval(saveProgress, 5000); // 5초마다 저장
}

// 스크립트가 너무 빨리 실행되어 video 요소를 놓치는 것을 방지하기 위해,
// DOM이 어느정도 안정화된 후에 기능을 설정하도록 시도합니다.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFeatures);
} else {
    // 이미 로드된 경우
    setupFeatures();
}