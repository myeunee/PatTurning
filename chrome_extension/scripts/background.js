// **** 테스트 **** : Postman Mock 서버 URL
const mockServerUrl = "https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io";

// 1. 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received request in background.js:', request);

    if (request.action === 'fetchDarkPatterns' || request.action === 'fetchPriceInfo') {
        fetchDataFromServer(request.action, request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error(`Error fetching data from server for action ${request.action}:`, error);
                sendResponse({ status: 'error', message: error.message });
            });
    } 
    
    else {
        console.log('Unknown action:', request.action);
        sendResponse({ status: 'error', message: 'Unknown action' });
    }

    return true; // 비동기 응답을 사용하기 위해 true를 반환
});

// 2. 서버에서 비동기로 데이터 가져오기
async function fetchDataFromServer(action, payload) {
    let url, options;
    if (action === "fetchDarkPatterns") {
        url = `https://52.78.128.233/dark-patterns`;
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    } 
    
    else if (action === "fetchPriceInfo") {
        const { platform, categoryName, productId } = payload;
        const encodedCategoryName = encodeURIComponent(categoryName);
        url = `${mockServerUrl}/price-info/${platform}/${encodedCategoryName}/${productId}`;
        options = { method: 'GET' };
    } 
    
    else {
        throw new Error('Unknown action type');
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error('Failed to fetch data from server');
    return await response.json();
}

// 3. 페이지 로딩이 될 때마다 메시지를 보내 다크패턴 탐지 및 가격 정보 요청
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        if (tab.url.includes('homeplus.co.kr')) {
            // 다크 패턴 탐지와 가격 정보 업데이트 메시지 전송
            chrome.tabs.sendMessage(tabId, { action: "detectDarkPatterns" });
            chrome.tabs.sendMessage(tabId, { action: "fetchNewPriceInfo" });
        }
    }
});
