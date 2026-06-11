// ========== GitHub Gist 云存储 + 同步码 + saveConversations + exportChat ==========
// (拆自 index.html v0.8.4)

// 免费！用 GitHub Gist API 实现跨设备同步
// 原理：同步码哈希 → Gist ID → 所有设备共享同一个 Gist

function getGistFilename() {
  return 'codingplan-chat-backup.json';
}

// 用同步码生成唯一的 Gist ID（用 SHA-256 前 32 位做稳定 ID）
async function deriveGistId(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode('codingplan:' + token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== 同步码管理 ==========
async function getCloudToken() {
  if (cloudToken) return cloudToken;
  let saved = localStorage.getItem(CLOUD_TOKEN_KEY);
  if (!saved) {
    saved = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem(CLOUD_TOKEN_KEY, saved);
  }
  cloudToken = saved;
  return cloudToken;
}

function setCloudToken(code) {
  code = code.trim();
  if (!code || code.length < 2) {
    alert('同步码至少2个字符');
    return false;
  }
  cloudToken = code;
  localStorage.setItem(CLOUD_TOKEN_KEY, code);
  cloudGistId = null; // 重置 Gist ID
  updateCloudStatus();
  return true;
}

function showSyncCodeDialog() {
  const code = localStorage.getItem(CLOUD_TOKEN_KEY) || '';
  const msg = '📱 多设备同步\n\n'
    + '你的同步码：' + code + '\n\n'
    + '在其他设备输入相同同步码即可共享数据。\n'
    + '修改同步码将无法访问之前的数据！\n\n'
    + '存储方式：Cloudflare KV（免费，全球边缘节点）';
  
  const action = prompt(msg + '\n\n输入新同步码修改，或点取消保留当前码：', code);
  if (action === null) return;
  if (action === code) return;
  if (setCloudToken(action)) {
    alert('✅ 同步码已更新为：' + action + '\n\n在其他设备输入此码即可同步。');
  }
}

// 获取/创建 Gist
async function getOrCreateGist(token) {
  const gistId = await deriveGistId(token);
  cloudGistId = gistId;

  // 先尝试读取现有 Gist
  try {
    const resp = await fetch(`https://api.github.com/gists/${gistId}`);
    if (resp.ok) {
      const gist = await resp.json();
      return { gist, isNew: false };
    }
  } catch (e) { /* Gist 不存在，下面创建 */ }

  // 创建新 Gist（匿名）
  try {
    const resp = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'CodingPlan Chat 对话备份',
        public: false,
        files: {
          [getGistFilename()]: { content: JSON.stringify({ conversations: {}, updatedAt: Date.now() }) }
        }
      })
    });
    if (resp.ok) {
      const gist = await resp.json();
      // 保存真正的 Gist ID
      cloudGistId = gist.id;
      return { gist, isNew: true };
    }
    console.warn('创建 Gist 失败:', resp.status);
  } catch (e) {
    console.warn('创建 Gist 出错:', e.message);
  }
  return null;
}

// 上传备份到云端（v0.9.0: 改走 Cloudflare KV，移除已死的匿名 Gist 路径）
async function cloudUpload() {
  if (cloudSyncing) return;
  cloudSyncing = true;
  try {
    const token = await getCloudToken();
    const resp = await fetch('/api/cloud/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        conversations,
        updatedAt: Date.now(),
      }),
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      lastCloudSync = Date.now();
      console.log('☁️ KV 备份成功', data);
      updateCloudStatus();
    } else {
      const errTxt = await resp.text().catch(() => '');
      console.warn('云端备份失败:', resp.status, errTxt.slice(0, 200));
    }
  } catch (e) {
    console.warn('备份失败:', e.message);
  }
  cloudSyncing = false;
}

// 从云端恢复数据（v0.9.0: 改走 Cloudflare KV）
async function cloudDownload() {
  try {
    const token = await getCloudToken();
    const resp = await fetch('/api/cloud/restore?token=' + encodeURIComponent(token));
    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => '');
      console.warn('云端恢复失败:', resp.status, errTxt.slice(0, 200));
      alert('云端暂无备份数据 (HTTP ' + resp.status + ')');
      return;
    }
    const respJson = await resp.json();
    if (!respJson.ok) {
      alert(respJson.error || '云端备份数据为空');
      return;
    }
    const cloud = respJson.data?.conversations || {};

    // 修复数据结构
    Object.keys(cloud).forEach(key => {
      if (!cloud[key].messages) cloud[key].messages = [];
      if (!cloud[key].id) cloud[key].id = key;
      if (!cloud[key].title) cloud[key].title = '新对话';
      if (!cloud[key].createdAt) cloud[key].createdAt = Date.now();
      if (!cloud[key].updatedAt) cloud[key].updatedAt = Date.now();
    });

    const merged = { ...cloud, ...conversations };
    conversations = merged;
    saveConversations();
    lastCloudSync = Date.now();
    const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
    if (list.length > 0) switchToConversation(list[0].id);
    renderChatHistory();
    updateCloudStatus();
    alert('✅ 云端数据已恢复！\n共 ' + Object.keys(cloud).length + ' 个对话\n\n存储方式：GitHub Gist（免费）');
  } catch (e) {
    alert('❌ 恢复失败：' + e.message);
  }
}

// 手动备份
async function manualBackup() {
  if (Object.keys(conversations).length === 0) {
    alert('暂无对话数据可备份');
    return;
  }
  await cloudUpload();
  if (lastCloudSync > 0) {
    alert('✅ 备份成功！\n\n共备份 ' + Object.keys(conversations).length + ' 个对话\n备份时间：' + new Date(lastCloudSync).toLocaleString() + '\n\n存储方式：GitHub Gist（免费永久）');
  } else {
    alert('❌ 备份失败，请检查网络连接');
  }
}

// 防抖自动备份
let cloudBackupTimer = null;
function scheduleCloudBackup() {
  if (cloudBackupTimer) clearTimeout(cloudBackupTimer);
  cloudBackupTimer = setTimeout(() => cloudUpload(), 3000);
}

// 更新侧边栏状态
function updateCloudStatus() {
  const el = document.getElementById('cloudStatus');
  if (!el) return;
  if (lastCloudSync > 0) {
    const ago = Math.floor((Date.now() - lastCloudSync) / 1000);
    el.textContent = ago < 60 ? '已同步' : `${Math.floor(ago/60)}分钟前同步`;
    el.style.color = 'var(--sidebar-text)';
  } else {
    el.textContent = '未同步';
    el.style.color = 'var(--sidebar-section-title)';
  }
}

// ========== 增强版 saveConversations（带云同步） ==========
const _originalSaveConversations = saveConversations;
saveConversations = function() {
  _originalSaveConversations();
  scheduleCloudBackup();
};

// ========== 增强版 exportChat（导出 .md 文件） ==========
const _originalExportChat = exportChat;
exportChat = function() {
  if (messages.length === 0) { alert('当前对话没有内容'); return; }
  let text = '# 小纸船 - codingplan-chat - 对话记录\n\n';
  text += `> 导出时间: ${new Date().toLocaleString()}\n`;
  text += `> 共 ${messages.length} 条消息\n\n---\n\n`;
  messages.forEach(m => {
    text += `### ${m.role === 'user' ? '🧑 我' : '🔥 助手'}\n\n${m.content}\n\n---\n\n`;
  });
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `小纸船 - codingplan-chat-${new Date().toISOString().slice(0,10)}.md`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  closeSidebar();
};

// ========== 导出全部对话为 .md 压缩包（逐个下载） ==========
function exportAllChats() {
  const list = Object.values(conversations);
  if (list.length === 0) { alert('暂无对话可导出'); return; }
  // 逐个下载
  list.forEach((c, i) => {
    setTimeout(() => {
      let text = `# ${c.title}\n\n`;
      text += `> 导出时间: ${new Date().toLocaleString()}\n`;
      text += `> 共 ${(c.messages||[]).length} 条消息\n\n---\n\n`;
      (c.messages||[]).forEach(m => {
        text += `### ${m.role === 'user' ? '🧑 我' : '🔥 助手'}\n\n${m.content}\n\n---\n\n`;
      });
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${c.title.slice(0,20)}-${new Date(c.updatedAt).toISOString().slice(0,10)}.md`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }, i * 300);
  });
  closeSidebar();
}
// ========== API Key 管理 ==========