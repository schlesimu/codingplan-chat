// ============================================================
//  console-capture.js - v0.9.9.2
//  抓取 console.log/warn/error/info + window.onerror 的轻量记录器
//  目的：长按版本号时，让用户能直接拷走完整运行日志反馈给作者
// ============================================================

(function () {
  if (typeof window === 'undefined') return;
  if (window.__CONSOLE_BUFFER__) return;  // 防重复注入

  const MAX_LINES = 500;     // 最多保留 500 条
  const buf = [];

  function pushLine(level, args) {
    try {
      const ts = new Date().toISOString().slice(11, 23);  // HH:MM:SS.sss
      const parts = [];
      for (const a of args) {
        if (a == null) { parts.push(String(a)); continue; }
        if (typeof a === 'string') { parts.push(a); continue; }
        if (a instanceof Error) { parts.push(a.message + (a.stack ? '\n' + a.stack : '')); continue; }
        try { parts.push(JSON.stringify(a)); }
        catch (e) { parts.push(String(a)); }
      }
      buf.push(`[${ts}] ${level} ${parts.join(' ')}`);
      while (buf.length > MAX_LINES) buf.shift();
    } catch (e) { /* 永不抛 */ }
  }

  // 包装原生 console
  const origin = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
  };

  console.log = function () { pushLine('LOG ', arguments); origin.log.apply(console, arguments); };
  console.warn = function () { pushLine('WARN', arguments); origin.warn.apply(console, arguments); };
  console.error = function () { pushLine('ERR ', arguments); origin.error.apply(console, arguments); };
  console.info = function () { pushLine('INFO', arguments); origin.info.apply(console, arguments); };

  // 抓 unhandled error
  window.addEventListener('error', (ev) => {
    pushLine('ERR ', [`[onerror] ${ev.message} @ ${ev.filename}:${ev.lineno}:${ev.colno}`,
                      ev.error && ev.error.stack ? ev.error.stack : '']);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    pushLine('ERR ', [`[unhandled promise]`, ev.reason]);
  });

  // 暴露
  window.__CONSOLE_BUFFER__ = buf;

  // 拼装可复制的反馈报文
  window.getConsoleLogReport = function () {
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const view = window.innerWidth + 'x' + window.innerHeight;
    const ver = window.ONB_CURRENT_VERSION || '(unknown)';
    const time = new Date().toString();
    const memo = (function () {
      // 把当前对话最后 1 条用户消息也带上，便于定位
      try {
        if (window.currentChat && Array.isArray(currentChat.messages)) {
          const lastUser = [...currentChat.messages].reverse().find(m => m.role === 'user');
          if (lastUser && typeof lastUser.content === 'string') {
            return lastUser.content.slice(0, 200);
          }
        }
      } catch (e) {}
      return '';
    })();

    const head = [
      '===== 小纸船 反馈日志 =====',
      '版本: ' + ver,
      '时间: ' + time,
      '设备: ' + ua,
      '语言: ' + lang,
      '视口: ' + view,
      '最近一条用户消息: ' + (memo || '(无)'),
      '----- 控制台日志（最近 ' + buf.length + ' 条） -----',
    ].join('\n');

    return head + '\n' + buf.join('\n');
  };
})();

// ============================================================
//  显示反馈日志对话框（长按版本号触发）
// ============================================================
function showFeedbackLogDialog() {
  const text = (window.getConsoleLogReport && window.getConsoleLogReport()) || '(无日志)';

  // 已有就先关掉
  const old = document.getElementById('feedbackLogOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'feedbackLogOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };

  const dialog = document.createElement('div');
  dialog.style.cssText = 'max-width:560px;width:100%;max-height:88vh;display:flex;flex-direction:column;border-radius:18px;background:var(--sidebar-bg);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid var(--sidebar-border);box-shadow:0 16px 48px rgba(0,0,0,0.3);color:var(--text-main);overflow:hidden';
  dialog.onclick = function (e) { e.stopPropagation(); };

  // 标题
  const head = document.createElement('div');
  head.style.cssText = 'padding:16px 20px 10px;border-bottom:1px solid var(--sidebar-divider)';
  head.innerHTML = '<div style="font-size:15px;font-weight:600;color:var(--text-main);margin-bottom:4px">反馈日志</div>'
                 + '<div style="font-size:11px;color:var(--text-dim);line-height:1.6">'
                 + '把这段日志复制下来，发给作者就能帮忙排查问题。<br>不会上传任何数据，纯本地记录。'
                 + '</div>';

  // 文本
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.readOnly = true;
  ta.style.cssText = 'flex:1;min-height:240px;margin:14px 20px 0;padding:12px;border-radius:10px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.55;resize:none;outline:none';

  // 按钮
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--sidebar-divider);background:var(--sidebar-bg)';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'padding:8px 18px;border-radius:10px;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--btn-color);cursor:pointer;font-size:13px;font-family:inherit';
  closeBtn.onclick = () => overlay.remove();

  const dlBtn = document.createElement('button');
  dlBtn.textContent = '保存为文件';
  dlBtn.style.cssText = 'padding:8px 18px;border-radius:10px;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--btn-color);cursor:pointer;font-size:13px;font-family:inherit';
  dlBtn.onclick = () => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      a.download = 'paperboat-log-' + ts + '.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') showToast('日志已保存');
    } catch (e) { alert('保存失败: ' + e.message); }
  };

  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制全部';
  copyBtn.style.cssText = 'padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff6b35,#ff3d00);color:#fff;cursor:pointer;font-size:13px;font-family:inherit;font-weight:600';
  copyBtn.onclick = async () => {
    try {
      // 优先 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        ta.select();
        document.execCommand('copy');
      }
      copyBtn.textContent = '已复制 ✓';
      copyBtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
      if (typeof showToast === 'function') showToast('日志已复制到剪贴板');
      setTimeout(() => overlay.remove(), 700);
    } catch (e) {
      // 兜底：选中
      ta.select();
      alert('自动复制失败，请按 Ctrl/Cmd+C 手动复制');
    }
  };

  btnRow.appendChild(closeBtn);
  btnRow.appendChild(dlBtn);
  btnRow.appendChild(copyBtn);

  dialog.appendChild(head);
  dialog.appendChild(ta);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

if (typeof window !== 'undefined') {
  window.showFeedbackLogDialog = showFeedbackLogDialog;
}
