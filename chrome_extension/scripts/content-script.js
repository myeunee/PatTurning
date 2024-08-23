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
    console.log('Received message in content-script.js:', request.action);
    
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
    } else {
        console.log('Unknown action:', request.action);
        sendResponse({status: "unknown_action"});
    }
});

// 가격 정보 표시 초기화
initializePriceHoverListeners();



///////////// 다크패턴 함수 ////////////////
// 다크패턴 탐지 요청
async function sendTextToServer(textData, mockServerUrl) {
    try {
        const response = await fetch(`${mockServerUrl}/dark-patterns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(textData)
        });

        if (!response.ok) {
            const errorData = await response.json(); // 오류메시지를 가져옴
            throw new Error(`Network response was not ok: ${errorData.message}`);
        }

        const data = await response.json();
        console.log('Success:', data);

        displayDarkPatterns(data); // 데이터를 받은 후, 블러 처리 함수 호출
        return data; 
    } catch (error) {
        console.error('Error:', error);
        return null; // 오류 발생시 null 반환
    }
}

// 다크패턴 결과 표시
// data(다크패턴에 대한 정보)를 통해 다크패턴을 블러 처리
function displayDarkPatterns(data) {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'dark-pattern-results';
    console.log('Displaying dark patterns:', data); 

    data.forEach(pattern => {
        const patternElement = document.createElement('div');
        patternElement.innerText = `다크 패턴: ${pattern.text} (XPath: ${pattern.xpath})`;
        resultsContainer.appendChild(patternElement);
        console.log('Blurring element with XPath:', pattern.xpath);
        blurElement(pattern.xpath); // 블러 처리
    });

    document.body.appendChild(resultsContainer);
}

// 다크패턴 블러 처리
function blurElement(xpath) {
    const unescapedXpath = unescapeXPath(xpath); // 이스케이프된 xpath복원 후, evaluate 함수로 전달
    console.log('Evaluating XPath:', unescapedXpath);

    const element = document.evaluate(unescapedXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        console.log('Element found, applying blur:', element);
        element.style.filter = "blur(4px)";
    } else {
        console.log('Element not found for XPath:', unescapedXpath);
    }
}

// 블러 효과 제거 함수
function removeBlurEffects() {
    const elements = document.querySelectorAll('[style*="blur"]');
    elements.forEach(element => {
        element.style.filter = '';
    });
}


//////////// 공통 함수 //////////////

// Xpath를 추출할 때, 더블 쿼트를 이스케이프 처리해 JSON 문자열로 전송될 때 문제가 없도록 하기
// 문자열의 더블 쿼트를 이스케이프(\") 처리
function escapeXPath(xpath) {
    return xpath.replace(/\"/g, '\\"');
}

// 서버 응답으로 받은 xpath를 다시 원래 형태로 복원 후, 브라우저의 evaluate 함수로 전달
function unescapeXPath(escapedXpath) {
    return escapedXpath.replace(/\\"/g, '"');
}

// 주어진 요소의 XPath를 생성하는 함수
function getElementXPath(element) {
    if (!(element instanceof Element)) return null;

    const paths = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
        let index = 1;

        for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                index++;
            }
        }
        const tagName = element.tagName.toLowerCase();
        const pathIndex = (index > 1 ? `[${index}]` : '');
        paths.unshift(`${tagName}${pathIndex}`);
    }
    return paths.length ? `/${paths.join('/')}` : null;
}

// 페이지에서 텍스트와 XPath를 추출하여 배열로 반환
function extractTextWithXPath() {
    const results = [];

    const nodes = document.evaluate('//body//*[not(self::script or self::style)]/text()[normalize-space()]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < nodes.snapshotLength; i++) {
        const node = nodes.snapshotItem(i);
        const text = node.nodeValue.trim();
        if (text) {
            let xpath = getElementXPath(node.parentNode);
            xpath = escapeXPath(xpath); // getElementXPath에서 생성된 XPath를 이스케이프 처리
            results.push({ text: text, xpath: xpath });
        }
    }

    return results;
}




///////// 가격 정보 함수 ////////////
function initializePriceHoverListeners() {
    let hoverTimer = null;

    // mouseover 이벤트: 가격 위에 마우스를 올렸을 때 발생
    document.addEventListener('mouseover', (event) => {
        const target = event.target;

        // 상품의 url이 포함된 a 태그 찾기
        const linkElement = target.closest('a[href*="itemNo="]');
        if (!linkElement) return;

        // 플랫폼 및 itemNo 추출
        const platform = window.location.hostname.includes('homeplus') ? 'Homeplus' : 'Unknown';
        const url = linkElement.href;
        const itemNoMatch = url.match(/itemNo=(\d+)/);
        if (!itemNoMatch) return;

        const productId = itemNoMatch[1];

        hoverTimer = setTimeout(() => {
            // 상품페이지에서 categoryName, productId 추출
            chrome.runtime.sendMessage(
                { action: 'fetchCategoryAndProductId', url },
                (response) => {
                    if (response && response.categoryName && response.productId) {
                        fetchAndDisplayPriceHistory(platform, response.categoryName, response.productId, target);
                    } else {
                        console.error('Failed to get categoryName and productId:', response.error);
                    }
                }
            );
        }, 2000); // 2초 후에 실행
    });

    document.addEventListener('mouseout', () => {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });
}

// 가격 변동 정보 요청 및 표시
async function fetchAndDisplayPriceHistory(platform, categoryName, productId, target) {
    
    // categoryName을 URL에 포함시키기 위해 인코딩
    const encodedCategoryName = encodeURIComponent(categoryName);

    try {
        // 상품 이름에 한글, 특수문자가 포함된 경우 안전하게 URL에 포함시키기 위해 사용
        const response = await fetch(`${mockServerUrl}/${platform}/${encodedCategoryName}/${productId}`);
        if (!response.ok) {
            throw new Error('가격 정보를 가져오지 못했습니다.');
        }
        const data = await response.json();
        displayPriceHistory(data, target);
    } catch (error) {
        console.error('가격 변동 정보를 가져오는 중 오류 발생:', error);
    }
}

// 가격 변동 표시 박스 생성 및 표시
function displayPriceHistory(data, target) {
    if (!data) return;

    const priceHistoryBox = document.createElement('div');
    priceHistoryBox.className = 'price-history-box';

    // 가격 변동 데이터 추가
    const prices = Object.entries(data[0].prices).map(([date, price]) => `${date}: ${price}원`).join('<br/>');
    priceHistoryBox.innerHTML = `가격 변동:<br/>${prices}`;

    document.body.appendChild(priceHistoryBox);

    // 가격 위에 위치 조정
    const rect = target.getBoundingClientRect();
    priceHistoryBox.style.left = `${rect.right + 10}px`; // 가격 옆
    priceHistoryBox.style.top = `${rect.top}px`;

    // 마우스 떼면 박스 제거
    target.addEventListener('mouseout', () => {
        priceHistoryBox.remove();
    });
}
