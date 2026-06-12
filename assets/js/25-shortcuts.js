// ============================================================
// 25-shortcuts.js — v0.9.9.3 桌面快捷键
//
// 设计原则：
//   1. 跨平台：Mac 用 ⌘、Win/Linux 用 Ctrl，event.metaKey || event.ctrlKey
//   2. 移动端不显示 ⌨️ 入口（min-width:768 才挂图标）
//   3. 快捷键面板自动检测系统，渲染对应符号
//   4. Esc 永远关最上层弹窗（栈式管理：先关快捷键面板 → 再关其他 modal）
//   5. ↑ 编辑上一条只在输入框为空时触发，否则放行给浏览器
//   6. 在表单字段（input/textarea）里，Cmd+B 这类全局键依然生效
//      但浏览器原生快捷键（Cmd+R 刷新、Cmd+W 关 tab）一律不拦
// ============================================================

(function () {
  'use strict';

  // ---- 平台判断 ----
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';
  const ALT_KEY = IS_MAC ? '⌥' : 'Alt';
  const SHIFT_KEY = IS_MAC ? '⇧' : 'Shift';

  window.IS_MAC = IS_MAC;
  window.SHORTCUT_MOD_LABEL = MOD_KEY;

  // ---- 快捷键定义 ----
  // 改这里就能加新键。handler 收到 (event)，返回 true 表示已处理（preventDefault）。
  const SHORTCUTS = [
    {
      keys: ['k'],
      mod: true,
      label: `${MOD_KEY} + K`,
      desc: '新建对话',
      handler: () => {
        if (typeof window.newConversation === 'function') {
          window.newConversation();
          return true;
        }
        return false;
      },
    },
    {
      keys: ['b'],
      mod: true,
      label: `${MOD_KEY} + B`,
      desc: '开关侧边栏',
      handler: () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return false;
        // 桌面端走 desktop 折叠（v0.9.9.3 新增）
        if (typeof window.toggleDesktopSidebar === 'function' && window.innerWidth >= 768 && window.innerWidth > window.innerHeight) {
          window.toggleDesktopSidebar();
          return true;
        }
        // 移动端走原有 open/close
        if (sidebar.classList.contains('open')) {
          if (typeof window.closeSidebar === 'function') window.closeSidebar();
        } else {
          if (typeof window.openSidebar === 'function') window.openSidebar();
        }
        return true;
      },
    },
    {
      keys: [','],
      mod: true,
      label: `${MOD_KEY} + ,`,
      desc: '打开 API Key / 设置',
      handler: () => {
        if (typeof window.showApiKeyDialog === 'function') {
          window.showApiKeyDialog();
          return true;
        }
        return false;
      },
    },
    {
      keys: ['/'],
      mod: true,
      label: `${MOD_KEY} + /`,
      desc: '显示/关闭快捷键面板',
      handler: () => {
        toggleShortcutsModal();
        return true;
      },
    },
    {
      keys: ['Escape'],
      mod: false,
      label: 'Esc',
      desc: '关闭最上层弹窗 / 取消',
      handler: () => closeTopMostOverlay(),
    },
    {
      keys: ['ArrowUp'],
      mod: false,
      label: '↑',
      desc: '编辑上一条消息（仅当输入框为空）',
      onlyInEmptyInput: true,
      handler: () => editLastUserMessage(),
    },
  ];

  // ---- 关闭最上层弹窗（Esc 用） ----
  function closeTopMostOverlay() {
    // 优先级 1：快捷键面板
    const shortcutsModal = document.getElementById('shortcutsModal');
    if (shortcutsModal && shortcutsModal.style.display !== 'none' && shortcutsModal.offsetParent !== null) {
      hideShortcutsModal();
      return true;
    }

    // 优先级 2：高 z-index 的 overlay（找 z-index >= 9000 且 fixed 且可见的最后一个）
    const candidates = [...document.querySelectorAll('div')].filter((el) => {
      if (!el.parentElement) return false;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') return false;
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const z = parseInt(cs.zIndex);
      if (isNaN(z) || z < 9000) return false;
      return true;
    });
    if (candidates.length > 0) {
      // 取 z-index 最高那个（最上层）
      candidates.sort((a, b) => parseInt(getComputedStyle(b).zIndex) - parseInt(getComputedStyle(a).zIndex));
      const top = candidates[0];
      // 寻找关闭按钮：常见模式 .close / [onclick*="remove"] / [onclick*="close"]
      const closeBtn = top.querySelector('button.close, .close-btn, [data-close], [onclick*="overlay.remove"], [onclick*="this.remove"], [onclick*="closeAbout"], [onclick*="close"]');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      // 兜底：直接 remove overlay
      top.remove();
      return true;
    }

    // 优先级 3：侧边栏打开就先关侧边栏
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      if (typeof window.closeSidebar === 'function') window.closeSidebar();
      return true;
    }

    return false;
  }

  // ---- 编辑上一条消息（↑ 用） ----
  function editLastUserMessage() {
    const userMsgs = [...document.querySelectorAll('.msg.user')];
    if (userMsgs.length === 0) return false;
    const last = userMsgs[userMsgs.length - 1];
    // 寻找编辑按钮（既有产品里 msgops 编辑按钮通常带 onclick="editMsg(...)" 或 data-action="edit"）
    const editBtn = last.querySelector('[onclick*="editMsg"], [data-action="edit"], .msg-edit-btn');
    if (editBtn) {
      editBtn.click();
      return true;
    }
    // 没有编辑按钮就把内容塞回输入框（fallback）
    const bubble = last.querySelector('.bubble');
    const input = document.getElementById('userInput');
    if (bubble && input) {
      input.value = bubble.textContent.trim();
      input.focus();
      // 触发 autosize
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }

  // ---- 主事件监听 ----
  function onKeyDown(e) {
    // 忽略组合修饰键单独按下
    if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt' || e.key === 'Shift') return;

    const targetTag = (e.target && e.target.tagName) || '';
    const isInInput = ['INPUT', 'TEXTAREA'].includes(targetTag) || (e.target && e.target.isContentEditable);
    const inputEl = document.getElementById('userInput');
    const inputIsEmpty = inputEl && inputEl.value.trim() === '';

    const usesMod = e.metaKey || e.ctrlKey;

    for (const sc of SHORTCUTS) {
      // 修饰键匹配
      if (sc.mod && !usesMod) continue;
      if (!sc.mod && usesMod && sc.keys[0] !== 'Escape' && sc.keys[0] !== 'ArrowUp') continue;

      // 键名匹配（大小写不敏感）
      const matched = sc.keys.some((k) => {
        if (k.length === 1) return e.key.toLowerCase() === k.toLowerCase();
        return e.key === k;
      });
      if (!matched) continue;

      // 「输入框为空」约束
      if (sc.onlyInEmptyInput) {
        if (!isInInput) continue; // 必须在输入框内
        if (!inputIsEmpty) continue; // 输入框得为空
      }

      // 触发
      try {
        const handled = sc.handler(e);
        if (handled !== false) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        console.warn('[shortcuts] handler error:', err);
      }
      return;
    }
  }

  document.addEventListener('keydown', onKeyDown, true);

  // ============================================================
  // 快捷键面板
  // ============================================================
  function buildShortcutsModalHTML() {
    const rows = SHORTCUTS.map((sc) => {
      const keys = sc.label.split(' + ').map((k) => `<kbd>${escapeHTML(k)}</kbd>`).join('<span class="sc-plus">+</span>');
      return `
        <div class="sc-row">
          <div class="sc-keys">${keys}</div>
          <div class="sc-desc">${escapeHTML(sc.desc)}</div>
        </div>`;
    }).join('');

    // Enter / Shift+Enter 这两个写死在输入框，单独提一行
    const builtins = `
      <div class="sc-row">
        <div class="sc-keys"><kbd>Enter</kbd></div>
        <div class="sc-desc">发送消息</div>
      </div>
      <div class="sc-row">
        <div class="sc-keys"><kbd>${SHIFT_KEY}</kbd><span class="sc-plus">+</span><kbd>Enter</kbd></div>
        <div class="sc-desc">输入框换行</div>
      </div>`;

    return `
      <div id="shortcutsModal" class="sc-modal" style="display:none">
        <div class="sc-backdrop" data-close></div>
        <div class="sc-card" role="dialog" aria-modal="true" aria-labelledby="scTitle">
          <div class="sc-head">
            <h3 id="scTitle">键盘快捷键</h3>
            <button class="sc-close" data-close aria-label="关闭">✕</button>
          </div>
          <div class="sc-section-title">输入框</div>
          ${builtins}
          <div class="sc-section-title">全局</div>
          ${rows}
          <div class="sc-foot">
            <span class="sc-platform">${IS_MAC ? '检测到 macOS — 使用 ⌘' : '检测到 Windows / Linux — 使用 Ctrl'}</span>
          </div>
        </div>
      </div>`;
  }

  function ensureShortcutsModal() {
    if (document.getElementById('shortcutsModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = buildShortcutsModalHTML();
    document.body.appendChild(wrap.firstElementChild);
    // 绑定关闭
    document.querySelectorAll('#shortcutsModal [data-close]').forEach((el) => {
      el.addEventListener('click', hideShortcutsModal);
    });
  }

  function showShortcutsModal() {
    ensureShortcutsModal();
    const m = document.getElementById('shortcutsModal');
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('sc-visible'));
  }

  function hideShortcutsModal() {
    const m = document.getElementById('shortcutsModal');
    if (!m) return;
    m.classList.remove('sc-visible');
    setTimeout(() => { m.style.display = 'none'; }, 200);
  }

  function toggleShortcutsModal() {
    const m = document.getElementById('shortcutsModal');
    if (m && m.style.display !== 'none' && m.classList.contains('sc-visible')) {
      hideShortcutsModal();
    } else {
      showShortcutsModal();
    }
  }

  // ============================================================
  // 桌面端 ⌨️ 入口（注入到 .header-actions 末尾）
  // ============================================================
  function injectKeyboardButton() {
    if (document.getElementById('headerShortcutsBtn')) return;
    const slot = document.querySelector('.header-actions');
    if (!slot) return;
    const btn = document.createElement('button');
    btn.id = 'headerShortcutsBtn';
    btn.className = 'header-shortcuts-btn';
    btn.title = `键盘快捷键 (${MOD_KEY} + /)`;
    btn.setAttribute('aria-label', '键盘快捷键');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>';
    btn.addEventListener('click', toggleShortcutsModal);
    slot.appendChild(btn);
  }

  // ---- helpers ----
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- 启动 ----
  function init() {
    injectKeyboardButton();
    ensureShortcutsModal();
    // 桌面端 sidebar 折叠状态恢复（v0.9.9.3）
    try {
      if (localStorage.getItem('codingplan-sidebar-collapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- 桌面端侧边栏折叠（⌘/Ctrl + B 桌面分支调用） ----
  window.toggleDesktopSidebar = function () {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    try {
      localStorage.setItem('codingplan-sidebar-collapsed', collapsed ? '1' : '0');
    } catch (e) {}
    return collapsed;
  };

  // ---- 暴露给外部 ----
  window.showShortcutsModal = showShortcutsModal;
  window.hideShortcutsModal = hideShortcutsModal;
  window.toggleShortcutsModal = toggleShortcutsModal;
  window.SHORTCUTS_LIST = SHORTCUTS;
})();
