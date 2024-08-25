// 1. 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchData") {
        fetchDataFromServer(request.xpath).then(data => {
            sendResponse({ data: data });
        });
        return true; // 비동기 응답을 사용하기 위해 true를 반환
    }
});



// 2. 서버에서 비동기로 데이터 가져오기
// xpath를 사용하여 서버에 데이터를 요청 후, 응답을 받아 json 형식으로 반환
async function fetchDataFromServer(xpath) {
    try {
        const response = await fetch('https://my-server.com/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ xpath }),
        });
        return await response.json();
    } catch (error) {
        console.error("서버로부터 데이터를 가져오는 중 오류 발생:", error);
        return null;
    }
}