const darkUrl = "YOUR_DARK_PATTERN_API";
const priceUrl = "YOUR_PRICE_API";


// 1. 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[백그라운드] Received request: ', request);
    console.log('[백그라운드] Received request.action: ', request.action);
    console.log('[백그라운드] Received request.payload: ', request.payload);

    if (request.action === 'fetchDarkPatterns') {
        fetchDataFromServer(request.action, request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error(`[백그라운드 - 다크패턴] Error fetching data from server for action ${request.action}:`, error);
                sendResponse({ status: 'error', message: error.message });
            });
    } 

    else if (request.action === 'fetchPriceInfo') {

        console.log('[백그라운드 - 가격 불러오기] request.payload: ', request.payload);

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
    let requests = [];

    if (action === "fetchDarkPatterns") {
        const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
        requests.push(fetch(darkUrl, options).then(res => res.json()));
    } 
    
    if (action === "fetchPriceInfo") {
        const { platform, productId, categoryName } = payload;

        let url;
        if (platform === 'Posty') {
            url = `${priceUrl}/price-info/${platform}/${productId}`;
        } else {
            url = `${priceUrl}/price-info/${platform}/${productId}/${categoryName}`;
        }

        const options = { method: 'GET' };
        console.log('[fetchDataFromServer 백그라운드] priceUrl: ', url);
        requests.push(fetch(url, options).then(res => {
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
            }
            return res.json();
        }));
    } 

    if (requests.length === 0) {
        throw new Error('Unknown action type');
    }

    try {
        const results = await Promise.all(requests);
        return results;
    } catch (error) {
        throw new Error('[fetchDataFromServer] Failed to fetch data from server');
    }
}


// 3. 페이지 로딩이 될 때마다 메시지를 보내 다크패턴 탐지 및 가격 정보 요청
// 페이지 로딩이 될 때마다 메시지를 보내 다크패턴 탐지 및 가격 정보 요청
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        // homeplus, Gmarket, Posty 등 여러 도메인에서 메시지 전송
        if (tab.url.includes('homeplus.co.kr') || tab.url.includes('gmarket.co.kr') || tab.url.includes('posty.kr')) {
            chrome.storage.local.get("darkPatternDetection", (result) => {
                if (result.darkPatternDetection) {
                    // 다크 패턴 탐지 활성화
                    chrome.tabs.sendMessage(tabId, { action: "detectDarkPatterns" });
                } else {
                    // 다크 패턴 해제
                    chrome.tabs.sendMessage(tabId, { action: "releaseDarkPatterns" });
                }
            });
            
            // 가격 정보 업데이트 메시지 전송
            chrome.tabs.sendMessage(tabId, { action: "fetchNewPriceInfo" });
        }
    }
});
