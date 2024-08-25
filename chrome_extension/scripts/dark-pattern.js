import { extractTextWithXPath, unescapeXPath } from './utils.js';

// 다크패턴 탐지 요청
export async function sendTextToServer(textData, mockServerUrl) {
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
export function removeBlurEffects() {
    const elements = document.querySelectorAll('[style*="blur"]');
    elements.forEach(element => {
        element.style.filter = '';
    });
}
