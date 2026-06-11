// ========== 侧边栏 ==========
// (拆自 index.html v0.8.4)

function isDesktop() {
  return window.innerWidth >= 768 && window.innerWidth > window.innerHeight;
}
function openSidebar() {
  if (isDesktop()) return; // 横屏/电脑模式不操作
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  renderChatHistory();
}
function closeSidebar() {
  if (isDesktop()) return; // 横屏/电脑模式不操作
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

let touchStartX = 0;
sidebar.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
sidebar.addEventListener('touchmove', (e) => {
  if (!isDesktop() && e.touches[0].clientX - touchStartX < -50) closeSidebar();
});

// 监听窗口变化，横屏自动展开/竖屏收起
window.addEventListener('resize', () => {
  if (isDesktop()) {
    sidebar.classList.add('open');
    sidebarOverlay.classList.remove('open');
  } else {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  }
});

function renderChatHistory() {
  const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
  if (list.length === 0) {
    chatHistoryList.innerHTML = '<div class="empty-history"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:8px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><br>还没有对话记录<br>开始你的第一次对话吧</div>';
    return;
  }
  chatHistoryList.innerHTML = list.map(c => {
    const timeStr = formatTime(c.updatedAt);
    const isActive = c.id === currentConversationId;
    return `<div class="chat-list-item ${isActive ? 'active' : ''}" onclick="switchConversation('${c.id}')">
      <span class="chat-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span class="chat-title">${escapeHtml(c.title)}</span>
      <span class="chat-time">${timeStr}</span>
      <span class="chat-delete" onclick="event.stopPropagation();deleteConversation('${c.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
      </span>
    </div>`;
  }).join('');
}

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff/86400000) + '天前';
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ========== 对话管理 ==========