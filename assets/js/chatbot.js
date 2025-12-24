document.addEventListener('DOMContentLoaded', () => {
    const chatbotHTML = `
        <div id="ai-chatbot-container" class="fixed bottom-6 right-6 z-50">
            <!-- Chat Icon -->
            <button id="chatbot-toggle-btn" class="bg-rose-500 text-white p-4 rounded-full shadow-lg hover:bg-rose-600 transition-all transform hover:scale-110 flex items-center justify-center">
                <i data-lucide="message-circle" class="w-8 h-8"></i>
            </button>

            <!-- Chat Window -->
            <div id="chatbot-window" class="hidden absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all origin-bottom-right transform scale-95 opacity-0">
                <!-- Header -->
                <div class="bg-rose-500 p-4 flex justify-between items-center text-white">
                    <div class="flex items-center gap-2">
                        <div class="bg-white/20 p-1.5 rounded-full"><i data-lucide="bot" class="w-5 h-5"></i></div>
                        <span class="font-bold text-sm">THE BB AI 상담원</span>
                    </div>
                    <button id="chatbot-close-btn" class="text-white/80 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <!-- Messages Area -->
                <div id="chatbot-messages" class="flex-1 p-4 h-80 overflow-y-auto bg-gray-50 space-y-3">
                    <div class="flex items-start gap-2">
                        <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
                        <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 text-sm text-gray-600 shadow-sm">
                            안녕하세요! 성형/시술 정보 플랫폼 THE BB입니다. 무엇을 도와드릴까요?
                        </div>
                    </div>
                    <div class="flex gap-2 pl-10">
                        <button onclick="sendQuickQuery('인기 시술 추천해줘')" class="text-xs bg-rose-50 text-rose-500 px-3 py-1.5 rounded-full hover:bg-rose-100">🔥 인기 시술 추천</button>
                        <button onclick="sendQuickQuery('병원 입점 문의')" class="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200">🏥 입점 문의</button>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="p-3 border-t border-gray-100 bg-white flex gap-2">
                    <input type="text" id="chatbot-input" class="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500" placeholder="궁금한 내용을 입력하세요...">
                    <button id="chatbot-send-btn" class="bg-rose-500 text-white p-2 rounded-lg hover:bg-rose-600 transition-colors">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const windowEl = document.getElementById('chatbot-window');
    const inputEl = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const messagesEl = document.getElementById('chatbot-messages');

    let isOpen = false;

    const toggleChat = () => {
        isOpen = !isOpen;
        if (isOpen) {
            windowEl.classList.remove('hidden');
            // Small delay for transition
            setTimeout(() => {
                windowEl.classList.remove('scale-95', 'opacity-0');
                windowEl.classList.add('scale-100', 'opacity-100');
            }, 10);
            inputEl.focus();
        } else {
            windowEl.classList.remove('scale-100', 'opacity-100');
            windowEl.classList.add('scale-95', 'opacity-0');
            setTimeout(() => windowEl.classList.add('hidden'), 300);
        }
    };

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    const addMessage = (text, isUser = false) => {
        const div = document.createElement('div');
        div.className = isUser ? 'flex items-end justify-end gap-2' : 'flex items-start gap-2';
        
        const content = isUser ? `
            <div class="bg-rose-500 p-3 rounded-2xl rounded-tr-none text-sm text-white shadow-sm max-w-[80%]">
                ${text}
            </div>
        ` : `
            <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
            <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 text-sm text-gray-600 shadow-sm max-w-[80%]">
                ${text}
            </div>
        `;

        div.innerHTML = content;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const handleSend = async () => {
        const text = inputEl.value.trim();
        if (!text) return;

        addMessage(text, true);
        inputEl.value = '';

        try {
            const res = await fetch('/api/bot/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text })
            });
            const data = await res.json();
            
            setTimeout(() => {
                addMessage(data.answer);
            }, 600);
        } catch (err) {
            setTimeout(() => {
                addMessage("죄송합니다. 서버와 통신 중 오류가 발생했습니다.");
            }, 600);
        }
    };

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    window.sendQuickQuery = (text) => {
        inputEl.value = text;
        handleSend();
    };
});
