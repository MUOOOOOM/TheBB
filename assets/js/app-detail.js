
document.addEventListener('DOMContentLoaded', () => {
    // --- 기본 설정 ---
    const API_BASE_URL = '/api';
    const contentContainer = document.getElementById('event-detail-content');
    const loadingSkeleton = document.getElementById('loading-skeleton');

    let eventData = null; // 현재 이벤트 데이터 저장
    let selectedOptions = {}; // 선택된 옵션 저장

    /**
     * URL에서 이벤트 ID를 가져옵니다.
     * @returns {string|null} 이벤트 ID
     */
    const getEventId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    };

    /**
     * 숫자를 통화 형식(원)으로 포맷합니다.
     * @param {number} number - 포맷할 숫자
     * @returns {string} 포맷된 문자열 (예: "1,200,000원")
     */
    const formatPrice = (number) => {
        if (isNaN(number)) return "가격 문의";
        return `${number.toLocaleString('ko-KR')}원`;
    };
    
    /**
     * 총 가격을 다시 계산하고 화면에 업데이트합니다.
     */
    const updateTotalPrice = () => {
        if (!eventData || typeof eventData.basePrice !== 'number') return;

        let totalPrice = eventData.basePrice;

        // 선택된 옵션들의 가격을 합산
        for (const optionName in selectedOptions) {
            const selected = selectedOptions[optionName];
            if (Array.isArray(selected)) { // 체크박스
                selected.forEach(item => {
                    totalPrice += item.price;
                });
            } else if (selected) { // 라디오, 셀렉트
                totalPrice += selected.price;
            }
        }
        
        const totalPriceElement = document.getElementById('total-price');
        if (totalPriceElement) {
            totalPriceElement.textContent = formatPrice(totalPrice);
        }
    };


    /**
     * 서버에서 특정 이벤트 데이터를 가져와 페이지를 렌더링합니다.
     * @param {string} eventId - 가져올 이벤트의 ID
     */
    const fetchAndRenderEventDetail = async (eventId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status}`);
            }
            const result = await response.json();

            if (result.success) {
                eventData = result.data;
                document.title = `${eventData.title} - THE BB`; // 페이지 타이틀 업데이트
                renderEventDetail(eventData);
            } else {
                throw new Error(result.message || '이벤트 정보를 찾을 수 없습니다.');
            }

        } catch (error) {
            console.error('이벤트 상세 정보 로딩 실패:', error);
            contentContainer.innerHTML = `<div class="text-center text-red-500 p-10 bg-white rounded-lg shadow-lg"><h2>오류</h2><p>${error.message}</p><a href="events.html" class="mt-4 inline-block text-blue-500 hover:underline">목록으로 돌아가기</a></div>`;
        } finally {
            loadingSkeleton.style.display = 'none';
        }
    };

    /**
     * 가져온 이벤트 데이터를 기반으로 상세 페이지 HTML을 생성하고 삽입합니다.
     * @param {object} event - 렌더링할 이벤트 객체
     */
    const renderEventDetail = (event) => {
        // 메인 정보 섹션
        const mainInfoHtml = `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <img src="../${event.image}" alt="${event.title}" class="w-full h-80 object-cover" onerror="this.src='https://placehold.co/800x400/fee2e2/ef4444?text=Image+Not+Found'; this.onerror=null;">
                <div class="p-6 md:p-8">
                    <h1 class="text-3xl md:text-4xl font-bold text-gray-900">${event.title}</h1>
                    <p class="text-xl text-gray-600 mt-2">${event.price}</p>
                    <div class="prose max-w-none mt-6 text-gray-700">
                        ${(event.description || '').replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;

        // 옵션 선택 섹션
        let optionsHtml = '';
        if (event.options && event.options.length > 0) {
            const optionsContent = event.options.map(option => {
                let itemsHtml = '';
                switch (option.type) {
                    case 'radio':
                        itemsHtml = option.items.map((item, index) => `
                            <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input type="radio" name="${option.name}" value="${index}" class="h-4 w-4 text-rose-600 border-gray-300 focus:ring-rose-500" ${index === 0 ? 'checked' : ''}>
                                <span class="ml-3 text-sm text-gray-700">${item.label}</span>
                                <span class="ml-auto text-sm font-medium text-gray-800">${formatPrice(item.price)}</span>
                            </label>
                        `).join('');
                        break;
                    case 'checkbox':
                        itemsHtml = option.items.map((item, index) => `
                            <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" name="${option.name}" value="${index}" class="h-4 w-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500">
                                <span class="ml-3 text-sm text-gray-700">${item.label}</span>
                                <span class="ml-auto text-sm font-medium text-gray-800">${formatPrice(item.price)}</span>
                            </label>
                        `).join('');
                        break;
                    case 'select':
                         itemsHtml = `<select name="${option.name}" class="w-full p-3 border rounded-lg focus:ring-rose-500 focus:border-rose-500">` +
                            option.items.map((item, index) => `<option value="${index}">${item.label} (${formatPrice(item.price)})</option>`).join('') + 
                            `</select>`;
                        break;
                }
                return `
                    <div class="space-y-2">
                        <h3 class="text-md font-semibold text-gray-800">${option.name}</h3>
                        <div class="space-y-2">${itemsHtml}</div>
                    </div>
                `;
            }).join('');

            optionsHtml = `
                <div id="options-form" class="mt-6 bg-white rounded-lg shadow-lg p-6 md:p-8">
                    <h2 class="text-2xl font-bold mb-6">옵션 선택</h2>
                    <div class="space-y-6">${optionsContent}</div>
                </div>
            `;
        }

        // 최종 가격 및 신청 버튼
        const ctaHtml = `
            <div class="sticky bottom-0 bg-white/80 backdrop-blur-sm mt-6 rounded-t-lg shadow-t-lg p-4 border-t">
                <div class="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <p class="text-sm text-gray-600">최종 시술 금액</p>
                        <p id="total-price" class="text-2xl font-bold text-rose-600">${formatPrice(event.basePrice || 0)}</p>
                    </div>
                    <button id="apply-button" class="px-8 py-3 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 transition-colors shadow-lg">
                        이벤트 신청하기
                    </button>
                </div>
            </div>
        `;
        
        contentContainer.innerHTML = mainInfoHtml + optionsHtml + ctaHtml;

        // 옵션 변경 시 이벤트 리스너 등록
        const optionsForm = document.getElementById('options-form');
        if (optionsForm) {
            optionsForm.addEventListener('change', () => {
                selectedOptions = {}; // 선택 초기화
                event.options.forEach(option => {
                    const inputs = optionsForm.querySelectorAll(`[name="${option.name}"]`);
                    if (option.type === 'radio') {
                        const checked = optionsForm.querySelector(`[name="${option.name}"]:checked`);
                        if (checked) {
                            selectedOptions[option.name] = option.items[parseInt(checked.value)];
                        }
                    } else if (option.type === 'checkbox') {
                        selectedOptions[option.name] = [];
                        inputs.forEach(input => {
                            if (input.checked) {
                                selectedOptions[option.name].push(option.items[parseInt(input.value)]);
                            }
                        });
                    } else if (option.type === 'select') {
                         const selected = inputs[0];
                         selectedOptions[option.name] = option.items[parseInt(selected.value)];
                    }
                });
                updateTotalPrice();
            });
            // 초기 가격 계산을 위해 change 이벤트 트리거
            optionsForm.dispatchEvent(new Event('change'));
        }

        // 신청하기 버튼 이벤트 리스너
        document.getElementById('apply-button').addEventListener('click', () => {
            const params = new URLSearchParams({
                eventId: event.id,
                eventTitle: event.title,
                basePrice: event.basePrice,
                options: JSON.stringify(selectedOptions)
            });
            // 신청 폼 페이지로 이동
            window.location.href = `event-application.html?${params.toString()}`;
        });
    };

    // --- 초기화 ---
    const eventId = getEventId();
    if (eventId) {
        fetchAndRenderEventDetail(eventId);
    } else {
        loadingSkeleton.style.display = 'none';
        contentContainer.innerHTML = `<div class="text-center text-red-500 p-10 bg-white rounded-lg shadow-lg"><h2>잘못된 접근</h2><p>이벤트 ID가 지정되지 않았습니다.</p><a href="events.html" class="mt-4 inline-block text-blue-500 hover:underline">목록으로 돌아가기</a></div>`;
    }
});

// 메인 app.js와 충돌을 피하기 위해, 이 페이지에서만 사용하는 함수들을 여기에 둡니다.
// toggleMobileMenu는 다른 페이지에서도 사용될 수 있으므로 전역 스코프에 두는 것이 좋습니다.
// 하지만 이 프로젝트에서는 각 페이지가 독립적인 JS를 가지므로 여기에도 추가합니다.
window.toggleMobileMenu = () => {
    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenu) mobileMenu.classList.toggle('hidden');
};
