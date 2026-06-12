// ========== 启动页 v0.9.9.4：单页隐私同意 ==========
// 跟随当前主题视觉，参考 iOS / 鸿蒙 首启同意页
// LocalStorage:
//   codingplan-onboarded     是否完成过欢迎流程
//   codingplan-onb-version   上次完成欢迎流程的版本号

const ONB_CURRENT_VERSION = 'v0.9.9.4';

function finishOnboarding() {
  try {
    localStorage.setItem('codingplan-onboarded', '1');
    localStorage.setItem('codingplan-onb-version', ONB_CURRENT_VERSION);
  } catch (e) {}
  const onb = document.getElementById('onboarding');
  const main = document.getElementById('app-main');
  const input = document.getElementById('userInput');
  if (onb) {
    onb.classList.add('fading-out');
    setTimeout(() => { onb.style.display = 'none'; }, 400);
  }
  if (main) main.classList.add('visible');
  if (input && typeof input.focus === 'function') {
    try { input.focus(); } catch (e) {}
  }
}

function checkOnboarding() {
  let onboarded = false, lastVer = null;
  try {
    onboarded = localStorage.getItem('codingplan-onboarded') === '1';
    lastVer = localStorage.getItem('codingplan-onb-version');
  } catch (e) {}

  if (onboarded && lastVer === ONB_CURRENT_VERSION) {
    const onb = document.getElementById('onboarding');
    const main = document.getElementById('app-main');
    if (onb) onb.style.display = 'none';
    if (main) main.classList.add('visible');
    return true;
  }
  return false;
}

// 老 API 兜底（v0.9.9.x 之前用过 cancelOnboarding，再点不到也无害）
function cancelOnboarding() {
  // v0.9.9.4 起取消按钮已删除；保留函数避免老缓存的 inline onclick 报错
  finishOnboarding();
}

// ========== 关于小纸船页 + 双页电子书翻页 ==========
function openAbout(target) {
  const page = document.getElementById('aboutPage');
  if (!page) return;
  page.classList.add('visible');
  try { document.body.style.overflow = 'hidden'; } catch (e) {}

  if (typeof renderChangelogPaper === 'function') {
    try { renderChangelogPaper(); } catch (e) {}
  }

  const book = document.getElementById('bookPages');
  if (book) {
    if (target === 'changelog') {
      book.style.transition = 'none';
      book.setAttribute('data-page', 'about');
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
  setTimeout(() => {
    book.classList.remove('flipping');
    const cl = book.querySelector('.book-page-back');
    if (cl) cl.scrollTop = 0;
  }, 950);
}

function flipToAbout() {
  const book = document.getElementById('bookPages');
  if (!book) return;
  book.classList.add('flipping');
  book.setAttribute('data-page', 'about');
  setTimeout(() => {
    book.classList.remove('flipping');
    const fr = book.querySelector('.book-page-front');
    if (fr) fr.scrollTop = 0;
  }, 950);
}

function closeAboutAndShowChangelog() {
  flipToChangelog();
}

// ========== 版本寄语字典（信封 / 长按面板都从这里取） ==========
const VERSION_QUOTES = {
  'v0.9.9.4': '把多余的折回去，留下一艘船。',
  'v0.9.9.3': '键也敲一下，鼠也点一下，都顺手。',
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

function getCurrentQuote() {
  return VERSION_QUOTES[ONB_CURRENT_VERSION]
    || VERSION_QUOTES['v0.9']
    || '愿这艘小船陪你走过这个时代的开端。';
}

// ========== 版本号长按反馈日志（v0.9.9.4：短按寄语 toast 已删除） ==========
// 短按 → 不动作（寄语统一交给信封承担）
// 长按 → 弹反馈日志（保留）
function bindVersionLongPress() {
  const el = document.querySelector('.sidebar-version');
  if (!el || el._lpBound) return;
  el._lpBound = true;

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

  // 短按已不弹寄语；click 事件吞掉以免冒泡到旧绑定
  el.addEventListener('click', (e) => {
    if (longTriggered) {
      e.preventDefault();
      e.stopPropagation();
      longTriggered = false;
    }
    // 短按无动作
  }, true);

  el.setAttribute('title', '长按可抓取反馈日志');
}

// ========== 暴露到 window ==========
if (typeof window !== 'undefined') {
  window.finishOnboarding = finishOnboarding;
  window.cancelOnboarding = cancelOnboarding;
  window.checkOnboarding = checkOnboarding;
  window.openAbout = openAbout;
  window.closeAbout = closeAbout;
  window.flipToChangelog = flipToChangelog;
  window.flipToAbout = flipToAbout;
  window.closeAboutAndShowChangelog = closeAboutAndShowChangelog;
  window.bindVersionLongPress = bindVersionLongPress;
  window.ONB_CURRENT_VERSION = ONB_CURRENT_VERSION;
  window.VERSION_QUOTES = VERSION_QUOTES;
  window.getCurrentQuote = getCurrentQuote;
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindVersionLongPress);
  } else {
    bindVersionLongPress();
  }
}

// v0.9.9.4 修：老 bug — checkOnboarding() 此前从没被调过，
// 导致已完成欢迎流程的用户每次刷新都会再看到启动页。
// 现在在加载完成后立即跑一次：已 onboarded + 版本一致 → 直接关启动页 + 显示主界面
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try { checkOnboarding(); } catch (e) {}
    });
  } else {
    try { checkOnboarding(); } catch (e) {}
  }
}

// ========== 翻页手势：移动端左右滑 ==========
function bindBookSwipe() {
  const stage = document.querySelector('.book-stage');
  if (!stage || stage._swipeBound) return;
  stage._swipeBound = true;

  let sx = 0, sy = 0, t0 = 0;
  const TH = 60;
  const VTH = 40;
  const TMAX = 600;

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
    if (Math.abs(dy) > VTH) return;
    if (Math.abs(dx) < TH) return;

    const book = document.getElementById('bookPages');
    if (!book) return;
    const cur = book.getAttribute('data-page');

    if (dx < 0 && cur === 'about') {
      flipToChangelog();
    } else if (dx > 0 && cur === 'changelog') {
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
