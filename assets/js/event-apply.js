
document.addEventListener('DOMContentLoaded', () => {
    // --- 기본 설정 ---
    const API_BASE_URL = '/api';

    // --- DOM 요소 캐싱 ---
    const summaryContent = document.getElementById('summary-content');
    const summaryTotalPrice = document.getElementById('summary-total-price');
    const applyForm = document.getElementById('event-apply-form');
    const applyFormContainer = document.getElementById('apply-form-container');
    const applySuccess = document.getElementById('apply-success');
    const eventDetailsInput = document.getElementById('eventDetailsInput');

    // --- 유틸리티 함수 ---
    const formatPrice = (number) => {
        if (isNaN(number)) return "가격 문의";
        return `${Number(number).toLocaleString('ko-KR')}원`;
    };

    /**
     * URL 파라미터에서 신청 정보를 파싱하고 화면에 렌더링합니다.
     */
    const renderSummary = () => {
        const params = new URLSearchParams(window.location.search);
        const eventTitle = params.get('eventTitle');
        const basePrice = parseInt(params.get('basePrice'), 10);
        let options;
        try {
            options = JSON.parse(params.get('options'));
        } catch (e) {
            options = {};
        }

        if (!eventTitle) {
            summaryContent.innerHTML = '<p class="text-red-500">잘못된 접근입니다. 이벤트 페이지에서 다시 시도해주세요.</p>';
            applyForm.querySelector('button[type="submit"]').disabled = true;
            return;
        }

        let totalPrice = basePrice;
        let summaryHtml = `<div class="flex justify-between"><span class="text-gray-600">기본 시술: ${eventTitle}</span> <span>${formatPrice(basePrice)}</span></div>`;
        
        const eventDetails = {
            eventTitle,
            basePrice,
            selectedOptions: [],
        };
        
        summaryHtml += '<div class="pl-4 mt-2 border-l-2 border-gray-200 space-y-1">';
        let hasOptions = false;

        for (const optionName in options) {
            const selected = options[optionName];
            if (Array.isArray(selected) && selected.length > 0) { // 체크박스
                hasOptions = true;
                selected.forEach(item => {
                    summaryHtml += `<div class="flex justify-between text-gray-500"><span class="ml-2">└ ${item.label}</span> <span>+ ${formatPrice(item.price)}</span></div>`;
                    totalPrice += item.price;
                    eventDetails.selectedOptions.push({ name: optionName, label: item.label, price: item.price });
                });
            } else if (selected && selected.price > 0) { // 라디오, 셀렉트 (가격이 0 이상인 경우만 표시)
                hasOptions = true;
                summaryHtml += `<div class="flex justify-between text-gray-500"><span class="ml-2">└ ${selected.label}</span> <span>+ ${formatPrice(selected.price)}</span></div>`;
                totalPrice += selected.price;
                eventDetails.selectedOptions.push({ name: optionName, label: selected.label, price: selected.price });
            }
        }
        
        if (!hasOptions) {
            summaryHtml += '<p class="text-gray-400 ml-2">선택된 추가 옵션이 없습니다.</p>';
        }
        
        summaryHtml += '</div>';

        summaryContent.innerHTML = summaryHtml;
        summaryTotalPrice.textContent = formatPrice(totalPrice);
        eventDetails.totalPrice = totalPrice;

        // 숨겨진 input에 JSON 형태로 전체 신청 내역 저장
        eventDetailsInput.value = JSON.stringify(eventDetails);
    };

    /**
     * 시술 신청 폼 제출 핸들러
     */
    const handleEventApplySubmit = async (e) => {
        e.preventDefault();
        const submitButton = applyForm.querySelector('button[type="submit"]');
        const formData = new FormData(applyForm);
        
        // FormData에서 개인정보 부분만 추출
        const personalData = {
            name: formData.get('name'),
            contact: formData.get('contact'),
            preferredTime: formData.get('preferredTime'),
            inquiry: formData.get('inquiry'),
            privacyConsent: formData.get('privacyConsent'),
        };

        // 숨겨진 input에서 이벤트 상세 정보 가져오기
        const eventDetails = JSON.parse(eventDetailsInput.value);

        // 두 데이터를 합쳐서 최종 전송 데이터 생성
        const finalData = {
            ...personalData,
            eventDetails: eventDetails,
        };

        // 유효성 검사
        if (!finalData.name || !finalData.contact) {
            alert('필수 항목(이름, 연락처)을 입력해주세요.');
            return;
        }
        if (!finalData.privacyConsent) {
            alert('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        submitButton.disabled = true;
        submitButton.querySelector('.button-text').textContent = '제출 중...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/event-apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });
            const result = await response.json();

            if (response.ok && result.success) {
                applyFormContainer.classList.add('hidden');
                applySuccess.classList.remove('hidden');
            } else {
                throw new Error(result.message || '알 수 없는 오류');
            }
        } catch (error) {
            alert(`신청 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.querySelector('.button-text').textContent = '신청 완료하기';
        }
    };

    // --- 초기화 ---
    renderSummary();
    applyForm.addEventListener('submit', handleEventApplySubmit);
});
