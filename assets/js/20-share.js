// ========== v0.9.6: 对话分享（B3）==========
// 复用 GitHub Gist 链路：上传公开 Gist + 生成短链 + 只读查看页
// 短链格式：?share=<gistId>  打开后从 Gist 拉 JSON 渲染只读对话

const SHARE_GIST_DESC = 'codingplan-chat shared conversation';

// 入口：分享当前对话
async function shareCurrentConversation() {
  if (!currentConversationId) { showToast('当前没有对话可分享'); return; }
  const convo = conversations[currentConversationId];
  if (!convo || !convo.messages || convo.messages.length === 0) {
    showToast('对话内容为空，无法分享');
    return;
  }
  showShareDialog(convo);
}

function showShareDialog(convo) {
  const old = document.getElementById('shareDialog');
  if (old) old.remove();
  const dialog = document.createElement('div');
  dialog.id = 'shareDialog';
  dialog.className = 'share-dialog-mask';
  dialog.innerHTML = `
    <div class="share-dialog">
      <div class="share-dialog-header">
        <div class="share-dialog-title">分享对话</div>
        <button class="share-dialog-close" onclick="closeShareDialog()">✕</button>
      </div>
      <div class="share-dialog-body">
        <div class="share-info">
          <div class="share-info-row"><span class="share-info-label">对话标题</span><span class="share-info-val">${escapeHtml(convo.title || '未命名对话')}</span></div>
          <div class="share-info-row"><span class="share-info-label">消息数</span><span class="share-info-val">${convo.messages.length} 条</span></div>
        </div>
        <div class="share-note">
          ⚠️ 对话将上传到你的 GitHub Gist（公开），任何拿到链接的人都能查看，但只读。<br>
          复制链接后发给朋友即可。<br>
          请确认对话中不含敏感信息（如 API Key、密码等）。
        </div>
        <div class="share-action-area" id="shareActionArea">
          <button class="share-upload-btn" onclick="doShareUpload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            上传并生成分享链接
          </button>
        </div>
        <div class="share-result" id="shareResult" style="display:none">
          <div class="share-result-label">分享链接（已复制到剪贴板）</div>
          <div class="share-result-link-wrap">
            <input type="text" id="shareResultLink" class="share-result-link" readonly onclick="this.select()">
            <button class="share-result-copy" onclick="copyShareLink()">复制</button>
          </div>
          <div class="share-result-hint">⏳ 链接会跟着 Gist 永久有效，删除 Gist 即可作废</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeShareDialog(); });
}

function closeShareDialog() {
  const dialog = document.getElementById('shareDialog');
  if (dialog) dialog.remove();
}

async function doShareUpload() {
  const token = localStorage.getItem('codingplan-github-token');
  if (!token) {
    showToast('未配置 GitHub Token，请先在「云同步」中设置');
    return;
  }
  if (!currentConversationId) { showToast('当前没有对话'); return; }
  const convo = conversations[currentConversationId];
  if (!convo) { showToast('对话不存在'); return; }

  const actionArea = document.getElementById('shareActionArea');
  const resultArea = document.getElementById('shareResult');
  if (actionArea) actionArea.innerHTML = '<div style="text-align:center;padding:12px;opacity:0.7">上传中…</div>';

  try {
    // 上传 Gist（public=true）
    const payload = {
      v: '0.9.6',
      type: 'codingplan-chat-share',
      sharedAt: Date.now(),
      conversation: {
        title: convo.title,
        messages: convo.messages,
        createdAt: convo.createdAt
      }
    };
    const body = {
      description: SHARE_GIST_DESC + ': ' + (convo.title || '未命名对话').slice(0, 60),
      public: true,
      files: {
        'conversation.json': { content: JSON.stringify(payload, null, 2) }
      }
    };
    const resp = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Gist 上传失败 HTTP ' + resp.status);
    const gist = await resp.json();
    const gistId = gist.id;
    const shareUrl = `${location.origin}${location.pathname}?share=${gistId}`;

    if (actionArea) actionArea.style.display = 'none';
    if (resultArea) {
      resultArea.style.display = 'block';
      const linkInput = document.getElementById('shareResultLink');
      if (linkInput) {
        linkInput.value = shareUrl;
        linkInput.select();
      }
    }
    // 自动复制
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('链接已复制');
    } catch (e) {}
  } catch (err) {
    if (actionArea) actionArea.innerHTML = `<div style="color:#ff6b6b;padding:8px">上传失败：${escapeHtml(err.message || String(err))}</div><button class="share-upload-btn" onclick="doShareUpload()" style="margin-top:8px">重试</button>`;
  }
}

function copyShareLink() {
  const input = document.getElementById('shareResultLink');
  if (!input) return;
  input.select();
  try {
    navigator.clipboard.writeText(input.value).then(() => showToast('已复制'));
  } catch (e) {
    document.execCommand('copy');
    showToast('已复制');
  }
}

// 启动时检查是否是分享查看页（?share=xxx）
async function checkShareViewMode() {
  const params = new URLSearchParams(location.search);
  const shareId = params.get('share');
  if (!shareId) return false;
  // 进入只读模式
  document.body.classList.add('share-view-mode');
  await renderShareView(shareId);
  return true;
}

async function renderShareView(gistId) {
  document.body.innerHTML = `
    <div class="share-view-container">
      <div class="share-view-header">
        <div class="share-view-brand">
          <img src="logo.png" alt="小纸船" style="width:32px;height:32px;border-radius:50%;vertical-align:middle">
          <span style="margin-left:8px;font-weight:600">小纸船 · 共享对话</span>
        </div>
        <a href="${location.origin}${location.pathname}" class="share-view-home">前往主页 →</a>
      </div>
      <div id="shareViewBody" class="share-view-body">
        <div style="text-align:center;padding:40px;opacity:0.6">加载中…</div>
      </div>
    </div>
  `;
  try {
    const resp = await fetch(`https://api.github.com/gists/${gistId}`);
    if (!resp.ok) throw new Error('Gist 不存在或已删除（HTTP ' + resp.status + '）');
    const gist = await resp.json();
    const file = gist.files && gist.files['conversation.json'];
    if (!file) throw new Error('Gist 内容格式错误');
    const data = JSON.parse(file.content);
    const convo = data.conversation || {};
    const messages = convo.messages || [];
    const body = document.getElementById('shareViewBody');
    if (!body) return;
    const sharedAt = data.sharedAt ? new Date(data.sharedAt).toLocaleString('zh-CN') : '';
    const html = `
      <h1 class="share-view-title">${escapeHtml(convo.title || '未命名对话')}</h1>
      <div class="share-view-meta">共 ${messages.length} 条消息 · 分享于 ${sharedAt}</div>
      <div class="share-view-actions">
        <button class="share-view-import-btn" id="shareViewImportBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          复制到我的 codingplan
        </button>
      </div>
      <div class="share-view-messages">
        ${messages.map(m => {
          const role = m.role === 'user' ? 'user' : 'assistant';
          const roleLabel = m.role === 'user' ? '我' : '小纸船';
          return `<div class="share-msg share-msg-${role}">
            <div class="share-msg-role">${roleLabel}</div>
            <div class="share-msg-bubble">${formatContent(m.content || '')}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="share-view-footer">
        <a href="${location.origin}${location.pathname}" class="share-view-cta">去和小纸船聊聊 →</a>
      </div>
    `;
    body.innerHTML = html;
    // v0.9.8.1 B3+: "复制到我的" 按钮
    const importBtn = document.getElementById('shareViewImportBtn');
    if (importBtn) {
      importBtn.onclick = () => {
        try {
          const payload = {
            title: convo.title || '从分享导入',
            messages: messages,
            sharedFrom: gistId,
            importedAt: Date.now(),
          };
          sessionStorage.setItem('__codingplan_import_shared', JSON.stringify(payload));
          importBtn.disabled = true;
          importBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 即将跳转…';
          setTimeout(() => {
            location.href = location.origin + location.pathname;
          }, 600);
        } catch (e) {
          alert('导入失败：' + (e.message || String(e)));
        }
      };
    }
    // 高亮代码块
    if (typeof loadHighlightJS === 'function') {
      loadHighlightJS().then(() => {
        if (typeof highlightCodeBlocks === 'function') highlightCodeBlocks(body);
      });
    }
  } catch (err) {
    const body = document.getElementById('shareViewBody');
    if (body) body.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">加载失败：${escapeHtml(err.message || String(err))}</div>`;
  }
}

function showToast(msg) {
  let t = document.getElementById('share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'share-toast';
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:99999;pointer-events:none;transition:opacity 0.3s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t.__hideTimer);
  t.__hideTimer = setTimeout(() => { t.style.opacity = '0'; }, 1500);
}

// escapeHtml 已在 04-sidebar.js 定义，这里用 fallback
if (typeof window !== 'undefined' && typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
}

if (typeof window !== 'undefined') {
  window.shareCurrentConversation = shareCurrentConversation;
  window.closeShareDialog = closeShareDialog;
  window.doShareUpload = doShareUpload;
  window.copyShareLink = copyShareLink;
  window.checkShareViewMode = checkShareViewMode;
}

// 启动：DOMContentLoaded 时检查分享模式（要在其他模块初始化前抢先接管 body）
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('share')) {
    setTimeout(() => checkShareViewMode(), 50);
  }
});
