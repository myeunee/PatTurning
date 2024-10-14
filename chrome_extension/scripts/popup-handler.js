const priceUrl = "YOUR_PRICE_API";

function sendMessage(action, successMessage, failureMessage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error('No active tabs found');
            updateStatus("활성 탭을 찾을 수 없습니다.");
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError.message);
                updateStatus("다크 패턴 탐지 OFF");              
                return;
            }

            console.log('Received response:', response);

            if (response) {
                if (response.status === "success") {
                    updateStatus(successMessage);
                } else {
                    updateStatus(failureMessage);
                }
            } else {
                updateStatus("다크 패턴 탐지 ON");   
            }
        });
    });
}


function updateStatus(message) {
    const statusElement = document.getElementById('status3');
    if (statusElement) {
        statusElement.innerText = message;
    } else {
        console.error("[팝업핸들러] Status element not found in the DOM.");
    }
}



const switchElement = document.getElementById('switch');

switchElement.addEventListener('change', (event) => {
    if (event.target.checked) {
        // detectDarkPatterns 활성화
        chrome.storage.local.set({ darkPatternDetection: true }, () => {
            sendMessage("detectDarkPatterns", "다크 패턴이 감지되었습니다.", "다크 패턴이 감지되지 않았습니다.");
        });
    } else {
        // releaseDarkPatterns 비활성화
        chrome.storage.local.set({ darkPatternDetection: false }, () => {
            sendMessage("releaseDarkPatterns", "다크 패턴이 해제되었습니다.", "다크 패턴을 해제할 수 없습니다.");
        });
    }
});


// 체크된 버튼의 라벨 값 관리
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const labelFiltersDiv = document.getElementById('label-filters');
    const switchInput = document.getElementById('switch');

    // 스위치 초기 상태에 따라 체크박스 표시 제어
    chrome.storage.local.get('darkPatternDetection', (result) => {
        if (result.darkPatternDetection === true) {
            switchInput.checked = true;
            labelFiltersDiv.style.display = 'block'; // 스위치가 켜져 있으면 체크박스 표시
        } else {
            switchInput.checked = false;
            labelFiltersDiv.style.display = 'none'; // 스위치가 꺼져 있으면 체크박스 숨김
        }
    });

    // 스위치 상태에 따라 체크박스 표시 제어
    switchInput.addEventListener('change', () => {
        if (switchInput.checked) {
            labelFiltersDiv.style.display = 'block';  // 스위치가 켜지면 체크박스들 표시
        } else {
            labelFiltersDiv.style.display = 'none';   // 스위치가 꺼지면 체크박스들 숨김
        }
    });

    // 체크박스 상태 변경 이벤트 처리
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedLabels = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));
            chrome.storage.local.set({ 'checkedLabels': checkedLabels }, () => {
                console.log('Selected labels:', checkedLabels);
            });
        });
    });
});



// 다크패턴 전송 기능 핸들러
document.getElementById("sendButton").addEventListener("click", async () => {
    const userInput = document.getElementById("userInput").value;
    
    if (userInput) {
        try {
            const response = await fetch(`${priceUrl}/save-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: userInput }),
            });
            
            if (response.ok) {
                alert('다크패턴 접수가 완료되었습니다.');  // 전송 성공 알림
            } else {
                alert('다크패턴 접수에 실패했습니다.');  // 전송 실패 알림
            }
        } catch (error) {
            alert('Error: ' + error.message);  // 에러 발생 시 알림
            console.error('Error:', error);
        }
    } else {
        alert('다크패턴으로 추정되는 텍스트를 입력하세요!');
    }
});
