const mockServerUrl = "https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io";
const darkUrl = "http://52.78.128.233/dark-patterns";
const priceUrl = "http://54.174.27.101:8090";

// 1. 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received request in background.js:', request);

    if (request.action === 'fetchDarkPatterns') {
        fetchDataFromServer(request.action, request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error(`[백그라운드 - 다크패턴] Error fetching data from server for action ${request.action}:`, error);
                sendResponse({ status: 'error', message: error.message });
            });
    } 

    else if (request.action === 'fetchPriceInfo') {

        fetchDataFromServer(request.action, request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error(`[백그라운드 - 가격 불러오기] Error fetching data from server for action ${request.action}:`, error);
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
// action에 따라 해당 서버로 요청
async function fetchDataFromServer(action, payload) {
    let url, options;
    if (action === "fetchDarkPatterns") {
        url = darkUrl;
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    } 
    
    else if (action === "fetchPriceInfo") {
        const { platform, productId, categoryName } = payload;
        url = `${priceUrl}/price-info/${platform}/${productId}/${categoryName}`;
        console.log('[백그라운드] priceUrl: ', url);
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
