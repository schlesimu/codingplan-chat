// ========== 启动页 v0.9.9.4：单页隐私同意 ==========
// 跟随当前主题视觉，参考 iOS / 鸿蒙 首启同意页
// LocalStorage:
//   codingplan-onboarded     是否完成过欢迎流程
//   codingplan-onb-version   上次完成欢迎流程的版本号

const ONB_CURRENT_VERSION = 'v0.9.10.6';

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

// ========== 关于小纸船页 + StPageFlip 真·电子书翻页（v0.9.10.6 重构） ==========
// 旧的 .book-stage/.book-pages 双面 3D rotateY 翻转方案（v0.9.9.0 引入）已废弃，
// 改由 StPageFlip 库（Canvas 贝塞尔卷曲翻页）渲染。
//
// 设计要点：
//   1. 库文件懒加载（首次打开关于页才下载 page-flip.browser.js，43KB）
//   2. 实例化时机：库加载完成后 → 注入页面 DOM → new PageFlip() → loadFromHTML
//   3. 关闭时立即 destroy() 释放 canvas 资源 + 解绑触摸事件
//   4. 内容 DOM 由 02 + 10 协作生成：
//        - 02 生成封面 / 关于页（about-* 内容）
//        - 10 生成 changelog 多页（renderChangelogPaper）

let _pfInstance = null;          // 当前 StPageFlip 实例（null = 未实例化）
let _pfLibLoading = null;        // 库加载 Promise（避免重复发起）
let _pfPendingTarget = null;     // 打开时希望直接跳到的目标（'changelog'）

// 懒加载 page-flip.browser.js
function _loadPageFlipLib() {
  if (typeof window.St !== 'undefined' && window.St && window.St.PageFlip) {
    return Promise.resolve(window.St.PageFlip);
  }
  if (_pfLibLoading) return _pfLibLoading;
  _pfLibLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'assets/vendor/page-flip.browser.js?v=2.0.7';
    s.async = true;
    s.onload = () => {
      if (window.St && window.St.PageFlip) {
        resolve(window.St.PageFlip);
      } else {
        reject(new Error('page-flip 已加载但未挂载到 window.St.PageFlip'));
      }
    };
    s.onerror = () => reject(new Error('page-flip.browser.js 加载失败'));
    document.head.appendChild(s);
  });
  return _pfLibLoading;
}

// 生成关于书的所有页面 HTML（封面 + 关于 + changelog 各页 + 封底）
function _buildBookPagesHTML() {
  const cover = `
    <div class="book-pf-page book-pf-cover">
      <div class="pf-cover-title">小纸船</div>
      <div class="pf-cover-sub">A LITTLE PAPER BOAT · 2026</div>
    </div>`;

  const aboutPage1 = `
    <div class="book-pf-page">
      <h1 class="pf-h1">关于小纸船</h1>
      <div class="pf-meta">序</div>
      <p>2026 年初，AI 像潮水一样涨起来。</p>
      <p>豆包、Kimi、DeepSeek、GLM、Claude……每周都有新模型出来。但我注意到一件事：</p>
      <p>身边那些刚接触 AI 的朋友——没毕业的大学生、不写代码的普通人——他们买不起 ChatGPT Plus，看不懂 Cursor，下载了扣子和 Trae 却 get 不到点。他们能用的，只有豆包这种官方 App。</p>
      <p>而最强的那些模型，他们碰不到。</p>
      <p class="no-indent" style="margin-top:18px;">所以我做了这艘小船。</p>
      <div class="pf-page-num">— 1 —</div>
    </div>`;

  const aboutPage2 = `
    <div class="book-pf-page">
      <div class="pf-divider"></div>
      <ul class="pf-list">
        <li><span class="pf-strong">一份火山 Coding Plan</span>（90 元 / 月），几乎能调用国内全部主流模型</li>
        <li><span class="pf-strong">一个写在浏览器里的聊天器</span>，打开就用、不用注册</li>
        <li><span class="pf-strong">一个朴素的愿望</span>，让你也能体验最新最强的 AI</li>
      </ul>
      <p class="no-indent" style="margin-top:14px;">我不靠它赚钱。它免费给你用。你也可以分享给身边的朋友。</p>
      <p class="no-indent" style="margin-top:10px; color:var(--paper-ink-dim, #6a5839); font-size:12px; line-height:1.7;">
        想要自己用 Coding Plan，可以去火山方舟办一份；项目代码在 GitHub 上，部署到 Cloudflare Pages 就能拥有自己的小船。具体方法请见 README。
      </p>
      <div class="pf-quote">如果有一天它停更了（可能是火山政策变了，也可能是我换了别的事做），也希望它已经在某段时间里，陪你聊过几次有意思的对话。</div>
      <div class="pf-page-num">— 2 —</div>
    </div>`;

  const aboutPage3 = `
    <div class="book-pf-page">
      <div class="pf-capsule">
        <div class="pf-capsule-title">这艘船建造时的世界</div>
        <div style="text-align:center; line-height:2; text-indent:0;">
          豆包 Seed 2.0 · Kimi K2.6 · DeepSeek V4 Pro<br>
          GLM 5.1 · Claude Sonnet 4.5 · MiniMax M3
        </div>
        <div style="margin-top:12px; text-align:center; color:var(--paper-ink-dim, #6a5839); font-size:12px; text-indent:0;">
          —— 这是我们这一代普通人，<br>第一次能同时摸到这么多 AI ——
        </div>
      </div>
      <p class="no-indent" style="text-align:center; color:var(--paper-ink-dim, #6a5839); font-size:13px; margin-top:18px;">
        如果你是从未来回望这一刻的人——你好。<br>我们当时，是这么用 AI 的。
      </p>
      <div class="pf-signature">
        <div class="pf-sig-name">—— schlesimu</div>
        <div>2026 年 6 月 · 一个普通的下午</div>
      </div>
      <div class="pf-page-num">— 3 —</div>
    </div>`;

  // changelog 多页（由 10-changelog.js 提供）
  let changelogPagesHTML = '';
  if (typeof window.buildChangelogBookPages === 'function') {
    try {
      changelogPagesHTML = window.buildChangelogBookPages() || '';
    } catch (e) {
      console.warn('[StPageFlip] buildChangelogBookPages 失败：', e);
    }
  }

  // v0.9.11 修补·二：去掉封底「— 完 —」页（changelog 末页 footer 已经收尾，不需要再单独一页）
  // v0.9.10.6: 移除前封面，打开就是双页摊开（开门见山，不需要"翻一页"才看到内容）
  return aboutPage1 + aboutPage2 + aboutPage3 + changelogPagesHTML;
}

// 计算合适的书本尺寸（v0.9.10.6: 撑满整个 stage 不再钉死上限）
// stretch 模式下 PageFlip 会按 width/height 比例反推实际尺寸，所以这里要保证
// 「按 height 算出的总宽 ≤ stage 可用宽」与「按 width 算出的总高 ≤ stage 可用高」同时成立
// v0.9.11 修补·四：关于书浮层翻页提示
// 触发：前 3 次打开关于书时显示，第 4 次起不再骚扰
// 时机：openAbout 实例化完成后调用，1.5s 淡入 → 4s 持续 → 1.5s 淡出
function _showBookFloatingHint() {
  try {
    const hint = document.getElementById('bookPfFloatingHint');
    if (!hint) return;
    const KEY = '_xzc_book_hint_seen';
    let seen = 0;
    try { seen = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}
    if (seen >= 3) return;
    try { localStorage.setItem(KEY, String(seen + 1)); } catch (e) {}
    // 触发动画：移除再加 class（多次打开也能重新淡入）
    hint.classList.remove('show');
    // 强制 reflow 让 transition 重新触发
    void hint.offsetWidth;
    hint.classList.add('show');
    // 5.5s 后淡出
    clearTimeout(_bookHintTimer);
    _bookHintTimer = setTimeout(() => {
      hint.classList.remove('show');
    }, 5500);
  } catch (e) {}
}
let _bookHintTimer = null;

function _calcBookSize() {
  const stage = document.querySelector('.book-pf-stage');
  if (!stage) return { width: 360, height: 540 };
  const rect = stage.getBoundingClientRect();
  // v0.9.11 修补·四：删除底部 hint 后，stage 全部空间都给书
  let availW = Math.max(280, rect.width);
  let availH = Math.max(360, rect.height);
  const isMobile = window.matchMedia('(max-width: 640px)').matches;

  // v0.9.11 修补·六：手机端真正铺满
  // —— 直接用视口可视高度，不依赖 stage rect（stage flex:1 在某些浏览器拿到 0 或父容器异常）
  if (isMobile) {
    const vvH = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
    const vvW = window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth;
    if (vvH > 0) availH = vvH;  // 视口高直接用，stage 顶 0 padding 已经让位
    if (vvW > 0) availW = vvW;
  }

  // 单页比例（v0.9.10.6: 桌面 1.1 让书横向更宽更"铺满"，移动单页保持瘦高 1.45）
  const ASPECT = isMobile ? 1.45 : 1.1;

  if (isMobile) {
    // 移动端：单页模式 — 铺满优先
    // v0.9.11.4 修补·八：手机端**两边都用视口实际值**，不再保 1.45 比例
    // 之前限制比例 → 视口偏方时书短，露出 about-page 米色
    // PageFlip portrait 单页模式下，宽高比由 container 决定，让书直接 = 视口尺寸
    const w = availW;
    const h = availH;
    // v0.9.11 修补·六：debug 信息（生产可注释）
    try {
      window.__lastBookSizeDebug = {
        rect: { w: rect.width, h: rect.height },
        vv: { w: window.visualViewport?.width, h: window.visualViewport?.height },
        inner: { w: window.innerWidth, h: window.innerHeight },
        availW, availH, finalW: w, finalH: h,
      };
    } catch (e) {}
    return { width: w, height: h };
  }

  // 桌面：双页跨页 → 总宽 = 2 × 单页宽
  // v0.9.11.5 修补·九：桌面也直接铺满视口，不再保 1.1 比例
  // 单页宽 = 视口宽 / 2，单页高 = 视口高
  const w = Math.floor(availW / 2);
  const h = availH;
  return { width: w, height: h };
}

// 创建 StPageFlip 实例
async function _createBookInstance() {
  const PageFlip = await _loadPageFlipLib();
  const container = document.getElementById('aboutBook');
  if (!container) return null;

  // v0.9.11 修补·二：先算 size，再 build HTML
  // 这样 buildChangelogBookPages → _changelogPxBudget 能读到正确的 bookH 用作分页预算
  const size = _calcBookSize();
  // 把算出的尺寸暂存到全局，分页函数读取（避免 _calcBookSize 在 DOM 重排前再次被调，结果不一致）
  window.__bookSizeForChangelog = size;

  // 注入所有页面 DOM
  container.innerHTML = _buildBookPagesHTML();

  // v0.9.10.6: 直接用内联样式钉死 container 物理尺寸，防止 stretch 模式撑爆视口
  // 桌面双页跨页 → 总宽 = size.width × 2；移动端单页 → 总宽 = size.width × 1
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const totalW = isMobile ? size.width : size.width * 2;
  const totalH = size.height;
  // v0.9.11 修补·六：用 !important 钉死，避免 stretch 模式被回写
  container.style.setProperty('width', totalW + 'px', 'important');
  container.style.setProperty('height', totalH + 'px', 'important');
  container.style.setProperty('flex', '0 0 auto', 'important');

  // v0.9.11 修补·五：手机端翻页时间短一点降低闪烁感知 + 阴影淡一点降低 GPU 压力
  const isMobileForFlip = isMobile;
  const inst = new PageFlip(container, {
    width: size.width,
    height: size.height,
    minWidth: 280,
    maxWidth: isMobile ? 5000 : 900,
    minHeight: 360,
    maxHeight: isMobile ? 5000 : 1200, // v0.9.11.4 修补·八：手机端彻底放开 max，让书铺满视口
    size: 'stretch',
    drawShadow: !isMobileForFlip,            // 手机端关阴影：阴影是闪烁主因（每帧重绘 alpha gradient）
    flippingTime: isMobileForFlip ? 450 : 700, // 手机端缩短翻页时间，闪烁窗口期更短
    maxShadowOpacity: isMobileForFlip ? 0.25 : 0.5,
    showCover: false,            // v0.9.10.6: 不再有前封面，第一屏直接双页摊开
    mobileScrollSupport: false,
    usePortrait: true,           // 移动端自动单页
    autoSize: true,
  });

  // 把 children 当作 page DOM
  const pageEls = Array.from(container.querySelectorAll('.book-pf-page'));
  inst.loadFromHTML(pageEls);

  // v0.9.10.6: PageFlip 在 stretch 模式下会把 container.style.width 改成 "100%"，
  // 必须在 loadFromHTML 之后再次强制写回我们算好的物理尺寸（用 !important 防回写）
  container.style.setProperty('width', totalW + 'px', 'important');
  container.style.setProperty('height', totalH + 'px', 'important');
  container.style.setProperty('max-width', totalW + 'px', 'important');

  return inst;
}

function openAbout(target) {
  const page = document.getElementById('aboutPage');
  if (!page) return;
  page.classList.add('visible');
  try { document.body.style.overflow = 'hidden'; } catch (e) {}

  _pfPendingTarget = target || null;

  // 等关于页 fade-in 完 + flex 布局尺寸稳定，再实例化（避免拿到 0 尺寸）
  setTimeout(async () => {
    try {
      // 已有实例 → 直接复用（不重复拉库 / 不重建 canvas）
      if (!_pfInstance) {
        _pfInstance = await _createBookInstance();
      }
      // 跳到目标位置
      if (_pfInstance && _pfPendingTarget === 'changelog') {
        // changelog 大致从第 4 页开始（封面 + 3 页关于）
        try { _pfInstance.flip(4, 'top'); } catch (e) {}
      } else if (_pfInstance) {
        try { _pfInstance.turnToPage(0); } catch (e) {}
      }

      // v0.9.11 修补·四：浮层提示（前 3 次打开关于书时短暂显示翻页方法）
      _showBookFloatingHint();
    } catch (err) {
      console.error('[StPageFlip] 初始化失败：', err);
      // 兜底：显示纯静态文本，告诉用户可以下次再试
      const container = document.getElementById('aboutBook');
      if (container) {
        container.innerHTML = '<div class="book-pf-page" style="margin:auto"><h1 class="pf-h1">关于小纸船</h1><p>翻页书加载失败了，请刷新页面再试一次。</p></div>';
      }
    }
    _pfPendingTarget = null;
  }, 200);
}

function closeAbout(event, force) {
  if (!force && event && event.target.id !== 'aboutPage') return;
  const page = document.getElementById('aboutPage');
  if (!page) return;
  page.classList.remove('visible');
  try { document.body.style.overflow = ''; } catch (e) {}

  // 释放 StPageFlip 资源（destroy → 移除 canvas 和事件监听）
  if (_pfInstance) {
    try { _pfInstance.destroy(); } catch (e) {}
    _pfInstance = null;
  }
  // v0.9.10.6 修复「再次打开空白」：destroy() 会把 #aboutBook 本身从 DOM 干掉，
  // 所以这里要主动重建一个空容器塞回 .book-pf-stage，确保下次 openAbout 能找到它。
  const stage = document.querySelector('.book-pf-stage');
  if (stage) {
    let container = document.getElementById('aboutBook');
    if (!container) {
      container = document.createElement('div');
      container.id = 'aboutBook';
      container.className = 'book-pf-container';
      // v0.9.11 修补·四：插到浮层 hint 前面（兼容老的 .book-pf-hint）
      const hint = stage.querySelector('.book-pf-floating-hint, .book-pf-hint');
      if (hint) stage.insertBefore(container, hint);
      else stage.appendChild(container);
    } else {
      container.innerHTML = '';
      // 清掉上次创建实例时打进去的内联尺寸，避免下次旧值残留
      container.style.width = '';
      container.style.height = '';
      container.style.flex = '';
    }
  }
}

// 兼容旧 API：现在统一通过 StPageFlip 翻页，外部代码（信封点击等）可能仍调
function flipToChangelog() {
  if (_pfInstance) {
    try { _pfInstance.flip(4, 'top'); } catch (e) {}
  } else {
    openAbout('changelog');
  }
}
function flipToAbout() {
  if (_pfInstance) {
    try { _pfInstance.flip(1, 'top'); } catch (e) {}
  }
}
function closeAboutAndShowChangelog() {
  flipToChangelog();
}

// ========== 版本寄语字典（信封 / 长按面板都从这里取） ==========
const VERSION_QUOTES = {
  'v0.9.10.6': '让纸张真的卷起来。',
  'v0.9.10.0': '让说话和写字，回到同一只手里。',
  'v0.9.10.1': '让说话和写字，回到同一只手里。',
  'v0.9.10.2': '让说话和写字，回到同一只手里。',
  'v0.9.10.3': '让说话和写字，回到同一只手里。',
  'v0.9.10.4': '让说话和写字，回到同一只手里。',
  'v0.9.10.5': '让说话和写字，回到同一只手里。',
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

// ========== 翻页手势：v0.9.10.6 删除 ==========
// 旧版用 .book-stage 上的 touchstart/touchend 计算左右滑，触发 flipToChangelog/flipToAbout。
// StPageFlip 库自带触摸 + 鼠标拖拽 + 点击边缘翻页，无需自己绑定。本函数留空为兼容入口。
function bindBookSwipe() { /* no-op */ }


if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBookSwipe);
  } else {
    bindBookSwipe();
  }
}
