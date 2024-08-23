import { extractTextWithXPath } from './utils.js';
import { sendTextToServer, removeBlurEffects } from './dark-pattern.js';
import { initializePriceHoverListeners } from './price-info.js';

// **** 테스트 **** : Postman Mock 서버 URL
const mockServerUrl = "https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io";

// 페이지가 로드되거나 갱신될 때마다 다크패턴을 자동으로 탐지
chrome.storage.local.get("darkPatternDetection", (result) => {
    if (result.darkPatternDetection) {
        const textData = extractTextWithXPath(); 
        sendTextToServer(textData, mockServerUrl); // 이스케이프된 데이터를 서버로 전송
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);
    
    if (request.action === 'detectDarkPatterns') { 
        const textData = extractTextWithXPath();
        console.log('Extracted textData:', textData);

        sendTextToServer(textData, mockServerUrl).then((data) => {
            console.log('Received data from server:', data);

            // data가 배열이고, 최소한 하나의 요소가 있는지 확인
            if (Array.isArray(data) && data.length > 0) {
                console.log('Dark patterns detected, sending success response');
                sendResponse({ status: "success" });
            } else {
                console.log('No dark patterns detected, sending failure response');
                sendResponse({ status: "failure" });
            }
        }).catch((error) => {
            console.error('Error during server request:', error);
            sendResponse({ status: "failure" });
        });

        return true; // 비동기 처리를 위해 true 반환
    }
    
    if (request.action === 'releaseDarkPatterns') { 
        console.log('Releasing dark patterns');
        removeBlurEffects();  // 블러 효과 제거
        sendResponse({ status: "success" });
    }
});

// 가격 정보 표시 초기화
initializePriceHoverListeners();