function sendMessage(action, successMessage, failureMessage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
            if (response) {
                if (response.status === successMessage) {
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

document.getElementById('detect-button').addEventListener('click', () => {
    sendMessage("detectDarkPatterns", "다크 패턴이 감지되었습니다.", "다크 패턴이 감지되지 않았습니다.");
});

document.getElementById('release-button').addEventListener('click', () => {
    sendMessage("releaseDarkPatterns", "다크 패턴이 해제되었습니다.", "다크 패턴을 해제할 수 없습니다.");
});
