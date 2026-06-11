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
  const query = (window.__chatSearchQuery || '').trim().toLowerCase();
  let list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);

  // v0.9.6: 搜索过滤（标题 + 消息内容全文）
  if (query) {
    list = list.filter(c => {
      if ((c.title || '').toLowerCase().includes(query)) return true;
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) {
          if (typeof m.content === 'string' && m.content.toLowerCase().includes(query)) return true;
        }
      }
      return false;
    });
  }

  if (list.length === 0) {
    const emptyMsg = query
      ? `<div class="empty-history" style="text-align:center;padding:24px"><div style="opacity:0.5;margin-bottom:8px">未找到「${escapeHtml(query)}」</div><div style="font-size:12px;opacity:0.4">已搜索 ${Object.keys(conversations).length} 条对话</div></div>`
      : '<div class="empty-history"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:8px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><br>还没有对话记录<br>开始你的第一次对话吧</div>';
    chatHistoryList.innerHTML = emptyMsg;
    return;
  }
  chatHistoryList.innerHTML = list.map(c => {
    const timeStr = formatTime(c.updatedAt);
    const isActive = c.id === currentConversationId;
    // v0.9.6: 搜索命中时高亮匹配片段
    let titleHtml = escapeHtml(c.title);
    if (query) {
      const lowerTitle = (c.title || '').toLowerCase();
      const idx = lowerTitle.indexOf(query);
      if (idx >= 0) {
        const before = escapeHtml(c.title.slice(0, idx));
        const hit = escapeHtml(c.title.slice(idx, idx + query.length));
        const after = escapeHtml(c.title.slice(idx + query.length));
        titleHtml = `${before}<mark class="chat-search-hit">${hit}</mark>${after}`;
      }
    }
    return `<div class="chat-list-item ${isActive ? 'active' : ''}" onclick="switchConversation('${c.id}')">
      <span class="chat-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span class="chat-title">${titleHtml}</span>
      <span class="chat-time">${timeStr}</span>
      <span class="chat-delete" onclick="event.stopPropagation();deleteConversation('${c.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
      </span>
    </div>`;
  }).join('');
}

// v0.9.6: 对话搜索 ==========
function onChatSearchInput(e) {
  window.__chatSearchQuery = e.target.value;
  renderChatHistory();
  const clearBtn = document.getElementById('chatSearchClear');
  if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
}
function clearChatSearch() {
  const input = document.getElementById('chatSearchInput');
  if (input) input.value = '';
  window.__chatSearchQuery = '';
  renderChatHistory();
  const clearBtn = document.getElementById('chatSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';
}
if (typeof window !== 'undefined') {
  window.onChatSearchInput = onChatSearchInput;
  window.clearChatSearch = clearChatSearch;
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