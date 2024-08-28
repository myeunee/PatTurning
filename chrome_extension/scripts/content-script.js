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
    data.forEach(pattern => {
        const element = document.evaluate(pattern.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        if (element) {
            const tooltip = createTooltipElement(pattern.label);
            
            switch (pattern.label) {
                case 1:
                    tooltip.innerText = '⚠️ 거짓 정보이거나 유인 판매일 수 있어요.';
                    break;
                case 2:
                    tooltip.innerText ='⚠️ 의사 결정을 방해해요.';
                    break;
                case 3:
                    tooltip.innerText ='⚠️ 소비 압박을 가해요.';
                    break;
                default:
                    tooltip.innerText ='알 수 없는 라벨';
            }
            
            // 툴팁 스타일 설정
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px';
            tooltip.style.borderRadius = '5px';
            tooltip.style.zIndex = '1000';
            tooltip.style.visibility = 'hidden';

            document.body.appendChild(tooltip);
            
            // 요소의 위치 계산
            const rect = element.getBoundingClientRect();
            tooltip.style.top = `${window.scrollY + rect.top - tooltip.offsetHeight - 5}px`; // 요소의 바로 위에 위치
            tooltip.style.left = `${window.scrollX + rect.left}px`; // 요소의 왼쪽 정렬

            // 툴팁을 호버 시 보이게 설정
            element.addEventListener('mouseenter', () => {
                tooltip.style.visibility = 'visible';
            });

            element.addEventListener('mouseleave', () => {
                tooltip.style.visibility = 'hidden';
            });

            // 블러 처리
            blurElement(pattern.xpath);
        } else {
            console.log('Element not found for XPath:', pattern.xpath);
        }
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

    return categoryElement ? categoryElement.textContent.trim() : null;
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

// Posty의 URL에서 productId 추출
function getPostyProductId(url) {
    const productIdMatch = url.match(/products\/(\d+)/);
    console.log('포스티 상품 아이디: ', productIdMatch);
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
    } else if (url.includes('posty.kr')) {
        platform = 'Posty';
        productId = getPostyProductId(url);
    } else {
        platform = 'Unknown';
    }

    console.log("[fetchCategoryAndProductId] 상품 URL:", url, " productID:", productId);
    
    if (!productId) {
        console.error('Product ID not found in URL');
        return null;
    }

    if (!categoryName && platform !== 'Posty') {  // Posty는 categoryName이 없을 수 있음
        console.error('Category name not found via XPath');
        return null;
    }

    console.log('[fetchCategoryAndProductId] 카테고리명:', categoryName, '상품 ID:', productId);
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
                        
                        // categoryName이 없어도 Posty의 경우 호출할 수 있도록 처리
                        fetchAndDisplayPriceHistory(
                            productInfo.platform,
                            productInfo.categoryName || null,
                            productInfo.productId,
                            document.body
                        );                        
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
    console.log('Page fully loaded');

    // 제품 정보 및 가격 정보 초기화
    waitForCategoryAndProductId();

    // 다크 패턴 탐지 초기화
    initializeDarkPatternDetection();

    // 가격 정보 표시 초기화
    initializePriceInfoDisplay();
});


function initializeDarkPatternDetection() {
    chrome.storage.local.get("darkPatternDetection", (result) => {
        if (result.darkPatternDetection) {
            detectDarkPatterns(); // 페이지 로드 시 다크 패턴 탐지 실행
        }
    });
}

function initializePriceInfoDisplay() {
    fetchCategoryAndProductId().then(productInfo => {
        if (productInfo) {
            // categoryName이 없어도 Posty의 경우 호출할 수 있도록 처리
            fetchAndDisplayPriceHistory(
                productInfo.platform,
                productInfo.categoryName || null,
                productInfo.productId,
                target
            );
                       }
    });
}


function renderPriceChart(data, target) {
    const prices = data.prices;

    if (!prices || prices.length === 0) {
        console.error('No prices data available');
        return;
    }

    const labels = prices.map(item => Object.keys(item)[0]);  // 날짜
    const values = prices.map(item => Object.values(item)[0]); // 가격
    
    
    // 현재 가격과 평균 가격 비교
    const latestPrice = values[values.length - 1];
    const avgPrice = data.avg;
    let priceDifferenceText = '';

    if (latestPrice > avgPrice) {
        const percentage = ((latestPrice - avgPrice) / avgPrice) * 100;
        priceDifferenceText = `현재 가격이 평균보다 <span style="color: #0000ff;">${percentage.toFixed(2)}%</span> 비쌉니다.`;
    } else if (latestPrice < avgPrice) {
        const percentage = ((avgPrice - latestPrice) / avgPrice) * 100;
        priceDifferenceText = `현재 가격이 평균보다 <span style="color: #0000ff;">${percentage.toFixed(2)}%</span> 쌉니다.`;
    } else {
        priceDifferenceText = `현재 가격이 <span style="color: #0000ff;">평균과 동일</span>합니다.`;
    }

    // 기존에 존재하는 priceHistoryBox가 있다면 제거
    const existingBox = document.querySelector('.price-history-box');
    if (existingBox) {
        existingBox.remove();
    }

    // 새로운 컨테이너를 만들어서 추가
    const priceHistoryBox = document.createElement('div');
    priceHistoryBox.className = 'price-history-box';
    priceHistoryBox.style.position = 'fixed';
    priceHistoryBox.style.right = '100px'; // 오른쪽에서
    priceHistoryBox.style.top = '300px'; // 위에서
    priceHistoryBox.style.border = '1px solid #ccc';
    priceHistoryBox.style.background = 'white';
    priceHistoryBox.style.padding = '10px';
    priceHistoryBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    priceHistoryBox.style.width = '400px';
    priceHistoryBox.style.zIndex = '1000';

    // X 버튼
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // X 표시
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
        priceHistoryBox.remove();
    };

    // 박스에 X 버튼 추가
    priceHistoryBox.appendChild(closeButton);

    // 제목
    const title = document.createElement('h3');
    title.style.textAlign = 'center';
    title.style.fontSize = '24px';
    title.textContent = '💡 가격 변동 그래프 💡';
    title.style.marginBottom = '8px';
    title.style.fontFamily = 'Pretendard';

    // 부제목
    const subTitle = document.createElement('p');
    subTitle.style.textAlign = 'center';
    subTitle.style.color = '#808080';
    subTitle.style.fontSize = '15px';
    subTitle.style.marginBottom = '15px';
    subTitle.textContent = '지금이 최적의 구매 타이밍인지 알아보세요!'; 
    subTitle.style.fontFamily = 'Pretendard'; 

    // 가격차
    const priceDiffTextElement = document.createElement('h3');
    priceDiffTextElement.style.textAlign = 'center';
    priceDiffTextElement.style.fontSize = '18px';
    priceDiffTextElement.style.marginBottom = '18px';
    priceDiffTextElement.style.fontFamily = 'Pretendard';
    priceDiffTextElement.innerHTML = priceDifferenceText;
    priceHistoryBox.appendChild(title);
    priceHistoryBox.appendChild(subTitle);
    priceHistoryBox.appendChild(priceDiffTextElement);
    

    // 캔버스 엘리먼트를 만들고, 이를 그래프 컨테이너에 추가
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '150px';
    canvas.id = 'priceChart'; // 캔버스 ID 설정
    priceHistoryBox.appendChild(canvas);

    // 평균, 최저, 최고가 텍스트 포함 박스
    const priceStatsBox = document.createElement('div');
    priceStatsBox.style.marginTop = '10px';
    priceStatsBox.style.padding = '10px';
    priceStatsBox.style.border = '2px solid #808080';
    priceStatsBox.style.background = '#f9f9f9';
    

    const priceStats = document.createElement('p');
    priceStats.style.textAlign = 'center';
    priceStats.style.fontFamily = 'Pretendard';
    priceStats.style.fontSize = '13px';
    priceStats.innerHTML = `
        <p style="color: #000000;"> 🔥 평균가: ${data.avg} 원</p>
        <p style="color: #0000ff;"> 🔥 최저가: ${data.min} 원</p>
        <p style="color: #d2691e;"> 🔥 최대가: ${data.max} 원</p>
    `;

    priceHistoryBox.appendChild(canvas);
    priceHistoryBox.appendChild(priceStats);
    document.body.appendChild(priceHistoryBox);

    // 직접 그래프 그리기
    const ctx = canvas.getContext('2d');

    // 그래프의 기본 설정
    const padding = 40;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Y축 범위 계산(가격이 동일한 경우 대비)
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue === minValue ? 1 : maxValue - minValue;
    const yScale = graphHeight / range;
    const xStep = graphWidth / (labels.length - 1);

    // 데이터를 중앙에서 시작하도록 조정
    const offsetY = (canvas.height - graphHeight) / 2;

    // 데이터 라인 그리기
    ctx.beginPath();
    values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = offsetY + (maxValue - value) * yScale;  // Y 좌표를 중앙에 배치
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.strokeStyle = '#0000ff'; // 데이터 라인: 파란색
    ctx.stroke();

    // 데이터 포인트 그리기
    values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = offsetY + (maxValue - value) * yScale;  // Y 좌표를 중앙에 배치
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0000ff';
        ctx.fill();
    });

    // X축 레이블 그리기
    ctx.fillStyle = '#808080';
    ctx.font = '10px Arial';    

    // X축 선 그리기
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.strokeStyle = '#808080';
    ctx.stroke();

    // x축 레이블(날짜)
    labels.forEach((label, index) => {
        const x = padding + index * xStep;
        const y = canvas.height - padding + 10; // 레이블을 좀 더 아래로 내림

        // 날짜 형식 간소화
        const simplifiedLabel = label.slice(5);  // "2024-08-17" -> "08-17"

        // 레이블 그리기
        ctx.save();  // 현재 상태 저장
        ctx.translate(x, y);  // 텍스트 위치로 이동
        ctx.fillText(simplifiedLabel, 0, 0);  // 회전된 상태에서 텍스트 그리기
        ctx.restore();  // 원래 상태로 복원
    
    });
}







// 가격 변동 정보 요청 및 표시
async function fetchAndDisplayPriceHistory(platform, categoryName, productId, target) {
    
    try {
        console.log('〓〓〓〓〓 상품 정보 〓〓〓〓〓')
        console.log('priceUrl:', priceUrl);
        console.log('platform:', platform);
        console.log('categoryName:', categoryName);
        console.log('productId:', productId);

        // 플랫폼에 따라 API URL을 다르게 설정
        let apiUrl;
        if (platform === 'Posty') {
            apiUrl = `${priceUrl}/price-info/${platform}/${productId}`;
        } else {
            apiUrl = `${priceUrl}/price-info/${platform}/${productId}/${categoryName}`;
        }

        console.log('API URL:', apiUrl);
        console.log('〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓');

        if (!categoryName && platform !== 'Posty') {
            console.error('Category name is missing or undefined.');
            return;
        }

        const response = await fetch(apiUrl);
        console.log('[fetchAndDisplayPriceHistory] response:', response);


        if (!response.ok) {
            throw new Error('Failed to fetch price history');
        } 

        const data = await response.json();
        console.log('Full data structure:', JSON.stringify(data, null, 2));
        console.log('Price data received:', data);


        // 데이터가 있는지 확인
        if (data && data.prices && data.prices.length > 0) {
            // 데이터가 있으면 그래프를 그립니다.
            renderPriceChart(data, target);
        } else {
            console.error('No price data available');
        }
        } catch (error) {
            console.error('Error fetching and displaying price history:', error);
        }
}



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