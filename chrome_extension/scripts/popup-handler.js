function sendMessage(action, successMessage, failureMessage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error('No active tabs found');
            updateStatus("활성 탭을 찾을 수 없습니다.");
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError.message);
                updateStatus("다크 패턴이 감지되었습니다.");              
                return;
            }

            console.log('Received response:', response);

            if (response) {
                if (response.status === "success") {
                    updateStatus(successMessage);
                } else {
                    updateStatus(failureMessage);
                }
            } else {
                updateStatus("다크 패턴이 감지되었습니다.");   
            }
        });
    });
}


function updateStatus(message) {
    const statusElement = document.getElementById('status3');
    if (statusElement) {
        statusElement.innerText = message;
    } else {
        console.error("[팝업핸들러] Status element not found in the DOM.");
    }
}



const switchElement = document.getElementById('switch');

switchElement.addEventListener('change', (event) => {
    if (event.target.checked) {
        // detectDarkPatterns 활성화
        chrome.storage.local.set({ darkPatternDetection: true }, () => {
            sendMessage("detectDarkPatterns", "다크 패턴이 감지되었습니다.", "다크 패턴이 감지되지 않았습니다.");
        });
    } else {
        // releaseDarkPatterns 활성화
        chrome.storage.local.set({ darkPatternDetection: false }, () => {
            sendMessage("releaseDarkPatterns", "다크 패턴이 해제되었습니다.", "다크 패턴을 해제할 수 없습니다.");
        });
    }
});