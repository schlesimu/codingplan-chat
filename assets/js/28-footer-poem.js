/* v0.9.10.3：彩蛋诗句「拖拽跟随」交互
 *
 * 旧 v0.9.10.0 是阈值二态切换（一下弹出来），手感不好。
 * 新版改为：手指按住屏幕往上拽，那行诗实时跟着手指走，拽多少露多少。
 *
 * 触发条件：
 *   1. 聊天容器 #chatArea 已经滚到最底（再无可滚的内容）
 *   2. 手指继续从下往上拖动（touchmove deltaY < 0）
 *
 * 跟手机制（核心）：
 *   - touchmove 时计算 pull = clamp(-deltaY / FULL_PULL_PX, 0, 1)
 *   - 直接写 CSS 变量 --poem-pull = pull，逐帧贴手位移
 *   - 跟手期间给元素加 .is-pulling 禁用 transition，避免插值漂移
 *
 * 松手判定（touchend）：
 *   - pull >= COMMIT_THRESHOLD（如 0.4）→ 完整露出 (1)，停留 1.8s 自动回 0
 *   - pull <  COMMIT_THRESHOLD → 立即弹回 0（弹簧感）
 *
 * 桌面 wheel：保留旧版"已到底再向下滚 → 完整露出 1.8s"行为，因为鼠标没法拖。
 */
(function () {
  'use strict';

  const FULL_PULL_PX = 60;          // 拖到这个距离就到 100%
  const COMMIT_THRESHOLD = 0.4;     // 松手时 pull 超过这个比例就保留露出
  const HOLD_AFTER_COMMIT_MS = 1800;
  const BOTTOM_TOLERANCE = 6;
  const REENTER_GUARD_MS = 200;     // 触发 commit 后短暂保护，防止指头还没抬起就被判 cancel

  let chat = null;
  let poemEl = null;
  let touchStartY = null;
  let isAtBottom = false;
  let currentPull = 0;
  let holdTimer = 0;
  let lastCommitTs = 0;

  function checkAtBottom() {
    if (!chat) return false;
    isAtBottom = (chat.scrollHeight - chat.scrollTop - chat.clientHeight) <= BOTTOM_TOLERANCE;
    return isAtBottom;
  }

  function setPull(p, withTransition) {
    if (!poemEl) return;
    const v = Math.max(0, Math.min(1, p));
    currentPull = v;
    if (withTransition) {
      poemEl.classList.remove('is-pulling');
    } else {
      poemEl.classList.add('is-pulling');
    }
    poemEl.style.setProperty('--poem-pull', v.toFixed(3));
  }

  function commitFullReveal() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    setPull(1, true);
    lastCommitTs = Date.now();
    holdTimer = setTimeout(() => {
      setPull(0, true);
      holdTimer = 0;
    }, HOLD_AFTER_COMMIT_MS);
  }

  function springBack() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    setPull(0, true);
  }

  // ====== 触摸：跟手拖拽 ======
  function onTouchStart(e) {
    if (!chat) return;
    checkAtBottom();
    // 不在底部时不响应，让原生滚动接管
    if (!isAtBottom) {
      touchStartY = null;
      return;
    }
    touchStartY = e.touches?.[0]?.clientY ?? null;
    // 不立刻进入跟手态：等真的 touchmove 出现负 delta 再切
  }

  function onTouchMove(e) {
    if (touchStartY == null || !isAtBottom) return;
    const y = e.touches?.[0]?.clientY ?? null;
    if (y == null) return;
    const deltaY = y - touchStartY;     // 上拉 → 负
    if (deltaY >= 0) {
      // 反向拖（往下）：把 pull 拉回 0，让用户能"推回去"
      if (currentPull > 0) setPull(0, false);
      return;
    }
    const pull = Math.min(1, -deltaY / FULL_PULL_PX);
    setPull(pull, false);
  }

  function onTouchEnd() {
    touchStartY = null;
    if (currentPull >= COMMIT_THRESHOLD) {
      commitFullReveal();
    } else if (currentPull > 0) {
      springBack();
    }
  }

  function onTouchCancel() {
    touchStartY = null;
    // 如果系统中断时已经基本拉到位，仍当 commit；否则弹回
    if (currentPull >= COMMIT_THRESHOLD) commitFullReveal();
    else springBack();
  }

  // ====== 滚动：滚出底部就立刻收回 ======
  function onScroll() {
    checkAtBottom();
    if (!isAtBottom && currentPull > 0) {
      // 快滚走，立刻回 0（不等 hold 计时）
      // 但保护 commit 后短暂窗口，避免触屏抬手前抖动滚动把它吞掉
      if (Date.now() - lastCommitTs > REENTER_GUARD_MS) {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
        setPull(0, true);
      }
    }
  }

  // ====== 桌面 wheel：已到底再向下滚 → 完整露出（鼠标没法拖，沿用阈值式）======
  function onWheel(e) {
    if (!chat) return;
    checkAtBottom();
    if (isAtBottom && e.deltaY > 0 && currentPull < 1) {
      commitFullReveal();
    }
  }

  function init() {
    chat = document.getElementById('chatArea');
    if (!chat) {
      chat = document.scrollingElement || document.documentElement;
    }
    poemEl = document.querySelector('.world-footer-poem');
    if (!poemEl) {
      console.warn('[footer-poem] .world-footer-poem 未找到');
      return;
    }
    // 初始化为 0
    setPull(0, false);

    chat.addEventListener('scroll', onScroll, { passive: true });
    chat.addEventListener('touchstart', onTouchStart, { passive: true });
    chat.addEventListener('touchmove', onTouchMove, { passive: true });
    chat.addEventListener('touchend', onTouchEnd, { passive: true });
    chat.addEventListener('touchcancel', onTouchCancel, { passive: true });
    chat.addEventListener('wheel', onWheel, { passive: true });

    checkAtBottom();

    // 调试钩子
    window.__footerPoem = {
      version: 'v0.9.10.3',
      FULL_PULL_PX, COMMIT_THRESHOLD, HOLD_AFTER_COMMIT_MS,
      setPull, commitFullReveal, springBack,
      get pull() { return currentPull; },
      get isAtBottom() { return isAtBottom; },
    };
    console.log('[footer-poem] v0.9.10.3 拖拽跟随版已就绪 · 滑到底再上拉，诗句跟手走');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
