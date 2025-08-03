// --- START OF FILE controls.js (Robust Version) ---

// 스크립트가 이미 초기화되었는지 확인하는 플래그
// 중복 실행을 방지하여 안정성을 높입니다.
if (typeof window.linkkfExtensionInitialized === 'undefined') {
    window.linkkfExtensionInitialized = true;

    let videoId = null;
    let progressSaveInterval = null;

    /**
     * 비디오 요소에 모든 기능을 설정하는 핵심 함수.
     * @param {HTMLVideoElement} videoElement - 설정할 비디오 요소.
     */
    function setupVideoFeatures(videoElement) {
        // --- 1. 이어보기 기능 설정 ---
        try {
            // videoId는 iframe의 URL에서 고유 키를 추출하여 생성합니다.
            const urlParams = new URLSearchParams(window.location.search);
            const urlKey = urlParams.get('url');
            if (urlKey) {
                videoId = `linkkf-progress-${urlKey}`;
            }
        } catch (e) {
            console.error("Linkkf Extension: Failed to parse URL for videoId.", e);
        }

        // 저장된 재생 위치를 불러와 적용하는 함수
        const loadProgress = () => {
            if (!videoId) return;

            const savedTime = localStorage.getItem(videoId);
            // 유의미한 시간(1초 이상)이 저장되어 있을 때만 실행
            if (savedTime && parseFloat(savedTime) > 1) {
                // 모바일 자동재생 정책을 준수하기 위해 'play' 이벤트 후에 시간 이동
                videoElement.addEventListener('play', () => {
                    // 영상 시작 직후(2초 이내)에만 저장된 위치로 이동 (사용자가 수동으로 앞으로 돌렸을 때를 위함)
                    if (videoElement.currentTime < 2) {
                        setTimeout(() => {
                            videoElement.currentTime = parseFloat(savedTime);
                        }, 200); // 약간의 딜레이를 주어 안정성 확보
                    }
                }, { once: true }); // 이 이벤트는 딱 한 번만 실행됨
            }
        };

        // 현재 재생 위치를 주기적으로 저장하는 함수
        const saveProgress = () => {
            // videoId가 있고, 영상 길이가 유효하며, 재생 중일 때만 저장
            if (videoId && videoElement.duration > 0 && !videoElement.paused) {
                // 영상이 거의 끝나면(마지막 15초) 기록을 삭제하여 다음 재생 시 처음부터 시작하도록 함
                if (videoElement.currentTime > videoElement.duration - 15) {
                    localStorage.removeItem(videoId);
                } else {
                    localStorage.setItem(videoId, videoElement.currentTime.toString());
                }
            }
        };

        // --- 2. 단축키 기능 설정 ---
        window.addEventListener('keydown', (event) => {
            // 입력 필드에 포커스가 있을 때는 단축키를 비활성화
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
                return;
            }
            
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
                    videoElement.volume = Math.min(1, videoElement.volume + 0.05);
                    executed = true;
                    break;
                case 'arrowdown':
                    videoElement.volume = Math.max(0, videoElement.volume - 0.05);
                    executed = true;
                    break;
            }

            if (executed) {
                // 다른 스크립트의 이벤트 처리를 막아 충돌 방지
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        }, { capture: true });

        // --- 3. 기능 실행 ---
        loadProgress(); // 저장된 위치 불러오기 시도
        if (progressSaveInterval) clearInterval(progressSaveInterval); // 기존 인터벌이 있다면 제거
        progressSaveInterval = setInterval(saveProgress, 5000); // 5초마다 재생 위치 저장 시작
    }


    /**
     * 페이지에서 <video> 요소를 찾아 기능을 초기화하는 함수.
     * MutationObserver를 사용하여 비디오가 늦게 로드되어도 안정적으로 찾습니다.
     */
    function initialize() {
        // 이미 페이지에 비디오가 있는지 먼저 확인
        const existingVideo = document.querySelector('video');
        if (existingVideo) {
            setupVideoFeatures(existingVideo);
            return;
        }

        // 비디오가 없다면, 페이지 변화를 감지하여 비디오가 추가될 때까지 기다림
        const observer = new MutationObserver((mutations, obs) => {
            const videoElement = document.querySelector('video');
            if (videoElement) {
                // 비디오를 찾았으므로 기능 설정
                setupVideoFeatures(videoElement);
                // 목표를 달성했으니 관찰 중지 (리소스 절약)
                obs.disconnect();
            }
        });

        // DOM 전체를 대상으로 노드 추가/삭제 감시 시작
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // 안전장치: 15초 후에도 비디오를 못 찾으면 자동으로 관찰 중지
        setTimeout(() => {
            observer.disconnect();
        }, 15000);
    }

    // 문서 로딩 상태에 따라 초기화 함수 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}