// content.js: DOM에 접근 후 변경 = 다크패턴 감지 후 UI에 표시

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


// 웹페이지에서 텍스트와 해당 텍스트의 XPath를 추출하여 배열로 반환
function extractTextWithXPath() {
    const results = [];

    const nodes = document.evaluate('//body//*[not(self::script or self::style)]/text()[normalize-space()]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < nodes.snapshotLength; i++) {
        const node = nodes.snapshotItem(i);
        const text = node.nodeValue.trim();
        if (text) {
            const xpath = getElementXPath(node.parentNode);
            results.push({ text: text, xpath: xpath });
        }
    }

    return results;
}


// 1. 다크패턴 감지 요청
async function sendTextToServer(textData) {
    try {
        const response = await fetch('http://localhost:3000/dark-pattern/detection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(textData)
        });

        if (!response.ok) {
            const errorData = await response.json(); // 오류 메시지를 가져옴
            throw new Error(`Network response was not ok: ${errorData.message}`);
        }

        const data = await response.json();
        console.log('Success:', data);
        displayDarkPatterns(data); // UI에 다크 패턴 표시 로직
    } catch (error) {
        console.error('Error:', error);
    }
}


// 2. 다크패턴 결과 표시
// data(다크패턴에 대한 정보)를 통해 다크패턴을 블러 처리함
function displayDarkPatterns(data) {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'dark-pattern-results';
    
    data.forEach(pattern => {
        const patternElement = document.createElement('div');
        patternElement.innerText = `다크 패턴: ${pattern.text} (XPath: ${pattern.xpath})`;
        resultsContainer.appendChild(patternElement);
        blurElement(pattern.xpath); // 다크 패턴을 블러 처리
    });
    
    document.body.appendChild(resultsContainer);
}


// 다크패턴 감지 -> 서버 전송 -> 클라이언트에 결과 응답
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectDarkPatterns') { 
        const textData = extractTextWithXPath();
        sendTextToServer(textData).then(() => {
            sendResponse({ status: 'processed', textData: textData });
        });
        return true;
    }
});



// 다크패턴 blur 처리
function blurElement(xpath) {
    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.style.filter = "blur(4px)";
    }
}


// 3. 가격 변동 정보 요청 및 표시
async function showPriceHistory(productId) {
    try {
        const response = await fetch(`http://localhost:3000/price-info/${productId}`);
        const data = await response.json(); // 응답 데이터 파싱
        displayPriceHistory(data); // 데이터가 성공적으로 받아지면 displayPriceHistory 호출
    } catch (error) {
        console.error('가격 변동 정보를 가져오는 중 오류 발생:', error);
    }
}





// 가격 변동 표시 박스 생성
function displayPriceHistory(data) {
    const priceHistoryBox = document.createElement('div');
    priceHistoryBox.className = 'price-history-box';
    priceHistoryBox.style.position = 'absolute';
    priceHistoryBox.style.backgroundColor = 'white';
    priceHistoryBox.style.border = '1px solid black';
    priceHistoryBox.style.padding = '10px';
    priceHistoryBox.style.zIndex = 1000;

    // 가격 변동 데이터 추가
    const prices = data.map(price => `${price.date}: ${price.price}`).join('<br/>');
    priceHistoryBox.innerHTML = `가격 변동:<br/>${prices}`;

    document.body.appendChild(priceHistoryBox);

    // 가격 위에 위치 조정
    const target = document.querySelector(`[data-product-id="${data[0].product_id}"]`);
    const rect = target.getBoundingClientRect();
    priceHistoryBox.style.left = `${rect.left}px`;
    priceHistoryBox.style.top = `${rect.top - priceHistoryBox.offsetHeight}px`;

    // 박스 제거 기능
    priceHistoryBox.addEventListener('mouseleave', () => {
        priceHistoryBox.remove();
    });
}

// mouseover 이벤트: 가격 위에 마우스를 올렸을 때 mouseover 이벤트 발생
document.addEventListener('mouseover', (event) => {
    const target = event.target;
    const productId = target.getAttribute('data-product-id');
    if (productId) { // 이벤트 발생 시 서버에 가격 변동 정보 요청
        showPriceHistory(productId);
    }
});