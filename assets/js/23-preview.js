// ========== v0.9.8.3 E3: 代码块实时预览 ==========
// 仅 html/css/js 显示按钮，点击在代码块下方插入 iframe sandbox 渲染
// 安全策略：sandbox="allow-scripts"（不给 allow-same-origin），无 cookie/storage 共享

function togglePreviewBlock(codeId, lang, btn) {
  const codeEl = document.getElementById(codeId);
  if (!codeEl) return;
  const wrap = codeEl.closest('.code-block-wrap');
  if (!wrap) return;

  // 已存在预览 → 关闭
  const existing = wrap.querySelector('.code-block-preview-area');
  if (existing) {
    existing.remove();
    btn.classList.remove('active');
    const span = btn.querySelector('span'); if (span) span.textContent = '预览';
    return;
  }

  // 取代码（用 textContent 避免 hljs 高亮的 span 污染）
  const code = codeEl.textContent || '';
  if (!code.trim()) return;

  // 构造 srcdoc
  let srcdoc = '';
  if (lang === 'html') {
    srcdoc = code;
    // 如果用户写的是片段（没有 <html> 标签），自动套基础模板
    if (!/<html|<!doctype/i.test(code)) {
      srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:8px;font-family:-apple-system,system-ui,sans-serif;color:#1a1a24;background:#fff}</style></head><body>${code}</body></html>`;
    }
  } else if (lang === 'css') {
    srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${code}</style></head><body>
<h1>标题示例</h1>
<p>段落示例：小纸船在打捞测试样式。<a href="#">这是一个链接</a></p>
<button>按钮示例</button>
<ul><li>列表项 1</li><li>列表项 2</li><li>列表项 3</li></ul>
<div class="box">.box 类元素</div>
</body></html>`;
  } else if (lang === 'js' || lang === 'javascript') {
    srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:8px;font-family:-apple-system,monospace;font-size:13px;color:#1a1a24;background:#fff}#__log{white-space:pre-wrap;background:#f5f5f7;padding:8px;border-radius:6px;border:1px solid #e0e0e6}.err{color:#d33}</style></head><body>
<div id="__log"></div>
<script>
(function(){
  var log=document.getElementById('__log');
  var orig=console.log, oerr=console.error, owarn=console.warn;
  function append(prefix, args, cls){
    var line=document.createElement('div'); if(cls) line.className=cls;
    line.textContent=prefix+Array.from(args).map(function(a){try{return typeof a==='object'?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(' ');
    log.appendChild(line);
  }
  console.log=function(){append('▸ ',arguments); orig.apply(console,arguments);};
  console.warn=function(){append('⚠ ',arguments,'err'); owarn.apply(console,arguments);};
  console.error=function(){append('✗ ',arguments,'err'); oerr.apply(console,arguments);};
  window.onerror=function(msg,src,line){append('✗ ',[msg+' (line '+line+')'],'err');return false;};
  try{
${code}
  }catch(e){append('✗ ',[e.message+' — '+(e.stack||'').split('\\n')[0]],'err');}
})();
<\/script>
</body></html>`;
  }

  // 创建预览区
  const area = document.createElement('div');
  area.className = 'code-block-preview-area';
  area.innerHTML = `
    <div class="preview-toolbar">
      <span class="preview-title">▶️ 实时预览（${lang.toUpperCase()}）</span>
      <div class="preview-actions">
        <button class="preview-btn" title="刷新">🔄</button>
        <button class="preview-btn preview-close" title="关闭预览">✕</button>
      </div>
    </div>
    <iframe class="preview-iframe" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
  `;
  wrap.appendChild(area);

  const iframe = area.querySelector('.preview-iframe');
  iframe.srcdoc = srcdoc;

  // 自动高度调整：监听 load，根据内容尝试调
  iframe.addEventListener('load', () => {
    try {
      // sandbox 不给 same-origin → 拿不到 contentDocument，固定一个默认高度即可
      // 高度默认 280，用户可拖
    } catch (e) {}
  });

  // 刷新按钮
  area.querySelector('.preview-btn:not(.preview-close)').onclick = () => {
    iframe.srcdoc = srcdoc;
  };
  // 关闭按钮
  area.querySelector('.preview-close').onclick = () => {
    area.remove();
    btn.classList.remove('active');
    const span = btn.querySelector('span'); if (span) span.textContent = '预览';
  };

  btn.classList.add('active');
  const span = btn.querySelector('span'); if (span) span.textContent = '收起';
}

window.togglePreviewBlock = togglePreviewBlock;
console.log('[v0.9.8.3 E3] preview module loaded');
