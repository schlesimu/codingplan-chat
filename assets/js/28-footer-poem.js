/* v0.9.10.0：彩蛋诗句下拉露出
 *
 * 默认藏在屏幕下方（CSS bottom: -36px / opacity: 0）。
 * 触发条件：
 *   - 聊天容器 #chatArea 已经滚到底（scrollBottom < 4px）
 *   - 用户继续从下往上拖（touchmove deltaY < -REVEAL_PX）
 *   - 或鼠标 wheel 向下滚（已到底再滚）
 * 触发后给 body 加 .poem-revealed → CSS 把 poem 升到 bottom: 8px。
 * 松手 / 离开聊天区 / 滚回去就移除 class，poem 滑回藏起。
 */
(function () {
  'use strict';

  const REVEAL_PX = 60;          // 上拉超过 60px 触发显示
  const HIDE_DELAY_MS = 1800;    // 显示后多久自动收回
  const BOTTOM_TOLERANCE = 6;    // 距底部多少 px 算"到底"

  let chat = null;
  let touchStartY = null;
  let isAtBottom = false;
  let hideTimer = 0;
  let wheelHideTimer = 0;

  function checkAtBottom() {
    if (!chat) return false;
    isAtBottom = (chat.scrollHeight - chat.scrollTop - chat.clientHeight) <= BOTTOM_TOLERANCE;
    return isAtBottom;
  }

  function reveal() {
    document.body.classList.add('poem-revealed');
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    hideTimer = setTimeout(() => {
      document.body.classList.remove('poem-revealed');
      hideTimer = 0;
    }, HIDE_DELAY_MS);
  }

  function hideNow() {
    document.body.classList.remove('poem-revealed');
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
  }

  function onScroll() {
    checkAtBottom();
    // 向上滚出底部 → 藏起来
    if (!isAtBottom && document.body.classList.contains('poem-revealed')) {
      hideNow();
    }
  }

  // 触摸：在聊天区已到底的情况下继续上拉
  function onTouchStart(e) {
    if (!chat) return;
    checkAtBottom();
    touchStartY = e.touches?.[0]?.clientY ?? null;
  }
  function onTouchMove(e) {
    if (touchStartY == null || !isAtBottom) return;
    const y = e.touches?.[0]?.clientY ?? null;
    if (y == null) return;
    const deltaY = y - touchStartY;     // 上拉 → 负
    if (deltaY <= -REVEAL_PX && !document.body.classList.contains('poem-revealed')) {
      reveal();
    }
  }
  function onTouchEnd() {
    touchStartY = null;
  }

  // 鼠标 wheel：已到底再向下滚
  function onWheel(e) {
    if (!chat) return;
    checkAtBottom();
    if (isAtBottom && e.deltaY > 0) {
      reveal();
    }
  }

  function init() {
    chat = document.getElementById('chatArea');
    if (!chat) {
      // 没找到聊天容器：监听整页（首屏没消息时也能玩）
      chat = document.scrollingElement || document.documentElement;
    }
    chat.addEventListener('scroll', onScroll, { passive: true });
    chat.addEventListener('touchstart', onTouchStart, { passive: true });
    chat.addEventListener('touchmove', onTouchMove, { passive: true });
    chat.addEventListener('touchend', onTouchEnd, { passive: true });
    chat.addEventListener('wheel', onWheel, { passive: true });
    // 启动时也校准一下
    checkAtBottom();

    // 调试钩子
    window.__footerPoem = {
      version: 'v0.9.10.0',
      REVEAL_PX, HIDE_DELAY_MS,
      reveal, hideNow,
      get isAtBottom() { return isAtBottom; },
      get isRevealed() { return document.body.classList.contains('poem-revealed'); },
    };
    console.log('[footer-poem] v0.9.10.0 已就绪 · 滑到底再上拉', REVEAL_PX, 'px 露出');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
