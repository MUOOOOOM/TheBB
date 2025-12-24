// TheBB Platform Core Logic
const API_BASE_URL = '/api';

// --- Auth Utilities ---
const getAuthToken = () => localStorage.getItem("token");
const getAuthUser = () => JSON.parse(localStorage.getItem("user") || "null");

const updateAuthUI = () => {
    const user = getAuthUser();
    const containers = document.querySelectorAll("#auth-menu-container");
    
    containers.forEach(container => {
        if (!user) {
            container.innerHTML = `
                <a href="/login.html" class="text-sm font-semibold text-gray-500 hover:text-rose-500 transition">로그인</a>
                <a href="/signup.html" class="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition">회원가입</a>
            `;
        } else {
            let dashboardLink = "./index.html";
            if (user.role === "admin") dashboardLink = "./admin/admin.html";
            else if (user.role === "clinic") dashboardLink = "./clinic_dashboard.html";

            container.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-sm font-bold text-gray-700">${user.name}님</span>
                    <a href="${dashboardLink}" class="text-sm font-semibold text-rose-500 hover:underline">대시보드</a>
                    <button onclick="handleLogout()" class="text-xs font-bold text-gray-400 hover:text-gray-600">로그아웃</button>
                </div>
            `;
        }
    });
};

const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/index.html";
};

window.handleLogout = handleLogout;

// --- Event Rendering ---
async function renderEventsPage() {
    const grid = document.getElementById("event-grid");
    if (!grid) return;

    try {
        const res = await fetch(`${API_BASE_URL}/events`);
        const events = await res.json();

        if (events.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-center py-20 text-gray-400">등록된 이벤트가 없습니다.</p>';
            return;
        }

        grid.innerHTML = events.map(ev => `
            <a href="./event-detail.html?id=${ev.id}"
               class="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition transform hover:-translate-y-1">
              <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img src="${ev.image_url}"
                     class="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                     onerror="this.src='/assets/images/events/placeholder.jpg'"/>
              </div>
              <div class="p-5">
                <div class="text-xs text-rose-500 font-bold mb-1 uppercase tracking-wider">${ev.category}</div>
                <div class="text-lg font-extrabold text-gray-900 mb-2 truncate">${ev.title}</div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                    <span class="text-xs text-gray-400">${ev.clinic_name || 'THE BB'}</span>
                    <span class="text-xl text-rose-500 font-black">${Number(ev.price).toLocaleString()}원</span>
                </div>
              </div>
            </a>
        `).join("");
    } catch (err) {
        grid.innerHTML = '<p class="col-span-full text-center py-20 text-red-400">데이터를 불러오는데 실패했습니다.</p>';
    }
}

// --- Main Init ---
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    renderEventsPage();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});