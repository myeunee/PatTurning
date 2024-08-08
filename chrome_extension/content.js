function getElementXPath(element) {
  if (!(element instanceof Element)) return null;

  const paths = [];
  for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
    let index = 1

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

function sendTextToServer(textData) {
  fetch('http://localhost:3000/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ textData: textData })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Success:', data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'extractText') {
    const textData = extractTextWithXPath();
    sendTextToServer(textData);
    sendResponse({ textData: textData });
  } else {
    console.error('Unknown action:', request.action);
  }
});
