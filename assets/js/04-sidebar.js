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
  // v0.9.8.1 A2: 置顶对话排前 + 时间倒序
  let list = Object.values(conversations).sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.updatedAt - a.updatedAt;
  });

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
    return `<div class="chat-list-item ${isActive ? 'active' : ''} ${c.pinned ? 'pinned' : ''}" data-conv-id="${c.id}" onclick="switchConversation('${c.id}')" oncontextmenu="event.preventDefault(); showConvContextMenu(event, '${c.id}')">
      <span class="chat-icon">
        ${c.pinned ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'}
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

// ============================================================
// v0.9.8.1 A1+: 搜索快捷键 + 键盘导航
//   ⌘K / Ctrl+K  →  聚焦搜索框（自动打开侧栏）
//   Escape       →  清空搜索 + 失焦
//   ↑/↓          →  在命中列表里切换选中项
//   Enter        →  打开选中的对话
// ============================================================
let __chatSearchSelectedIdx = -1;

function getSearchResultItems() {
  return Array.from(document.querySelectorAll('#chatHistoryList .chat-list-item'));
}

function highlightChatSearchSelected() {
  const items = getSearchResultItems();
  items.forEach((el, i) => {
    el.classList.toggle('search-selected', i === __chatSearchSelectedIdx);
    if (i === __chatSearchSelectedIdx) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

// 重写 onChatSearchInput：输入时重置选中索引
const __origOnChatSearchInput = onChatSearchInput;
onChatSearchInput = function(e) {
  __origOnChatSearchInput(e);
  __chatSearchSelectedIdx = e.target.value ? 0 : -1;
  highlightChatSearchSelected();
};
window.onChatSearchInput = onChatSearchInput;

function focusChatSearch() {
  const input = document.getElementById('chatSearchInput');
  if (!input) return;
  // 自动打开侧栏（手机端隐藏时）
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && window.innerWidth <= 768 && !sidebar.classList.contains('open')) {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
  input.focus();
  input.select();
}

document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const cmdK = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'k' || e.key === 'K');
  if (cmdK) {
    e.preventDefault();
    focusChatSearch();
    return;
  }
  // 下面的快捷键仅在搜索框聚焦时生效
  const input = document.getElementById('chatSearchInput');
  if (!input || document.activeElement !== input) return;

  const items = getSearchResultItems();
  if (e.key === 'Escape') {
    e.preventDefault();
    if (input.value) {
      clearChatSearch();
      __chatSearchSelectedIdx = -1;
      highlightChatSearchSelected();
    } else {
      input.blur();
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (items.length === 0) return;
    __chatSearchSelectedIdx = Math.min(__chatSearchSelectedIdx + 1, items.length - 1);
    if (__chatSearchSelectedIdx < 0) __chatSearchSelectedIdx = 0;
    highlightChatSearchSelected();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (items.length === 0) return;
    __chatSearchSelectedIdx = Math.max(__chatSearchSelectedIdx - 1, 0);
    highlightChatSearchSelected();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const target = items[__chatSearchSelectedIdx] || items[0];
    if (target) target.click();
  }
});

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ============================================================
// v0.9.8.1 A2: 对话右键菜单 / 长按 → 置顶 / 重命名 / 删除
// ============================================================
function showConvContextMenu(e, convId) {
  // 移除已存在的菜单
  const old = document.getElementById('conv-context-menu');
  if (old) old.remove();

  const c = conversations[convId];
  if (!c) return;

  const menu = document.createElement('div');
  menu.id = 'conv-context-menu';
  menu.className = 'conv-context-menu';
  menu.innerHTML = `
    <button class="conv-ctx-item" data-act="pin">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
      ${c.pinned ? '取消置顶' : '置顶'}
    </button>
    <button class="conv-ctx-item" data-act="rename">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      重命名
    </button>
    <div class="conv-ctx-divider"></div>
    <button class="conv-ctx-item conv-ctx-danger" data-act="delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
      删除
    </button>
  `;

  // 定位（避免超出视口）
  document.body.appendChild(menu);
  const x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 100);
  const y = (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 100);
  const rect = menu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - 8);
  const top = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';

  menu.querySelectorAll('.conv-ctx-item').forEach(btn => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const act = btn.dataset.act;
      menu.remove();
      if (act === 'pin') pinConversation(convId);
      else if (act === 'rename') renameConversation(convId);
      else if (act === 'delete') deleteConversation(convId);
    };
  });

  // 点击其他地方关闭
  setTimeout(() => {
    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', close);
        document.removeEventListener('contextmenu', close);
      }
    };
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
  }, 50);
}
window.showConvContextMenu = showConvContextMenu;

// 长按支持（手机端）：使用事件委托
let __convLongPressTimer = null;
let __convLongPressTarget = null;
document.addEventListener('touchstart', (e) => {
  const item = e.target.closest('.chat-list-item[data-conv-id]');
  if (!item) return;
  __convLongPressTarget = item;
  __convLongPressTimer = setTimeout(() => {
    const convId = item.dataset.convId;
    if (convId) {
      // 触觉反馈（部分浏览器支持）
      if (navigator.vibrate) navigator.vibrate(30);
      showConvContextMenu(e, convId);
    }
    __convLongPressTarget = null;
  }, 500);
}, { passive: true });
document.addEventListener('touchend', () => {
  if (__convLongPressTimer) {
    clearTimeout(__convLongPressTimer);
    __convLongPressTimer = null;
  }
}, { passive: true });
document.addEventListener('touchmove', () => {
  if (__convLongPressTimer) {
    clearTimeout(__convLongPressTimer);
    __convLongPressTimer = null;
  }
}, { passive: true });

function formatTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff/86400000) + '天前';
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ========== 对话管理 ==========