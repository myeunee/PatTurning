// Xpath를 추출할 때, 더블 쿼트를 이스케이프 처리해 JSON 문자열로 전송될 때 문제가 없도록 하기
// 문자열의 더블 쿼트를 이스케이프(\") 처리
export function escapeXPath(xpath) {
    return xpath.replace(/\"/g, '\\"');
}

// 서버 응답으로 받은 xpath를 다시 원래 형태로 복원 후, 브라우저의 evaluate 함수로 전달
export function unescapeXPath(escapedXpath) {
    return escapedXpath.replace(/\\"/g, '"');
}

// 주어진 요소의 XPath를 생성하는 함수
export function getElementXPath(element) {
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
export function extractTextWithXPath() {
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
