const darkUrl = "YOUR_DARK_PATTERN_API";
const priceUrl = "YOUR_PRICE_API";

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
                console.log('[리스너] 성공 response 보내기');
                sendResponse({ status: "success" });
            } else {
                console.log('[리스너] 다크패턴이 감지가 안 됨. 실패 response 보내기');
                sendResponse({ status: "failure" });
            }
        }).catch((error) => {
            console.error('[리스너] 서버 요청 중 에러:', error);
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


///////////// 다크패턴 함수 ////////////////
// 다크패턴 탐지 요청
async function sendTextToServer(textData) {
    console.log('[sendTextToServer] 서버로 다음 데이터 전송:', textData); 
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


// 툴팁 요소 생성
function createTooltipElement(label) {
    const tooltipText = document.createElement('span');
    tooltipText.className = 'tooltip-text';
    tooltipText.innerText = null;
    return tooltipText;
}


function displayDarkPatterns(data) {
    chrome.storage.local.get('checkedLabels', ({ checkedLabels }) => {
        data.forEach(pattern => {
            if (checkedLabels.includes(pattern.label)) { // 체크된 라벨만 표시
                const element = document.evaluate(pattern.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    const tooltip = createTooltipElement(pattern.label);
                    
                    switch (pattern.label) {
                        case 1:
                            tooltip.innerText = '⚠️ 거짓 정보이거나 유인 판매일 수 있어요.';
                            break;
                        case 2:
                            tooltip.innerText ='⚠️ 소비 압박을 가해요.';
                            break;
                        case 3:
                            tooltip.innerText ='⚠️ 빠른 소비를 유도해요.';
                            break;
                        case 4:
                            tooltip.innerText ='⚠️ 다른 사용자의 행동을 따라하도록 유도해요.';
                            break;
                        default:
                            tooltip.innerText ='알 수 없는 라벨';
                    }

                    // 툴팁 스타일 및 위치 설정
                    tooltip.style.position = 'absolute';
                    tooltip.style.backgroundColor = '#333';
                    tooltip.style.color = '#fff';
                    tooltip.style.padding = '5px';
                    tooltip.style.borderRadius = '5px';
                    tooltip.style.zIndex = '1000';
                    tooltip.style.visibility = 'hidden';

                    document.body.appendChild(tooltip);
                    
                    const rect = element.getBoundingClientRect();
                    tooltip.style.top = `${window.scrollY + rect.top - tooltip.offsetHeight - 5}px`;
                    tooltip.style.left = `${window.scrollX + rect.left}px`;

                    element.addEventListener('mouseenter', () => {
                        tooltip.style.visibility = 'visible';
                    });

                    element.addEventListener('mouseleave', () => {
                        tooltip.style.visibility = 'hidden';
                    });

                    blurElement(pattern.xpath);
                } else {
                    console.log('Element not found for XPath:', pattern.xpath);
                }
            }
        });
    });
}




// 다크패턴 블러 처리
function blurElement(xpath) {
    const unescapedXpath = unescapeXPath(xpath);

    const element = document.evaluate(unescapedXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
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



function detectDarkPatterns() {
    const textData = extractTextWithXPath(); 
    sendTextToServer(textData); // 추출된 데이터를 서버로 전송하여 다크 패턴 분석
    console.log('Extracted text and XPaths:', textData); // 추가된 로그
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
    console.log('Number of nodes found:', nodes.snapshotLength); // 추가된 로그

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




/********************** 가격 정보 함수 *******************************/
// HomePlus의 카테고리 추출
function getHomePlusCategoryName() {
    const categoryElement = document.evaluate(
        '//*[@id="site-wrapper"]/div[2]/div/div[1]/nav/ol/li[2]/div/button/span',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    let categoryName = categoryElement ? categoryElement.textContent.trim() : null;

    // CategoryName에 '/'가 있으면 '_'로 교체
    if (categoryName) {
        categoryName = categoryName.replace(/\//g, '_');
        console.log("[getHomeplusCategoryName]: 카테고리 이름: ", categoryName);
    }

    return categoryName;
}

// Gmarket의 카테고리 추출
function getGmarketCategoryName() {
    const categoryElement = document.evaluate(
        '/html/body/div[3]/ul/li[2]/a',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    return categoryElement ? categoryElement.textContent.trim() : null;
}

// HomePlus의 URL에서 productId 추출
function getHomePlusProductId(url) {
    const productIdMatch = url.match(/itemNo=(\d+)/);
    return productIdMatch ? productIdMatch[1] : null;
}

// Gmarket의 URL에서 productId 추출
function getGmarketProductId(url) {
    const productIdMatch = url.match(/goodsCode=(\d+)/i); // 'i' 플래그 추가로 대소문자 구분 없앰
    return productIdMatch ? productIdMatch[1] : null;
}

// Oasis의 URL에서 productId 추출
function getOasisProductId(url) {
    const productIdMatch = url.match(/\/(\d+)-/);
    return productIdMatch ? productIdMatch[1] : null;
}



// 1. 페이지에서 categoryName과 productId 추출
async function fetchCategoryAndProductId() {
    const url = window.location.href;
    let categoryName = null;
    let productId = null;
    let platform = null;

    if (url.includes('mfront.homeplus.co.kr')) {
        platform = 'HomePlus';
        categoryName = getHomePlusCategoryName();
        productId = getHomePlusProductId(url);
    } else if (url.includes('gmarket.co.kr')) {
        platform = 'Gmarket';
        categoryName = getGmarketCategoryName();
        productId = getGmarketProductId(url);
    } else if (url.includes('oasis.co.kr')) {
        platform = 'Oasis';
        productId = getOasisProductId(url);
    } else {
        platform = 'Unknown';
    }

    console.log("[fetchCategoryAndProductId] 상품 URL:", url, " productID:", productId);
    
    if (!productId) {
        console.error('Product ID not found in URL');
        return null;
    }

    if (!categoryName && platform !== 'Oasis') {  // Oasis는 categoryName이 없음
        console.error('Category name not found via XPath');
        return null;
    }

    console.log('[fetchCategoryAndProductId] 카테고리명:', categoryName, '상품 ID:', productId);
    return { platform, productId, categoryName };
}


// 웹페이지에 Chart.js 스크립트와 renderPriceChart.js 스크립트를 삽입
function injectChartJsAndRenderScript() {
    // 1. Chart.js 스크립트 삽입
    const chartScript = document.createElement('script');
    chartScript.src = chrome.runtime.getURL('scripts/chart.umd.js');
    chartScript.onload = () => {
        console.log('Chart.js injected into page successfully');
        
        // 2. 차트 렌더링 스크립트 삽입 (외부 파일)
        const renderScript = document.createElement('script');
        renderScript.src = chrome.runtime.getURL('scripts/renderPriceChart.js');  // 외부 파일로 삽입
        renderScript.onload = () => {
            console.log('RenderPriceChart.js injected successfully');
        };
        renderScript.onerror = (e) => {
            console.error('Failed to inject renderPriceChart.js into page', e);
        };
        document.head.appendChild(renderScript);  // 웹페이지에 차트 렌더링 스크립트 삽입
    };
    chartScript.onerror = (e) => {
        console.error('Failed to inject Chart.js into page', e);
    };
    (document.head || document.documentElement).appendChild(chartScript);  // 웹페이지에 Chart.js 삽입
}

// MutationObserver를 사용하여 요소가 로드될 때까지 기다림
function waitForCategoryAndProductId() {
    const observer = new MutationObserver(async (mutations, obs) => {
        const productInfo = await fetchCategoryAndProductId();

        if (productInfo) {
            console.log('〓〓〓〓〓 상품 정보 〓〓〓〓〓');
            console.log('platform:', productInfo.platform);
            console.log('categoryName:', productInfo.categoryName);
            console.log('productId:', productInfo.productId);
            console.log('〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓');

            obs.disconnect(); // 요소를 찾으면 옵저버를 중지함

            // 백그라운드 스크립트에 가격 정보를 요청하는 메시지 전송
            chrome.runtime.sendMessage(
                { action: 'fetchPriceInfo', payload: productInfo },
                async (response) => {

                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError.message);
                        return;
                    }

                    console.log('[waitForCategoryAndProductId] response: ', response); // 뜨고 있음

                    if (response && response.status === 'success') {
                        console.log('[waitForCategoryAndProductId] 가격 정보 받음:', response.data);

                        // 웹페이지에 데이터를 전달하여 차트 렌더링 요청
                        window.postMessage({ type: 'RENDER_CHART', data: response.data[0] }, '*');
                    } else {
                        console.error('[waitForCategoryAndProductId] 가격 정보 못 받음:', response.message);
                    }
                }
            );
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// 페이지 로드 시 실행
window.addEventListener('load', function() {
    injectChartJsAndRenderScript();  // Chart.js와 renderPriceChart.js를 삽입
});



// 페이지가 로드될 때마다 다크패턴 탐지, 가격 정보 갱신
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Received message in content-script.js:', request.action);

    if (request.action === "fetchNewPriceInfo") {
        console.log('Fetching price info for new URL...');
        waitForCategoryAndProductId();
        sendResponse({status: 'Price fetching initiated'});
    }
    else if (request.action === "detectDarkPatterns") {
        detectDarkPatterns().then((data) => {
            console.log('Received data from server:', data);
            if (Array.isArray(data) && data.length > 0) {
                sendResponse({ status: "success" });
            } else {
                sendResponse({ status: "failure" });
            }
        }).catch((error) => {
            console.error('Error during server request:', error);
            sendResponse({ status: "failure" });
        });

        return true; // 비동기 처리를 위해 true 반환
    }
});