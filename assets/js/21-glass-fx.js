// ============================================================
// 21-glass-fx.js — v0.9.8.2 Liquid 视觉效果增强
// C1: 滚动联动玻璃强度
// C3: AI 流式回复打字余晖（在 06-render.js 流式入口里钩，本文件只提供 helper）
// ============================================================

// ---------- C1: 滚动联动玻璃强度 ----------
// 思路：监听 .chat-area 的 scroll，根据距顶/距底距离动态写两个 CSS 变量
//   --header-glass-extra: 0 ~ 0.6（顶部气泡接近时 header 玻璃变浓）
//   --input-glass-extra:  0 ~ 0.6（底部气泡接近时 input 玻璃变浓）
// CSS 用 calc() 把 extra 折算进 saturate / brightness
function _initGlassScrollFx() {
  if (typeof chatArea === 'undefined' || !chatArea) return;
  // 极简档 / reduce-motion 直接不挂监听
  if (document.body.classList.contains('fx-simple')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const PROBE_DIST = 120;  // 距 header/input 多少 px 内开始加深玻璃
  let raf = 0;

  function update() {
    raf = 0;
    const scrollTop = chatArea.scrollTop;
    const scrollH = chatArea.scrollHeight;
    const clientH = chatArea.clientHeight;
    const distToBottom = scrollH - scrollTop - clientH;
    // 没溢出时短对话，保持默认（extra=0）
    if (scrollH <= clientH + 4) {
      root.style.setProperty('--header-glass-extra', '0');
      root.style.setProperty('--input-glass-extra', '0');
      return;
    }
    // 顶部接近度（scrollTop 越大 = 顶部越多气泡藏在 header 下 = 玻璃越浓）
    const topRatio = Math.min(1, scrollTop / PROBE_DIST);
    // 底部接近度（distToBottom 越小 = 越靠底 = input 下越多气泡 = 玻璃越浓）
    const botRatio = Math.min(1, (PROBE_DIST - Math.min(PROBE_DIST, distToBottom)) / PROBE_DIST);
    root.style.setProperty('--header-glass-extra', topRatio.toFixed(2));
    root.style.setProperty('--input-glass-extra', botRatio.toFixed(2));
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(update);
  }

  chatArea.addEventListener('scroll', onScroll, { passive: true });
  // 内容变化（新消息/流式追加）也触发更新
  const ro = new ResizeObserver(onScroll);
  ro.observe(chatArea);
  // 初次跑一次
  update();
}

// ---------- C3: 流式打字余晖 helper ----------
// 给一段新追加的文字加 .streaming-glow span 包裹，0.5s 后自动恢复
// 由 06-render.js 在流式追加新字符时调用（如果集成）
function applyStreamGlow(textNode) {
  if (!textNode) return;
  if (document.body.classList.contains('fx-simple')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // 给元素加 streaming-glow 类，CSS 用 animation 自动恢复
  textNode.classList.add('streaming-glow');
  setTimeout(() => textNode.classList.remove('streaming-glow'), 600);
}

// ---------- 入口 ----------
document.addEventListener('DOMContentLoaded', () => {
  // 等 chatArea 真正存在再挂（onboarding 同意后才显示 #app-main）
  // 用 setTimeout 让其它 init 先跑完
  setTimeout(_initGlassScrollFx, 100);
});
