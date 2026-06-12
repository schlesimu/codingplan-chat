// ========== 首次欢迎页 v2 (v0.9.9.0「礼物三件套」) ==========
// 3 屏拆礼物式滑动 onboarding，老 finishOnboarding/checkOnboarding 接口保留兼容
// LocalStorage key:
//   codingplan-onboarded     (旧) - 是否完成过欢迎流程
//   codingplan-onb-version   (新) - 上次完成欢迎流程的大版本号
// 大版本（如 v0.9.9.0）变化时，老用户也会再次看到一次新版欢迎流程

const ONB_CURRENT_VERSION = 'v0.9.9.2';
let onbV2Step = 0;

function onbV2Next() {
  if (onbV2Step < 2) {
    onbV2SetStep(onbV2Step + 1);
  } else {
    finishOnboarding();
  }
}
function onbV2Prev() {
  if (onbV2Step > 0) onbV2SetStep(onbV2Step - 1);
}
function onbV2Skip() {
  finishOnboarding();
}

function onbV2SetStep(n) {
  onbV2Step = Math.max(0, Math.min(2, n));
  const track = document.getElementById('onbV2Track');
  if (track) track.setAttribute('data-step', String(onbV2Step));
  // 进度点
  document.querySelectorAll('.onb-v2-dot').forEach((d, i) => {
    d.classList.toggle('active', i === onbV2Step);
  });
  // 上一步按钮可见性
  const back = document.getElementById('onbV2Back');
  if (back) back.style.visibility = onbV2Step === 0 ? 'hidden' : 'visible';
  // 主按钮文案
  const next = document.getElementById('onbV2Next');
  if (next) {
    next.textContent = onbV2Step === 2 ? '启航 ⛵️' : '下一步 →';
  }
  // 跳过按钮在最后一屏隐藏
  const skip = document.getElementById('onbV2Skip');
  if (skip) skip.style.display = onbV2Step === 2 ? 'none' : '';
}

function finishOnboarding() {
  try {
    localStorage.setItem('codingplan-onboarded', '1');
    localStorage.setItem('codingplan-onb-version', ONB_CURRENT_VERSION);
  } catch (e) {}
  const onbV2 = document.getElementById('onbV2');
  const main = document.getElementById('app-main');
  const input = document.getElementById('userInput');
  if (onbV2) {
    onbV2.classList.add('fading-out');
    setTimeout(() => { onbV2.style.display = 'none'; }, 400);
  }
  if (main) main.classList.add('visible');
  if (input && typeof input.focus === 'function') {
    try { input.focus(); } catch (e) {}
  }
}

// 兼容老调用（旧版本可能还会触发）
function cancelOnboarding() {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-size:16px;background:#1a1a2e;">已取消，请刷新页面重新进入</div>';
}

function checkOnboarding() {
  // 已完成欢迎 + 已是当前大版本 → 跳过欢迎页
  let onboarded = false, lastVer = null;
  try {
    onboarded = localStorage.getItem('codingplan-onboarded') === '1';
    lastVer = localStorage.getItem('codingplan-onb-version');
  } catch (e) {}

  if (onboarded && lastVer === ONB_CURRENT_VERSION) {
    const onbV2 = document.getElementById('onbV2');
    const main = document.getElementById('app-main');
    if (onbV2) onbV2.style.display = 'none';
    if (main) main.classList.add('visible');
    return true;
  }
  // 老用户首次升到 v0.9.9.0 → 让他们也拆一次礼物
  return false;
}

// ========== 关于小纸船页 + 双页电子书翻页 ==========
function openAbout(target) {
  const page = document.getElementById('aboutPage');
  if (!page) return;
  page.classList.add('visible');
  try { document.body.style.overflow = 'hidden'; } catch (e) {}

  // 先确保 changelog 已渲染
  if (typeof renderChangelogPaper === 'function') {
    try { renderChangelogPaper(); } catch (e) {}
  }

  // 设置初始页（默认关于页；如果是 'changelog' 则翻到日志页）
  const book = document.getElementById('bookPages');
  if (book) {
    if (target === 'changelog') {
      // 不要立即翻：先无动画到 about，再下一帧翻到 changelog（保留翻页观感）
      book.style.transition = 'none';
      book.setAttribute('data-page', 'about');
      // 强制 reflow
      void book.offsetWidth;
      book.style.transition = '';
      requestAnimationFrame(() => {
        setTimeout(() => flipToChangelog(), 80);
      });
    } else {
      book.setAttribute('data-page', 'about');
    }
  }
}

function closeAbout(event, force) {
  if (!force && event && event.target.id !== 'aboutPage') return;
  const page = document.getElementById('aboutPage');
  if (!page) return;
  page.classList.remove('visible');
  try { document.body.style.overflow = ''; } catch (e) {}
}

function flipToChangelog() {
  const book = document.getElementById('bookPages');
  if (!book) return;
  book.classList.add('flipping');
  book.setAttribute('data-page', 'changelog');
  // 翻完后滚动 changelog 页到顶
  setTimeout(() => {
    book.classList.remove('flipping');
    const cl = book.querySelector('.book-page-back');
    if (cl) cl.scrollTop = 0;
    const ap = document.getElementById('aboutPage');
    if (ap) ap.scrollTop = 0;
  }, 950);
}

function flipToAbout() {
  const book = document.getElementById('bookPages');
  if (!book) return;
  book.classList.add('flipping');
  book.setAttribute('data-page', 'about');
  setTimeout(() => {
    book.classList.remove('flipping');
    const ap = document.getElementById('aboutPage');
    if (ap) ap.scrollTop = 0;
  }, 950);
}

// 旧别名兼容（v0.9.8.x 老调用）
function closeAboutAndShowChangelog() {
  // 现在: 直接在关于页内翻页，不关闭
  flipToChangelog();
}

// ========== 版本号长按彩蛋（寄语） ==========
const VERSION_QUOTES = {
  'v0.9.9.2': '把这艘船的来路一笔一笔写清楚，再交到你手里。',
  'v0.9.9.1': '把这艘船签上名字，递到你手里。',
  'v0.9.8.5': '瓷砖摆好了，等一个会用它聊天的你。',
  'v0.9.8.4': '小纸船终于学会了听你说话。',
  'v0.9.8.3': '给船起了名字，给船刻了花纹。',
  'v0.9.8': '让这艘船在三种天气里都好看。',
  'v0.9.7': '把船开进火山的洋流里。',
  'v0.9.5': '学会跨设备带着对话走。',
  'v0.9': '一艘正在试航的小船。',
  'v0.3.2': '今天起，我有名字了。',
  'v0.3.1': '这艘船的最后一天还没有名字。',
  'v0.1.0': '故事从这里开始。',
};

function showVersionQuote() {
  const ver = ONB_CURRENT_VERSION;
  const quote = VERSION_QUOTES[ver]
              || VERSION_QUOTES['v0.9']
              || '愿这艘小船陪你走过这个时代的开端。';

  // 移除已有的 toast
  const old = document.querySelector('.version-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = 'version-toast';
  toast.innerHTML =
    '<div class="toast-version">' + ver + ' 寄语</div>' +
    '<div class="toast-quote">「' + quote + '」</div>';
  document.body.appendChild(toast);
  // 触发 transition
  requestAnimationFrame(() => toast.classList.add('show'));
  // 3 秒后淡出
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

// 给版本号绑定短按 / 长按事件
//   短按（< 500ms） → 弹寄语 toast
//   长按（>= 500ms） → 弹反馈日志（用于报 bug）
function bindVersionLongPress() {
  const el = document.querySelector('.sidebar-version');
  if (!el || el._lpBound) return;
  el._lpBound = true;

  // 兜底清掉历史 inline onclick（短按行为已迁到这里统一处理）
  el.onclick = null;
  if (el.getAttribute('onclick')) el.removeAttribute('onclick');

  let timer = null;
  let longTriggered = false;
  const LONG_MS = 500;

  const start = () => {
    longTriggered = false;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      longTriggered = true;
      try { if (navigator.vibrate) navigator.vibrate(28); } catch (err) {}
      if (typeof window.showFeedbackLogDialog === 'function') {
        window.showFeedbackLogDialog();
      } else {
        alert('日志模块尚未加载');
      }
    }, LONG_MS);
  };
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);

  // 短按 → 弹寄语 toast（长按已触发则吃掉这次 click）
  el.addEventListener('click', (e) => {
    if (longTriggered) {
      e.preventDefault();
      e.stopPropagation();
      longTriggered = false;
      return;
    }
    showVersionQuote();
  }, true);

  // 提示文案
  el.setAttribute('title', '点击：寄语 ｜ 长按：抓取反馈日志');
}

// ========== 暴露到 window ==========
if (typeof window !== 'undefined') {
  window.onbV2Next = onbV2Next;
  window.onbV2Prev = onbV2Prev;
  window.onbV2Skip = onbV2Skip;
  window.finishOnboarding = finishOnboarding;
  window.cancelOnboarding = cancelOnboarding;
  window.checkOnboarding = checkOnboarding;
  window.openAbout = openAbout;
  window.closeAbout = closeAbout;
  window.flipToChangelog = flipToChangelog;
  window.flipToAbout = flipToAbout;
  window.closeAboutAndShowChangelog = closeAboutAndShowChangelog;
  window.showVersionQuote = showVersionQuote;
  window.bindVersionLongPress = bindVersionLongPress;
  window.ONB_CURRENT_VERSION = ONB_CURRENT_VERSION;
}

// 页面加载后绑定版本号长按
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindVersionLongPress);
  } else {
    bindVersionLongPress();
  }
}

// ========== 翻页手势：移动端左右滑 ==========
function bindBookSwipe() {
  const stage = document.querySelector('.book-stage');
  if (!stage || stage._swipeBound) return;
  stage._swipeBound = true;

  let sx = 0, sy = 0, t0 = 0;
  const TH = 60;       // 横向阈值
  const VTH = 40;      // 纵向最大容忍
  const TMAX = 600;    // 最长 600ms

  stage.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    t0 = Date.now();
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    if (!e.changedTouches || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const dt = Date.now() - t0;
    if (dt > TMAX) return;
    if (Math.abs(dy) > VTH) return;            // 纵向滚动太多，忽略
    if (Math.abs(dx) < TH) return;             // 没达到阈值

    const book = document.getElementById('bookPages');
    if (!book) return;
    const cur = book.getAttribute('data-page');

    if (dx < 0 && cur === 'about') {
      // 左滑：从关于翻到 changelog
      flipToChangelog();
    } else if (dx > 0 && cur === 'changelog') {
      // 右滑：从 changelog 回到关于
      flipToAbout();
    }
  }, { passive: true });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBookSwipe);
  } else {
    bindBookSwipe();
  }
}

// ========== 数据持久化 ==========
