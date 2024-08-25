// **** 테스트 **** : Postman Mock 서버 URL
const mockServerUrl = "https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io";

// 1. 메시지 리스너 2개
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received request in background.js:', request);

    if (request.action === 'fetchDarkPatterns') {
        fetchDataFromServer('fetchDarkPatterns', request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error('Error fetching data from server:', error);
                sendResponse({ status: 'error', message: error.message });
            });
    } 

    else if (request.action === 'fetchPriceInfo') {
        fetchDataFromServer('fetchPriceInfo', request.payload)
            .then(data => sendResponse({ status: 'success', data }))
            .catch(error => {
                console.error('Error fetching data from server:', error);
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
    let url;
    let options;

    if (action === "fetchDarkPatterns") {
        url = `${mockServerUrl}/dark-patterns`;
        options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };
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

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error('Failed to fetch data from server');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data from server:", error);
        throw error;
    }
}
