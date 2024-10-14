(async function() {
    // 메시지를 받아서 차트를 그리는 함수
    window.addEventListener('message', (event) => {
        if (event.source !== window || event.data.type !== 'RENDER_CHART') return;

        const data = event.data.data;
        renderPriceChart(data);  // 메시지를 받아 차트 렌더링
    });

    // <canvas> 요소가 존재하는지 확인하고 없으면 동적으로 추가
    function ensureCanvasElement(data) {
        return new Promise((resolve) => {
            let canvas = document.getElementById('priceChart');

            // <canvas>가 존재하지 않으면 동적으로 추가
            if (!canvas) {
                console.log('[ensureCanvasElement] 캔버스 요소를 찾지 못 함. 동적으로 추가하는 중.');

                // 기존에 존재하는 priceHistoryBox가 있다면 제거
                const existingBox = document.querySelector('.priceChart');
                if (existingBox) {
                    existingBox.remove();
                }

                // 새로운 div와 canvas 요소를 생성하여 추가
                const container = document.createElement('div');
                container.id = 'priceChartContainer';
                container.style.width = '400px';
                container.style.height = '450px';
                container.style.position = 'absolute';  // 상단 오른쪽 배치를 위해 position을 absolute로 설정
                container.style.top = '300px';  // 상단에서 떨어지도록
                container.style.right = '100px';  // 오른쪽에서 떨어지도록
                container.style.zIndex = '1000';  // 차트가 다른 요소들 위에 나타나도록 z-index 설정
                container.style.backgroundColor = '#fff';  // 배경을 흰색으로 설정 (필요에 따라 수정 가능)
                container.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';  // 그림자 추가

                // X 버튼
                const closeButton = document.createElement('button');
                closeButton.innerHTML = '&times;'; // X 표시
                closeButton.style.position = 'absolute';
                closeButton.style.top = '5px';
                closeButton.style.right = '10px';
                closeButton.style.border = 'none';
                closeButton.style.background = 'none';
                closeButton.style.fontSize = '20px';
                closeButton.style.cursor = 'pointer';
                closeButton.onclick = function() {
                    container.remove();
                };

                // 박스에 X 버튼 추가
                container.appendChild(closeButton);

                // 제목
                const title = document.createElement('h3');
                title.style.textAlign = 'center';
                title.style.fontSize = '24px';
                title.textContent = '💡 가격 변동 그래프 💡';
                title.style.marginBottom = '8px';
                title.style.fontFamily = 'Pretendard';

                // 부제목
                const subTitle = document.createElement('p');
                subTitle.style.textAlign = 'center';
                subTitle.style.color = '#808080';
                subTitle.style.fontSize = '15px';
                subTitle.style.marginBottom = '15px';
                subTitle.textContent = '지금이 최적의 구매 타이밍인지 알아보세요!'; 
                subTitle.style.fontFamily = 'Pretendard'; 

                // 가격차 요소 생성 (초기에는 빈 값으로 설정)
                const priceDiffTextElement = document.createElement('h3');
                priceDiffTextElement.className = 'price-difference';
                priceDiffTextElement.style.textAlign = 'center';
                priceDiffTextElement.style.fontSize = '18px';
                priceDiffTextElement.style.marginBottom = '18px';
                priceDiffTextElement.style.fontFamily = 'Pretendard';
                container.appendChild(title);
                container.appendChild(subTitle);
                container.appendChild(priceDiffTextElement);

                canvas = document.createElement('canvas');
                canvas.id = 'priceChart';  // <canvas>의 ID 설정
                canvas.width = 400;
                canvas.height = 270;

                container.appendChild(canvas);
                document.body.appendChild(container);  // body에 추가

                // 통계 요소 생성 (초기에는 빈 값으로 설정)
                updatePriceStats(container, data);

                // DOM에 추가된 후 resolve 호출하여 렌더링 가능
                setTimeout(() => resolve(canvas), 100);  // 짧은 지연 후 resolve 호출
            } else {
                resolve(canvas);  // 이미 존재하면 즉시 resolve
            }
        });
    }

    // 차트 렌더링 함수
    async function renderPriceChart(data) {
        console.log("[renderPriceChart] 차트 렌더링할 데이터:", data);  // 데이터 로그 출력
        const prices = data.prices;

        if (!prices || prices.length === 0) {
            console.error('[renderPriceChart] 가격 데이터 없음');
            return;
        }

        // 날짜와 시간을 분리하여 라벨 생성
        const labels = prices.map(item => Object.keys(item)[0].split(',')[0]); // "2024-09-24" 형식의 날짜만 추출
        console.log('************** 라벨:', labels);
        const uniqueLabels = [...new Set(labels)];  // 중복 제거해서 날짜만 남김
        console.log('************** 라벨:', uniqueLabels);
        
        const values = prices.map(item => Object.values(item)[0]); // 가격
        const avgPrice = data.avg; // 평균가


        // 같은 날짜 내에서 시간 구분이 필요하면 그 날짜에 작은 그리드를 추가
        const timeSegments = prices.reduce((acc, item) => {
            const [date, time] = Object.keys(item)[0].split(',');
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(time);  // 해당 날짜에 시간을 저장
            return acc;
        }, {});

        // ensureCanvasElement가 canvas를 준비할 때까지 기다림
        const canvas = await ensureCanvasElement(data);
        console.log('[renderPriceChart] 캔버스 요소 찾음');  // Canvas가 제대로 추가된 후 로그 출력

        // 텍스트 요소 업데이트
        updateTextElements(data);

        if (window.priceChartInstance) {
            window.priceChartInstance.destroy();
        }
        window.priceChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: prices.map((item, index) => {
                    const date = Object.keys(item)[0].split(',')[0];
                    const prevDate = prices[index - 1] ? Object.keys(prices[index - 1])[0].split(',')[0] : null;
        
                    // 이전 데이터와 날짜가 같으면 라벨을 비워둠 (시간 생략)
                    return date === prevDate ? '' : date;
                }),
                datasets: [{
                    data: values,
                    borderColor: '#0000ff',  // 기본 선 색상
                    pointBackgroundColor: '#0000ff',
                    pointBorderColor: '#0000ff',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,  // 기본 fill을 비활성화
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            display: true,
                            drawOnChartArea: true,
                            color: '#000',  // 기본 그리드는 날짜별로 표시
                            lineWidth: 1,   // 큰 그리드 선
                        },
                        ticks: {
                            autoSkip: false,  // 모든 라벨 표시 (빈 라벨은 생략)
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '가격 (원)',
                        },
                        grid: {
                            drawOnChartArea: true,
                            drawTicks: true,
                        },
                    }
                },
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            // 툴팁에서 시간까지 표시
                            label: function(context) {
                                const label = context.label;
                                const dataPoint = prices[context.dataIndex];
                                const time = Object.keys(dataPoint)[0].split(',')[1];  // 시간 추출
                                const value = context.raw;
                                return `시간: ${time}, 가격: ${value} 원`;
                            }
                        }
                    },
                    legend: {
                        display: false  // 라벨 비활성화
                    }
                }
            },
            plugins: [{
                id: 'fillBetweenGraphAndAvg',
                beforeDatasetsDraw(chart) {
                    const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;

                    ctx.save();

                    const avgY = y.getPixelForValue(avgPrice);  // 평균값의 Y 좌표 계산
                    const meta = chart.getDatasetMeta(0);
                    const points = meta.data;

                    ctx.beginPath();
                    ctx.moveTo(points[0].x, avgY);  // 시작점을 평균선에서 시작

                    points.forEach((point, index) => {
                        const nextPoint = points[index + 1] || point;

                        // 그래프 선이 평균선을 가로지를 때 교차 지점을 계산
                        if ((point.y < avgY && nextPoint.y > avgY) || (point.y > avgY && nextPoint.y < avgY)) {
                            const intersectionX = point.x + (nextPoint.x - point.x) * ((avgY - point.y) / (nextPoint.y - point.y));

                            ctx.lineTo(point.x, point.y);  // 현재 포인트까지 채우기
                            ctx.lineTo(intersectionX, avgY);  // 교차 지점으로 채우기
                            ctx.closePath();

                            // 색상 채우기
                            if (point.y < avgY) {
                                ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';  // 파란색
                            } else {
                                ctx.fillStyle = 'rgba(242, 69, 95, 0.3)';  // 빨간색
                            }
                            ctx.fill();

                            ctx.beginPath();  // 새 경로 시작
                            ctx.moveTo(intersectionX, avgY);
                        }

                        // 현재 포인트와 다음 포인트에 대해 fill 처리
                        if (point.y < avgY) {
                            ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';  // 파란색 fill
                        } else {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';  // 빨간색 fill
                        }

                        ctx.lineTo(point.x, point.y);
                        ctx.lineTo(nextPoint.x, nextPoint.y);
                    });

                    // 마지막으로 평균선과 연결하여 영역을 닫고 fill
                    ctx.lineTo(points[points.length - 1].x, avgY);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }
            },
        {
            id: 'adjustDataSpacingForSameDate',
            beforeDatasetsDraw: function(chart) {
                const xScale = chart.scales.x;
                const datasetMeta = chart.getDatasetMeta(0);
                
                // 이전 날짜와 비교하면서 같은 날짜일 경우 작은 간격으로 배치
                let sameDateGroupStartIndex = null;
                let uniqueDates = [];
                prices.forEach((item, index) => {
                    const [date] = Object.keys(item)[0].split(',');
                    const nextItem = prices[index + 1] ? Object.keys(prices[index + 1])[0].split(',') : null;
    
                    // 같은 날짜가 시작되는 지점 기록
                    if (!uniqueDates.includes(date)) {
                        uniqueDates.push(date);
                    }
    
                    // 같은 날짜가 끝나면 간격을 좁게 설정
                    if (sameDateGroupStartIndex === null && nextItem && nextItem[0] === date) {
                        sameDateGroupStartIndex = index;
                    }
    
                    if (sameDateGroupStartIndex !== null && (!nextItem || nextItem[0] !== date)) {
                        const startX = xScale.getPixelForValue(uniqueDates.indexOf(date));
                        const endX = xScale.getPixelForValue(uniqueDates.indexOf(date) + 1);
    
                        // 같은 날짜 그룹 안에서 작은 간격으로 데이터 포인트 배치
                        const smallSpacing = (endX - startX) / (index - sameDateGroupStartIndex + 2);  // 좁은 간격 적용
    
                        for (let i = sameDateGroupStartIndex; i <= index; i++) {
                            const point = datasetMeta.data[i];
                            point.x = startX + (i - sameDateGroupStartIndex) * smallSpacing;
                        }
    
                        // 그룹 초기화
                        sameDateGroupStartIndex = null;
                    }
                });
            }
        }]
        });

    // 차트 렌더링 완료 로그 추가
    console.log('[renderPriceChart] 차트 렌더링 끝');
}

// 텍스트 요소 업데이트 함수
function updateTextElements(data) {
    const avgPrice = data.avg;

    // 현재 가격과 평균 가격 비교
    const prices = data.prices;
    const latestPrice = prices[prices.length - 1][Object.keys(prices[prices.length - 1])[0]];
    let priceDifferenceText = '';

    if (latestPrice > avgPrice) {
        const percentage = ((latestPrice - avgPrice) / avgPrice) * 100;
        priceDifferenceText = `현재 가격이 평균보다 <span style="color: #0000ff;">${percentage.toFixed(2)}%</span> 비쌉니다.`;
    } else if (latestPrice < avgPrice) {
        const percentage = ((avgPrice - latestPrice) / avgPrice) * 100;
        priceDifferenceText = `현재 가격이 평균보다 <span style="color: #0000ff;">${percentage.toFixed(2)}%</span> 쌉니다.`;
    } else {
        priceDifferenceText = `현재 가격이 <span style="color: #0000ff;">평균과 동일</span>합니다.`;
    }

    // 가격차 텍스트 요소 업데이트
    const priceDiffTextElement = document.querySelector('#priceChartContainer h3.price-difference');
    if (priceDiffTextElement) {
        priceDiffTextElement.innerHTML = priceDifferenceText;
    }

    // 평균, 최저, 최고가 업데이트
    updatePriceStats(document.getElementById('priceChartContainer'), data);
}

// 통계 업데이트 함수
function updatePriceStats(container, data) {
    const avgPrice = data.avg;
    const minPrice = data.min;
    const maxPrice = data.max;

    // 통계 요소가 이미 존재하면 제거
    const existingStats = container.querySelector('.price-stats');
    if (existingStats) {
        existingStats.remove();  // 기존 통계 요소를 제거
    }

    // 통계 요소 생성
    const priceStats = document.createElement('p');
    priceStats.className = 'price-stats';
    priceStats.style.textAlign = 'center';
    priceStats.style.fontFamily = 'Pretendard';
    priceStats.style.fontSize = '13px';
    priceStats.innerHTML = `
        <p style="color: #000000;"> 🔥 평균가: ${avgPrice} 원</p>
        <p style="color: #0000ff;"> 🔥 최저가: ${minPrice} 원</p>
        <p style="color: #d2691e;"> 🔥 최대가: ${maxPrice} 원</p>
    `;
    container.appendChild(priceStats);
}

})();
