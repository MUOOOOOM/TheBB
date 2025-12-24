document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const API_BASE_URL = '/api';
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');

    // Auth Check
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.role !== 'admin') {
        alert('관리자 로그인이 필요합니다.');
        window.location.href = '/login.html';
        return;
    }

    const authFetch = (url, options = {}) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });
    };

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            // Active Style
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('bg-rose-50', 'text-rose-500'));
            item.classList.add('bg-rose-50', 'text-rose-500');

            if (page === 'clinics') loadClinics();
            if (page === 'approvals') loadApprovals(); 
            if (page === 'users') loadUsers();
            if (page === 'promotions') loadPromotions();
            if (page === 'financials') loadFinancials();
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    async function loadUsers() {
        pageTitle.textContent = '일반 회원 관리';
        contentArea.innerHTML = '<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div></div>';

        try {
            const res = await authFetch(`${API_BASE_URL}/admin/users`);
            const data = await res.json();
            contentArea.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">총 ${data.length}명의 회원이 있습니다.</div>`;
        } catch (e) { contentArea.innerHTML = '<p class="text-red-500">데이터 로드 실패</p>'; }
    }

    // --- Approval Management (Clinics) ---
    async function loadApprovals() {
        pageTitle.textContent = '입점 승인 관리';
        contentArea.innerHTML = '<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div></div>';

        try {
            const res = await authFetch(`${API_BASE_URL}/admin/clinics`);
            const all = await res.json();
            const data = all.filter(c => c.status === 'pending');

            if (data.length === 0) {
                contentArea.innerHTML = `
                    <div class="bg-white p-10 rounded-xl text-center border border-gray-100 shadow-sm">
                        <i data-lucide="check-circle" class="w-12 h-12 text-green-500 mx-auto mb-3"></i>
                        <p class="text-gray-600 font-medium">대기 중인 입점 신청이 없습니다.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            contentArea.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 bg-yellow-50">
                        <h3 class="font-bold text-yellow-700">승인 대기 병원 (${data.length})</h3>
                    </div>
                    <div class="divide-y divide-gray-100">
                        ${data.map(c => `
                            <div class="p-6">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="text-lg font-bold text-gray-900">${c.clinic_name}</h4>
                                        <div class="mt-2 text-sm text-gray-600">
                                            <p>이메일: ${c.owner_email}</p>
                                            <p>전화: ${c.phone}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="updateClinicStatus(${c.id}, 'active')" class="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm">승인</button>
                                        <button onclick="updateClinicStatus(${c.id}, 'rejected')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">반려</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch(e) { contentArea.innerHTML = '로드 실패'; }
    }

    window.updateClinicStatus = async (id, status) => {
        await authFetch(`${API_BASE_URL}/admin/clinics/${id}/status`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status })
        });
        loadApprovals();
    };

    async function loadFinancials() {
        pageTitle.textContent = '매출 및 정산';
        const res = await authFetch(`${API_BASE_URL}/admin/wallet_tx`);
        const data = await res.json();
        const rows = data.map(t => `
            <tr class="border-b">
                <td class="p-4">${t.email}</td>
                <td class="p-4">${t.type}</td>
                <td class="p-4 font-bold ${t.amount < 0 ? 'text-red-500' : 'text-blue-500'}">${t.amount.toLocaleString()}원</td>
                <td class="p-4 text-xs text-gray-400">${t.created_at}</td>
            </tr>
        `).join('');
        contentArea.innerHTML = `<div class="bg-white rounded-xl shadow overflow-hidden"><table class="w-full text-left"><thead><tr class="bg-gray-50"><th class="p-4">대상</th><th class="p-4">유형</th><th class="p-4">금액</th><th class="p-4">일시</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    async function loadClinics() {
        pageTitle.textContent = '병원 입점 관리';
        const res = await authFetch(`${API_BASE_URL}/admin/clinics`);
        const data = await res.json();
        const rows = data.map(c => `
            <tr class="border-b">
                <td class="p-4 font-bold">${c.clinic_name}</td>
                <td class="p-4">${c.owner_email}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${c.status}</span></td>
            </tr>
        `).join('');
        contentArea.innerHTML = `<div class="bg-white rounded-xl shadow overflow-hidden"><table class="w-full text-left"><tbody>${rows}</tbody></table></div>`;
    }

    async function loadPromotions() {
        pageTitle.textContent = '이벤트 & 상위노출';
        const res = await authFetch(`${API_BASE_URL}/admin/promotions`);
        const data = await res.json();
        contentArea.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${data.map(e => `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                    <p class="font-bold text-gray-900">${e.title}</p>
                    <p class="text-xs text-gray-400">${e.clinic_name || '관리자'}</p>
                </div>
                <button onclick="togglePromo(${e.id}, ${e.featured})" class="px-3 py-1 rounded-full text-xs font-bold ${e.featured ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}">
                    ${e.featured ? '상위노출중' : '일반'}
                </button>
            </div>
        `).join('')}</div>`;
    }

    window.togglePromo = async (id, current) => {
        await authFetch(`${API_BASE_URL}/admin/events/${id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ featured: !current })
        });
        loadPromotions();
    };

    loadApprovals();
});
