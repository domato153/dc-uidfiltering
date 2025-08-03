// --- START OF FILE controls.js (Ultra-Robust Full Code) ---

// 스크립트가 이미 초기화되었는지 확인하는 플래그
// 중복 실행을 방지하여 안정성을 높입니다.
if (typeof window.linkkfExtensionInitialized === 'undefined') {
    window.linkkfExtensionInitialized = true;

    const SAVE_SLOT_COUNT = 3; // 3개의 백업 슬롯 사용
    let currentSlotIndex = 0;
    let videoId_base = null;
    let progressSaveInterval = null;

    /**
     * 비디오 요소에 모든 기능을 설정하는 핵심 함수.
     * @param {HTMLVideoElement} videoElement - 설정할 비디오 요소.
     */
    function setupVideoFeatures(videoElement) {
        try {
            // videoId는 iframe의 URL에서 고유 키를 추출하여 생성합니다.
            const urlParams = new URLSearchParams(window.location.search);
            const urlKey = urlParams.get('url');
            if (urlKey) {
                videoId_base = `linkkf-progress-${urlKey}`;
            }
        } catch (e) {
            console.error("Linkkf Extension: Failed to parse URL for videoId base.", e);
        }

        // --- 1. 이어보기 기능 (안전장치 강화) ---

        const loadProgress = () => {
            if (!videoId_base) return;

            let validSaves = [];
            // 모든 백업 슬롯을 순회하며 유효한 데이터를 찾습니다.
            for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
                const slotKey = `${videoId_base}_${i}`;
                const rawData = localStorage.getItem(slotKey);
                if (!rawData) continue;

                try {
                    const data = JSON.parse(rawData);
                    // 데이터 유효성 검증
                    // 1. 데이터 객체가 유효한가?
                    // 2. time 값이 유효한 숫자인가? (NaN, Infinity 방지)
                    // 3. duration 값이 유효한 숫자인가?
                    // 4. 저장된 시간이 영상 전체 길이보다 짧은가?
                    // 5. 1초 이상 재생된 유의미한 데이터인가?
                    if (data && typeof data.time === 'number' && isFinite(data.time) &&
                        typeof data.duration === 'number' && isFinite(data.duration) &&
                        data.time < data.duration && data.time > 1) {
                        validSaves.push(data);
                    } else {
                        // 유효하지 않은 데이터는 정리합니다.
                        localStorage.removeItem(slotKey);
                    }
                } catch (e) {
                    // JSON 파싱 실패 시, 손상된 데이터로 간주하고 해당 슬롯 삭제
                    console.warn(`Linkkf Extension: Corrupted data found in slot ${i}. Removing.`, e);
                    localStorage.removeItem(slotKey);
                }
            }

            if (validSaves.length === 0) {
                console.log("Linkkf Extension: No valid progress data found.");
                return; // 유효한 저장 데이터가 없음
            }

            // 가장 최근에 저장된(timestamp가 가장 큰) 데이터를 선택
            validSaves.sort((a, b) => b.timestamp - a.timestamp);
            const latestSave = validSaves[0];
            const timeToRestore = latestSave.time;

            console.log(`Linkkf Extension: Found valid save data. Restoring to ${timeToRestore.toFixed(2)}s.`);

            // 모바일 자동재생 정책을 준수하기 위해 'play' 이벤트 후에 시간 이동
            videoElement.addEventListener('play', () => {
                // 영상 시작 직후(2초 이내)에만 저장된 위치로 이동
                if (videoElement.currentTime < 2) {
                    setTimeout(() => {
                        videoElement.currentTime = timeToRestore;
                    }, 200); // 약간의 딜레이를 주어 안정성 확보
                }
            }, { once: true }); // 이 이벤트는 딱 한 번만 실행됨
        };

        const saveProgress = () => {
            // videoId가 있고, 영상 길이가 유효하며, 재생 중일 때만 저장
            if (videoId_base && videoElement.duration > 0 && !videoElement.paused) {
                const currentTime = videoElement.currentTime;
                const duration = videoElement.duration;

                // 영상이 거의 끝나면(마지막 15초) 모든 슬롯의 기록을 삭제
                if (currentTime > duration - 15) {
                    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
                        localStorage.removeItem(`${videoId_base}_${i}`);
                    }
                    console.log("Linkkf Extension: Video finished. All progress data cleared.");
                    return;
                }

                // 저장할 데이터 객체 생성
                const dataToSave = {
                    time: currentTime,
                    duration: duration,
                    timestamp: Date.now()
                };

                // 현재 슬롯에 데이터 저장
                const currentSlotKey = `${videoId_base}_${currentSlotIndex}`;
                localStorage.setItem(currentSlotKey, JSON.stringify(dataToSave));
                
                // 다음 저장을 위해 슬롯 인덱스를 순환
                currentSlotIndex = (currentSlotIndex + 1) % SAVE_SLOT_COUNT;
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