// ========== 信封明信片组件（v0.9.9.4）==========
// 主聊天区欢迎气泡上方挂的「来自小纸船」信封。
// 克制、可关闭、版本感知。
// 文档：codingplan-chat-project / references/letter-card-component-pattern.md

(function () {
  'use strict';

  // === localStorage keys ===
  const ACK_KEY = 'codingplan-letter-acked';
  const DISMISSED_MAJOR_KEY = 'codingplan-letter-dismissed-major';

  // === 版本绑定（同步自 02-onboarding.js 的 ONB_CURRENT_VERSION）===
  const CURRENT_FULL_VER = (typeof window !== 'undefined' && window.ONB_CURRENT_VERSION)
    || 'v0.9.9.4';
  // 大版本：v0.9.9.4 → '0.9'
  const CURRENT_MAJOR = (() => {
    const m = CURRENT_FULL_VER.match(/^v?(\d+)\.(\d+)/);
    return m ? `${m[1]}.${m[2]}` : '0.9';
  })();

  // === 显示判断 ===
  function shouldShowLetter() {
    if (localStorage.getItem(DISMISSED_MAJOR_KEY) === CURRENT_MAJOR) return false;
    if (localStorage.getItem(ACK_KEY) === CURRENT_FULL_VER) return false;
    return true;
  }
  function ackLetter() { localStorage.setItem(ACK_KEY, CURRENT_FULL_VER); }
  function dismissLetterForever() { localStorage.setItem(DISMISSED_MAJOR_KEY, CURRENT_MAJOR); }

  // === 当前版本寄语（信封长条标签用）===
  function getCurrentQuote() {
    if (window.VERSION_QUOTES && window.VERSION_QUOTES[CURRENT_FULL_VER]) {
      return window.VERSION_QUOTES[CURRENT_FULL_VER];
    }
    return '';
  }

  // === 渲染闭合态长条（顶栏正下方，作为浮层一族；只显示寄语，不可展开）===
  function renderClosedBar() {
    const container = document.getElementById('letterContainer');
    if (!container) return;
    if (!shouldShowLetter()) {
      container.innerHTML = '';
      container.style.display = 'none';
      document.body.classList.remove('letter-visible');
      return;
    }
    const quote = getCurrentQuote();
    container.style.display = 'block';
    document.body.classList.add('letter-visible');
    container.innerHTML = `
      <div class="letter-bar" id="letterBar" aria-label="来自小纸船 · ${quote}">
        <span class="letter-bar-label">来自小纸船 · ${quote}</span>
        <button type="button" class="letter-bar-close" id="letterBarClose" title="不再提示" aria-label="不再提示">×</button>
      </div>
    `;

    const closeBtn = document.getElementById('letterBarClose');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissLetterForever();
      container.innerHTML = '';
      container.style.display = 'none';
      document.body.classList.remove('letter-visible');
    });
  }

  // === 渲染展开态弹层 ===
  function openLetterModal() {
    // 如果已经存在则不重建
    if (document.getElementById('letterModal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'letter-modal-overlay';
    overlay.id = 'letterModal';
    overlay.innerHTML = `
      <div class="letter-modal" role="dialog" aria-labelledby="letterModalTitle">
        <button type="button" class="letter-modal-close" id="letterModalClose" title="不再提示" aria-label="不再提示">×</button>
        <div class="letter-modal-header">
          <span class="letter-modal-icon">✉</span>
          <span class="letter-modal-title" id="letterModalTitle">来自小纸船</span>
        </div>
        <div class="letter-modal-body">
          <p>这是一艘小船，载着这个时代<br>最新的几位 AI。</p>
          <ul class="letter-promises">
            <li>它不要钱</li>
            <li>它不收你说过的话</li>
            <li>它用你自己的 API Key 在跑</li>
          </ul>
          <p>拿好这艘船，<br>去你想去的地方。</p>
        </div>
        <div class="letter-modal-sig">
          <span>— 写于 2026</span>
          <span class="letter-modal-sig-name">schlesimu</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 进场动画
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const closeModal = (permanent) => {
      if (permanent) dismissLetterForever();
      else ackLetter();
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        // 关闭后刷新闭合态长条（acked → 不再显示）
        renderClosedBar();
      }, 220);
    };

    // 点 × = 永久关闭整个大版本
    document.getElementById('letterModalClose').addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(true);
    });
    // 点遮罩 = 标记已读（不永久）
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(false);
    });
    // ESC = 标记已读
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal(false);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // === 初始化挂载 ===
  function initLetter() {
    // v0.9.9.4 二次修正：信封是顶栏正下方的浮层一族（与 .header / .input-area 同级），
    // 不再作为消息流的一员，避免被新消息推走。挂在 #app-main 顶层。
    let container = document.getElementById('letterContainer');
    if (!container) {
      const appMain = document.getElementById('app-main');
      const chatArea = document.getElementById('chatArea');
      if (!appMain && !chatArea) return;
      container = document.createElement('div');
      container.id = 'letterContainer';
      // 优先 app-main（与顶栏同级），fallback chatArea.parentNode
      (appMain || chatArea.parentNode).appendChild(container);
    }
    renderClosedBar();
  }

  // 等启动页关闭后再渲染（避免启动页同屏出现）
  function bootLetter() {
    // 启动页未关闭 → 等
    const onb = document.getElementById('onboarding');
    if (onb && !onb.classList.contains('hidden') && onb.style.display !== 'none') {
      // 监听启动页隐藏
      const obs = new MutationObserver(() => {
        if (onb.classList.contains('hidden') || onb.style.display === 'none') {
          obs.disconnect();
          setTimeout(initLetter, 500);
        }
      });
      obs.observe(onb, { attributes: true, attributeFilter: ['class', 'style'] });
      return;
    }
    initLetter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLetter);
  } else {
    bootLetter();
  }

  // 暴露给外部 / 调试
  window.LetterCard = {
    show: openLetterModal,
    refresh: renderClosedBar,
    ack: ackLetter,
    dismiss: dismissLetterForever,
    reset: () => {
      localStorage.removeItem(ACK_KEY);
      localStorage.removeItem(DISMISSED_MAJOR_KEY);
      renderClosedBar();
    }
  };
})();
