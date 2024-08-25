export function initializePriceHoverListeners() {
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
        const response = await fetch(`${mockServerUrl}/${platform}/${productId}/${encodedCategoryName}`);
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
