const mockServerUrl = "https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io";
const darkUrl = "http://52.78.128.233/dark-patterns";
const priceUrl = "http://54.174.27.101:8090";

// 페이지가 로드되거나 갱신될 때마다 다크패턴을 자동으로 탐지
chrome.storage.local.get("darkPatternDetection", (result) => {
    if (result.darkPatternDetection) {
        const textData = extractTextWithXPath(); 
        sendTextToServer(textData); // 이스케이프된 데이터를 서버로 전송
    }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in content-script.js:', request.action);
    
    if (request.action === 'detectDarkPatterns') { 
        const textData = extractTextWithXPath();
        console.log('Extracted textData:', textData);

        sendTextToServer(textData).then((data) => {
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
async function sendTextToServer(textData) {
    try {
        const response = await fetch(`${darkUrl}`, {
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
        console.log('[Dark Pattern] Success:', data);

        displayDarkPatterns(data); // 데이터를 받은 후, 블러 처리 함수 호출
        return data; 
    } catch (error) {
        console.error('[sendTextToServer] 오류:', error);
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

// 페이지의 DOM이 완전히 로드되면 바로 다크패턴 검사
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    detectDarkPatterns();  // 다크 패턴 탐지 함수 호출
});

function detectDarkPatterns() {
    const textData = extractTextWithXPath(); 
    sendTextToServer(textData); // 추출된 데이터를 서버로 전송하여 다크 패턴 분석
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
            console.log('[extractTextWithXPath] 모델에 보낼 XPath:', xpath); // XPath 로깅
            console.log('XPath 변수의 유형:', typeof xpath); // XPath의 데이터 유형 출력
            results.push({ text: text, xpath: xpath });
        }
    }

    return results;
}




///////// 가격 정보 함수 ////////////
// 카테고리 추출
function getCategoryNameFromXPath() {
    const categoryElement = document.evaluate(
        '//*[@id="site-wrapper"]/div[2]/div/div[1]/nav/ol/li[2]/div/button/span',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    return categoryElement ? categoryElement.textContent.trim() : null;
}

// url에서 productId를 추출
function getProductId(url) {
    const productIdMatch = url.match(/itemNo=(\d+)/);
    return productIdMatch ? productIdMatch[1] : null;
}




// 1. 페이지에서 categoryName과 productId 추출
async function fetchCategoryAndProductId() {
    const categoryName = getCategoryNameFromXPath();
    const url = window.location.href;
    const productId = getProductId(url);

    // URL에서 도메인을 기반으로 플랫폼 결정
    let platform;
    if (url.includes('mfront.homeplus.co.kr')) {
        platform = 'Homeplus';
    } else {
        // ******** 지마켓, 포스티도 추가하기 *********
        platform = 'Unknown'; 
    }

    console.log("[fetchCategoryAndProductId] productURL:", url, " productID:", productId);
    
    if (!productId) {
        console.error('Product ID not found in URL');
        return null;
    }

    if (!categoryName) {
        console.error('Category name not found via XPath');
        return null;
    }

    console.log('[fetchCategoryAndProductId] Extracted Category:', categoryName, 'Product ID:', productId);
    return { platform, productId, categoryName };
}


// 2. MutationObserver를 사용하여 요소가 로드될 때까지 기다림
function waitForCategoryAndProductId() {
    const observer = new MutationObserver(async (mutations, obs) => {
        const productInfo = await fetchCategoryAndProductId();
        

        if (productInfo) {
            obs.disconnect(); // 요소를 찾으면 옵저버를 중지함
            chrome.runtime.sendMessage(
                { action: 'fetchPriceInfo', payload: productInfo },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError.message);
                        return;
                    }

                    console.log('[waitForCategoryAndProductId] response: ', response);
                    console.log('[waitForCategoryAndProductId] response.status: ', response.status);
                    if (response && response.status === 'success') {
                        console.log('Price Info received:', response.data);
                        fetchAndDisplayPriceHistory(productInfo.platform, productInfo.categoryName, productInfo.productId, document.body);
                        
                    } else {
                        console.error('[waitForCategoryAndProductId] 가격 정보 못 받음:', response.message);

                    }
                }
            );
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// 페이지 로드 시 두 함수(제품 정보, 가격 정보 받아오기)를 모두 호출
window.addEventListener('load', function() {
    waitForCategoryAndProductId();  // 제품 정보 및 가격 정보 초기화
    initializeDarkPatternDetection();  // 다크 패턴 탐지 초기화
    initializePriceInfoDisplay();  // 가격 정보 표시 초기화
});


function initializeDarkPatternDetection() {
    chrome.storage.local.get("darkPatternDetection", (result) => {
        if (result.darkPatternDetection) {
            detectDarkPatterns(); // 페이지 로드 시 다크 패턴 탐지 실행
        }
    });
}

function initializePriceInfoDisplay() {
    const target = document.evaluate('//*[@id="site-wrapper"]/div[2]/div/div[2]/div[2]/div[1]/div[3]/div[1]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (target) {
        console.log('가격 태그 발견');
        fetchCategoryAndProductId().then(productInfo => {
            if (productInfo) {
                fetchAndDisplayPriceHistory(productInfo.platform, productInfo.categoryName, productInfo.productId, target);
            }
        });
    } else {
        console.log('[initializePriceInfoDisplay] 가격 태그 발견 못 함');
    }
}


// 가격 정보 표시 초기화
function initializePriceHoverListeners() {
    let hoverTimer = null;

    document.addEventListener('mouseover', (event) => {
        const target = event.target;
        const linkElement = target.closest('a[href*="itemNo="]');
        if (!linkElement) return;

        const url = linkElement.href;
        const productId = getProductId(url);

        hoverTimer = setTimeout(async () => {
            const productInfo = await fetchCategoryAndProductId();
            console.log('[initializePriceHoverListeners] productInfo: ', productInfo);

            if (productInfo) {
                fetchAndDisplayPriceHistory('Homeplus', productInfo.categoryName, productInfo.productId, target);
            } else {
                console.error('Failed to fetch product information.');
            }
        }, 2000); // 2초 후에 실행
    });

    document.addEventListener('mouseout', () => {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });
}

function displayPriceHistory(data, target) {
    if (!data) {
        console.log('No price data available');
        return;
    }

    console.log('[displayPriceHistory] 가격 정보: ', data);

    const priceHistoryBox = document.createElement('div');
    priceHistoryBox.className = 'price-history-box';
    priceHistoryBox.style.position = 'fixed';
    priceHistoryBox.style.right = '20px';
    priceHistoryBox.style.top = '20px';
    priceHistoryBox.style.border = '1px solid #ccc';
    priceHistoryBox.style.background = 'white';
    priceHistoryBox.style.padding = '10px';
    priceHistoryBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    priceHistoryBox.style.width = '300px';
    priceHistoryBox.style.zIndex = '1000';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.float = 'right';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.onclick = function() {
        priceHistoryBox.remove();
    };
    priceHistoryBox.appendChild(closeButton);

    const title = document.createElement('div');
    title.textContent = '가격 변동 정보';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    priceHistoryBox.appendChild(title);

    const prices = Object.entries(data[0].prices).map(([date, price]) => `${date}: ${price}원`).join('<br>');
    priceHistoryBox.innerHTML += prices;
    document.body.appendChild(priceHistoryBox);
}



// 가격 변동 정보 요청 및 표시
async function fetchAndDisplayPriceHistory(platform, categoryName, productId, target) {
    
    try {
        console.log('〓〓〓〓〓 상품 정보 〓〓〓〓〓')
        console.log('priceUrl:', priceUrl);
        console.log('platform:', platform);
        console.log('categoryName:', categoryName);
        console.log('productId:', productId);
        const apiUrl = `${priceUrl}/price-info/${platform}/${productId}/${categoryName}`;
        console.log('API URL:', apiUrl);
        console.log('〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓')

        if (!categoryName) {
            console.error('Category name is missing or undefined.');
            return;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch price history');
        }      

        const data = await response.json();
        displayPriceHistory(data, target);
    } catch (error) {
        console.error('Error fetching and displaying price history:', error);
    }
}
    




// 페이지가 로드될 때마다 다크패턴 탐지, 가격 정보 갱신
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "fetchNewPriceInfo") {
        console.log('Fetching price info for new URL...');
        waitForCategoryAndProductId();  // 기존에 작성한 함수를 재사용
        sendResponse({status: 'Price fetching initiated'});
    }
    else if (request.action === "detectDarkPatterns") {
        detectDarkPatterns();  // 다크 패턴 탐지 실행
        sendResponse({status: 'Detection started'});
    }
});