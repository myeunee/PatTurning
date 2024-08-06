// popup.js
document.getElementById('extract').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractText' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          document.getElementById('output').textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else {
          if (response && response.text) {
            document.getElementById('output').textContent = response.text;
          } else {
            console.error('Response error: Response is undefined or missing text.');
            document.getElementById('output').textContent = 'Error: Response is undefined or missing text.';
          }
        }
      });
    } else {
      console.error('No active tabs found');
      document.getElementById('output').textContent = 'Error: No active tabs found';
    }
  });
});
