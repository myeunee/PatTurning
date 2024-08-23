function sendMessage(action, successMessage, failureMessage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError.message);
                document.getElementById('status').innerText = "응답을 받을 수 없습니다.";
                return;
            }            
            
            console.log('Received response:', response);

            if (response) {
                if (response.status === "success") {
                    document.getElementById('status').innerText = successMessage;
                } else {
                    document.getElementById('status').innerText = failureMessage;
                }
            } else {
                document.getElementById('status').innerText = "응답을 받을 수 없습니다.";
            }
        });
    });
}


// 페이지가 갱신될 때마다 자동으로 요청함.
// 'ON' 버튼 클릭
document.getElementById('detect-button').addEventListener('click', () => {
    // darkPatternDetection을 true로 설정 = 감지 기능 활성화
    chrome.storage.local.set({ darkPatternDetection: true }, () => {
        // detectDarkPatterns 작업 실행 후 처리 결과에 따라 표시되는 문구
        sendMessage("detectDarkPatterns", "다크 패턴이 감지되었습니다.", "다크 패턴이 감지되지 않았습니다.");
    });
});

// 'OFF' 버튼 클릭
document.getElementById('release-button').addEventListener('click', () => {
    chrome.storage.local.set({ darkPatternDetection: false }, () => {
        sendMessage("releaseDarkPatterns", "다크 패턴이 해제되었습니다.", "다크 패턴을 해제할 수 없습니다.");
    });
});
