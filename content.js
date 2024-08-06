// content.js
console.log('Content script loaded');

function extractText() {
  const bodyText = document.body.innerText;
  console.log('Extracted text:', bodyText);
  return bodyText;
}

function sendTextToServer(text) {
  fetch('http://localhost:3000/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: text })
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
    const text = extractText();
    sendTextToServer(text);
    sendResponse({ text: text });
  } else {
    console.error('Unknown action:', request.action);
  }
});
