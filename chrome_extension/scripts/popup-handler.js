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
                updateStatus("다크 패턴 탐지 스위치 OFF");              
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
                updateStatus("다크 패턴 탐지 스위치 ON");   
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
const labelFiltersContainer = document.getElementById('label-filters-container'); // label-filters-container 가져오기

switchElement.addEventListener('change', (event) => {
    if (event.target.checked) {
        // detectDarkPatterns 활성화
        chrome.storage.local.set({ darkPatternDetection: true }, () => {
            sendMessage("detectDarkPatterns", "다크 패턴 탐지 스위치 ON", "다크 패턴 탐지 스위치 ON");
            labelFiltersContainer.style.display = 'block'; // 스위치가 켜져 있으면 label-filters-container 보이기
        });
    } else {
        // releaseDarkPatterns 비활성화
        chrome.storage.local.set({ darkPatternDetection: false }, () => {
            sendMessage("releaseDarkPatterns", "다크 패턴 탐지 스위치 OFF", "다크 패턴 탐지 스위치 OFF");
            labelFiltersContainer.style.display = 'none'; // 스위치가 꺼져 있으면 label-filters-container 숨기기
        });
    }
});

// 체크된 버튼의 라벨 값 관리
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const labelFiltersContainer = document.getElementById('label-filters-container');
    const switchInput = document.getElementById('switch');

    // 기본 상태를 ON으로 설정하고, 체크박스 모두 선택
    chrome.storage.local.get(['darkPatternDetection', 'checkedLabels'], (result) => {
        const darkPatternDetection = result.darkPatternDetection !== undefined ? result.darkPatternDetection : true;
        const checkedLabels = result.checkedLabels || [1, 2, 3, 4];

        switchInput.checked = darkPatternDetection;
        labelFiltersContainer.style.display = darkPatternDetection ? 'block' : 'none';

        checkboxes.forEach(checkbox => {
            checkbox.checked = checkedLabels.includes(parseInt(checkbox.value));
        });

        if (darkPatternDetection) {
            // 스위치가 켜져 있으면 기능 실행
            sendMessage("detectDarkPatterns", "다크 패턴 탐지 스위치 ON", "다크 패턴 탐지 스위치 ON");
        }
    });

    // 스위치 상태 변경 시 모든 체크박스와 기능 켜기/끄기
    switchInput.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        chrome.storage.local.set({ darkPatternDetection: isChecked }, () => {
            if (isChecked) {
                checkboxes.forEach(checkbox => checkbox.checked = true);
                chrome.storage.local.set({ checkedLabels: [1, 2, 3, 4] }, () => {
                    sendMessage("detectDarkPatterns", "다크 패턴 탐지 스위치 ON", "다크 패턴 탐지 스위치 ON");
                    labelFiltersContainer.style.display = 'block';
                });
            } else {
                checkboxes.forEach(checkbox => checkbox.checked = false);
                chrome.storage.local.set({ checkedLabels: [] }, () => {
                    sendMessage("releaseDarkPatterns", "다크 패턴 탐지 스위치 OFF", "다크 패턴 탐지 스위치 OFF");
                    labelFiltersContainer.style.display = 'none';
                });
            }
        });
    });

    // 체크박스 상태 변경 시 해당 기능 바로 실행/해제
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedLabels = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));
            chrome.storage.local.set({ checkedLabels }, () => {
                console.log('Updated checked labels:', checkedLabels);
                // 각 체크박스 상태에 맞는 기능 실행 (추가 기능 구현 필요 시 여기에 추가)
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