// ========== v0.9.4: 移动端键盘弹起补偿 ==========
// 原理：visualViewport API 是 iOS Safari / Android Chrome / ColorOS / 鸿蒙 WebView
// 都支持的标准 API，能监听到键盘弹起后真实可视区域的高度变化。
// 把差值（被键盘遮挡的高度）写到 CSS 变量 --kb-inset，让 input-area transform 上移。

(function () {
  if (!window.visualViewport) {
    // 老浏览器没有 visualViewport API（IE / 古早安卓），啥也不做，原样降级
    return;
  }

  const vv = window.visualViewport;
  const root = document.documentElement;
  const body = document.body;
  let lastInset = 0;

  function updateKeyboardInset() {
    // 键盘弹起时，visualViewport.height 会变小（变成可视区域高度）
    // 差值 = 被键盘 / 浏览器底栏遮挡的高度
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

    // 5px 抖动阈值：浏览器地址栏收起也会触发 resize，但是只有几像素
    if (Math.abs(inset - lastInset) < 5) return;
    lastInset = inset;

    root.style.setProperty('--kb-inset', inset + 'px');

    if (inset > 100) {
      // 认定为键盘弹起（一般键盘 > 200px）
      body.classList.add('keyboard-open');
      // 键盘弹起后滚到底，让最新消息+输入框都可见
      requestAnimationFrame(() => {
        const chatArea = document.getElementById('chatArea');
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
      });
    } else {
      body.classList.remove('keyboard-open');
    }
  }

  // visualViewport 事件
  vv.addEventListener('resize', updateKeyboardInset);
  vv.addEventListener('scroll', updateKeyboardInset);

  // 兜底：focus 时强制刷一次（部分浏览器键盘弹起不触发 resize）
  document.addEventListener('focusin', (e) => {
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      // 延迟一帧等键盘弹完
      setTimeout(updateKeyboardInset, 300);
    }
  });

  document.addEventListener('focusout', (e) => {
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      // 失焦后键盘可能还在收（iOS 尤其慢），延迟清理
      setTimeout(() => {
        // 失焦时如果没有其他输入元素 active，就清掉
        if (!document.activeElement || (document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT')) {
          root.style.setProperty('--kb-inset', '0px');
          body.classList.remove('keyboard-open');
          lastInset = 0;
        }
      }, 300);
    }
  });

  console.log('[v0.9.4] mobile keyboard inset listener active');
})();

// ========== PWA: 注册「添加到主屏」横幅提示 ==========
// ColorOS / Chrome Android 会自动触发 beforeinstallprompt 事件
// 这里仅在用户至少访问 3 次后才提示，避免打扰
(function () {
  let deferredPrompt = null;
  const VISITS_KEY = 'codingplan-visits';
  const PROMPT_SHOWN_KEY = 'codingplan-pwa-prompt-shown';

  // 记录访问次数
  const visits = parseInt(localStorage.getItem(VISITS_KEY) || '0', 10) + 1;
  localStorage.setItem(VISITS_KEY, String(visits));

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // 3 次访问后且没提示过才显示
    if (visits >= 3 && !localStorage.getItem(PROMPT_SHOWN_KEY)) {
      setTimeout(showInstallBanner, 2000);  // 进来 2 秒后弹，避免打断启动
    }
  });

  function showInstallBanner() {
    if (!deferredPrompt) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed; bottom: 100px; left: 10px; right: 10px;
      background: var(--input-area-bg, rgba(15,15,40,0.9));
      border: 1px solid var(--input-area-border, rgba(255,255,255,0.1));
      border-radius: 16px; padding: 14px 16px;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 1000; display: flex; align-items: center; gap: 12px;
      font-size: 14px; color: var(--text-main, #fff);
      animation: pwaSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    banner.innerHTML = `
      <div style="font-size:24px">📲</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;margin-bottom:2px">添加到主屏</div>
        <div style="font-size:12px;opacity:0.7">像 App 一样从桌面打开，体验更好</div>
      </div>
      <button id="pwa-install-btn" style="background:#ff6b35;color:#fff;border:none;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">添加</button>
      <button id="pwa-dismiss-btn" style="background:transparent;color:var(--text-main,#fff);border:none;padding:8px;cursor:pointer;opacity:0.5;font-size:18px">×</button>
    `;
    document.body.appendChild(banner);

    // 加入动画
    if (!document.getElementById('pwa-banner-anim')) {
      const style = document.createElement('style');
      style.id = 'pwa-banner-anim';
      style.textContent = '@keyframes pwaSlideUp { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }';
      document.head.appendChild(style);
    }

    document.getElementById('pwa-install-btn').onclick = async () => {
      banner.remove();
      localStorage.setItem(PROMPT_SHOWN_KEY, '1');
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    };
    document.getElementById('pwa-dismiss-btn').onclick = () => {
      banner.remove();
      localStorage.setItem(PROMPT_SHOWN_KEY, '1');
    };
  }

  // 检测已经是 PWA 启动
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.documentElement.classList.add('pwa-installed');
    console.log('[v0.9.4] running as installed PWA');
  }
})();
