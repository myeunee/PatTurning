// 1. 메시지 리스너 2개
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received request in background.js:', request);
    if (request.action === "fetchData") {
        fetchDataFromServer(request.xpath).then(data => {
            sendResponse({ data: data });
        }).catch(error => {
            console.error('Error during fetchData:', error);
            sendResponse({ error: 'Failed to fetch data from server' });
        });
        return true; // 비동기 응답을 사용하기 위해 true를 반환


        // 클라이언트에서 URL을 반환하면, 백그라운드에서 URL 요청 및 데이터 파싱
    } else if (request.action === 'fetchCategoryAndProductId') {
        fetchCategoryAndProductId(request.url).then(data => {
            sendResponse(data);
        }).catch(error => {
            console.error('Error fetching category and product ID:', error);
            sendResponse({ error: 'Failed to fetch category and product ID' });
        });
        return true; // 비동기 응답을 사용하기 위해 true를 반환
    } else {
        console.log('Unknown action:', request.action);
    }
});

// 2. 서버에서 비동기로 데이터 가져오기
// xpath를 사용해 서버에 데이터를 요청 후, 응답 후 json 형식으로 변환
async function fetchDataFromServer(xpath) {
    console.log('Fetching data from server with xpath:', xpath);
    try {
        const response = await fetch('https://daf1a148-1754-4c0d-a727-c240d6f6c0e5.mock.pstmn.io/dark-patterns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ xpath }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch data from server');
        }
        
        const data = await response.json();

        console.log('Data received from server:', data);

        return data;
    } catch (error) {
        console.error("Error fetching data from server:", error);
        return null;
    }
}

// 3. 백그라운드에서 상품 URL 요청 및 categoryName과 productId 파싱
async function fetchCategoryAndProductId(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load the product page');
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 상품 페이지에서 categoryName과 productId 추출 (HTML 구조에 따라 조정)
        const categoryName = doc.evaluate('//*[@id="site-wrapper"]/div[2]/div/div[1]/nav/ol/li[2]/div/button/span', doc, null, XPathResult.STRING_TYPE, null).stringValue;
        const productIdMatch = url.match(/itemNo=(\d+)/);
        const productId = productIdMatch ? productIdMatch[1] : null;

        if (!productId) {
            throw new Error('Product ID not found in URL');
        }

        return { categoryName, productId };
    } catch (error) {
        console.error('Error fetching product page:', error);
        return { error: 'Failed to fetch product page' };
    }
}
