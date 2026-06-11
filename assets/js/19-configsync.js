// ========== v0.9.5: 配置导出/导入 + 扫码同步 + token 校验 + 余额查询 ==========

// ─────────────────────────────────────────────────
// M2: JSON 导出/导入（离线 fallback）
// ─────────────────────────────────────────────────

function exportConfigAsJSON() {
  const data = {
    version: '2',
    exportedAt: Date.now(),
    appVersion: 'v0.9.5',
    syncCode: localStorage.getItem(CLOUD_TOKEN_KEY) || '',
    apiKeys: getApiKeys(),
    preferences: {
      theme: localStorage.getItem('codingplan-theme') || 'dark',
      webSearchEnabled: localStorage.getItem('webSearchEnabled') === 'true',
    },
    // 只导出配置，不导出对话（对话已通过 KV 云同步）
    // 用户如果连对话也想导出，用原来的 exportAllChats()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'codingplan-config.json';
  a.click();
  URL.revokeObjectURL(a.href);
  console.log('[v0.9.5] 配置已导出');
}

function importConfigFromJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.apiKeys) {
        alert('❌ 无效的配置文件');
        return;
      }
      // 导入同步码
      if (data.syncCode && confirm('是否同时导入同步码？\n当前同步码将被覆盖。')) {
        setCloudToken(data.syncCode);
      }
      // 导入 API keys
      setApiKeys(data.apiKeys);
      // 导入偏好
      if (data.preferences) {
        if (data.preferences.theme) {
          document.documentElement.setAttribute('data-theme', data.preferences.theme);
          localStorage.setItem('codingplan-theme', data.preferences.theme);
        }
        if (data.preferences.webSearchEnabled !== undefined) {
          localStorage.setItem('webSearchEnabled', String(data.preferences.webSearchEnabled));
        }
      }
      alert('✅ 配置已导入！\n\n包括：API Keys、同步码、主题偏好');
    } catch (err) {
      alert('❌ 导入失败：' + err.message);
    }
  };
  input.click();
}


// ─────────────────────────────────────────────────
// M1: 扩展 KV 云同步 → 同时同步 API Keys
// ─────────────────────────────────────────────────

// 重写 cloudUpload 以包含 apiKeys
const _orig_cloudUpload = cloudUpload;
cloudUpload = async function enhancedCloudUpload() {
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
        apiKeys: getApiKeys(),  // v0.9.5: 同步 API key 配置
        preferences: {
          theme: localStorage.getItem('codingplan-theme') || 'dark',
        },
        updatedAt: Date.now(),
      }),
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      lastCloudSync = Date.now();
      console.log('[v0.9.5] KV 备份成功（含配置）', data);
      updateCloudStatus();
    } else {
      const errTxt = await resp.text().catch(() => '');
      console.warn('云端备份失败:', resp.status, errTxt.slice(0, 200));
    }
  } catch (e) {
    console.warn('备份失败:', e.message);
  }
  cloudSyncing = false;
};

// 重写 cloudDownload 以提取 apiKeys
const _orig_cloudDownload = cloudDownload;
cloudDownload = async function enhancedCloudDownload() {
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
    const cloud = respJson.data;

    // v0.9.5: 恢复 API Keys
    const cloudApiKeys = cloud.apiKeys;
    if (cloudApiKeys && Object.keys(cloudApiKeys).length > 0) {
      const localKeys = getApiKeys();
      // 合并：云端有且本地没有的 key 才导入（云端优先覆盖本地）
      const merged = { ...localKeys, ...cloudApiKeys };
      setApiKeys(merged);
      console.log('[v0.9.5] 已同步', Object.keys(cloudApiKeys).length, '个 API Key 配置');
    }

    // 恢复偏好
    const prefs = cloud.preferences;
    if (prefs && prefs.theme) {
      localStorage.setItem('codingplan-theme', prefs.theme);
      document.documentElement.setAttribute('data-theme', prefs.theme);
    }

    // v0.9.0: 恢复对话（原有逻辑）
    const cloudConvos = cloud.conversations || {};
    Object.keys(cloudConvos).forEach(key => {
      if (!cloudConvos[key].messages) cloudConvos[key].messages = [];
      if (!cloudConvos[key].id) cloudConvos[key].id = key;
      if (!cloudConvos[key].title) cloudConvos[key].title = '新对话';
      if (!cloudConvos[key].createdAt) cloudConvos[key].createdAt = Date.now();
      if (!cloudConvos[key].updatedAt) cloudConvos[key].updatedAt = Date.now();
    });

    const merged = { ...cloudConvos, ...conversations };
    conversations = merged;
    saveConversations();
    lastCloudSync = Date.now();
    const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
    if (list.length > 0) switchToConversation(list[0].id);
    renderChatHistory();
    updateCloudStatus();
    const msg = '✅ 云端数据已恢复！\n共 ' + Object.keys(cloudConvos).length + ' 个对话';
    if (cloudApiKeys && Object.keys(cloudApiKeys).length > 0) {
      const keyCount = Object.keys(cloudApiKeys).length;
      alert(msg + '\n配置同步：' + keyCount + ' 个 API Key');
    } else {
      alert(msg);
    }
  } catch (e) {
    alert('❌ 恢复失败：' + e.message);
  }
};


// ─────────────────────────────────────────────────
// M1: QR 码一键同步（扫码 + 打开配置链接）
// ─────────────────────────────────────────────────

// 简易 XOR + SHA-256 加密配置（防路边截图泄漏）
async function encryptConfigWithPIN(configStr, pin) {
  const encoder = new TextEncoder();
  const pinKey = await crypto.subtle.digest('SHA-256', encoder.encode('cp-sync:' + pin));
  const keyBytes = new Uint8Array(pinKey);
  const data = encoder.encode(configStr);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  // Base64 编码
  return btoa(String.fromCharCode(...encrypted));
}

async function decryptConfigWithPIN(encoded, pin) {
  const encrypted = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const encoder = new TextEncoder();
  const pinKey = await crypto.subtle.digest('SHA-256', encoder.encode('cp-sync:' + pin));
  const keyBytes = new Uint8Array(pinKey);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

function showQRSyncDialog() {
  const syncCode = localStorage.getItem(CLOUD_TOKEN_KEY) || '';
  if (!syncCode) {
    alert('⚠️ 尚无同步码，系统会自动生成，请稍后重试。');
    return;
  }

  // 弹窗节点的 HTML：用 DIV#qrcode-sync-dialog
  let overlay = document.getElementById('qrcode-overlay');
  if (overlay) { overlay.style.display = 'flex'; return; }

  overlay = document.createElement('div');
  overlay.id = 'qrcode-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="qrcode-dialog">
      <div class="qrcode-dialog-header">
        <span>📲 扫码同步配置</span>
        <button class="qrcode-close-btn" onclick="this.closest('#qrcode-overlay').remove()">×</button>
      </div>
      <div class="qrcode-dialog-body">
        <div class="qrcode-tabs">
          <button class="qrcode-tab active" onclick="switchQRTab('scan',this)">📥 我扫别人</button>
          <button class="qrcode-tab" onclick="switchQRTab('share',this)">📤 分享给他人</button>
        </div>

        <!-- 扫码 TAB -->
        <div class="qrcode-tab-content" id="qrtab-scan">
          <p style="margin:0 0 12px;opacity:0.7;font-size:13px">
            请已在电脑端登录的设备在「扫二维码同步」功能中展示二维码，<br>
            或用手机相机扫描电脑屏幕上的二维码。
          </p>
          <div class="qrcode-scan-area" onclick="document.getElementById('qr-file-input').click()">
            <input type="file" id="qr-file-input" accept="image/*" capture="environment" style="display:none"
              onchange="handleQRScreenshot(event)">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="opacity:0.4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <div style="margin-top:8px;font-size:13px;opacity:0.5">点击在此上传二维码截图，或使用相机扫描</div>
          </div>
          <div id="qr-scan-result" style="display:none;margin-top:8px"></div>
        </div>

        <!-- 分享 TAB -->
        <div class="qrcode-tab-content" id="qrtab-share" style="display:none">
          <p style="margin:0 0 12px;opacity:0.7;font-size:13px">
            让其他设备用相机扫描此二维码，或在浏览器输入下方链接即可同步。
          </p>
          <!-- PIN 输入 -->
          <div class="qrcode-pin-row">
            <label style="font-size:12px;opacity:0.6">设置 PIN 码保护（4-6 位数字，防止泄露）：</label>
            <div style="display:flex;gap:8px;margin-top:4px">
              <input type="password" id="qr-pin-input" class="qrcode-pin-input" placeholder="请输入 PIN 码" maxlength="6" inputmode="numeric" pattern="[0-9]*" value="1234">
              <button class="qrcode-pin-toggle" onclick="togglePINVisibility()" title="显示/隐藏">👁️</button>
            </div>
          </div>
          <div class="qrcode-container" style="position:relative">
            <div id="qrcode-canvas" style="display:flex;align-items:center;justify-content:center;min-height:220px">
              <div style="opacity:0.4;font-size:13px">输入 PIN 后自动生成二维码...</div>
            </div>
          </div>
          <div class="qrcode-output-row" style="position:relative">
            <input type="text" id="qrcode-share-url" readonly style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid var(--input-border,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--input-color,#fff);font-size:12px;font-family:monospace">
            <button class="qrcode-copy-btn" onclick="copyQRSyncLink()">📋</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // 添加过渡动画
  if (!document.getElementById('qrcode-fade-anim')) {
    const s = document.createElement('style');
    s.id = 'qrcode-fade-anim';
    s.textContent = '@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }';
    document.head.appendChild(s);
  }

  // 自动切换到分享 tab + 生成二维码
  const shareTab = overlay.querySelector('[onclick*="share"]');
  if (shareTab) shareTab.click();
}

// PIN 显示/隐藏
function togglePINVisibility() {
  const input = document.getElementById('qr-pin-input');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

// Tab 切换
function switchQRTab(name, btn) {
  document.querySelectorAll('.qrcode-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.qrcode-tab-content').forEach(t => t.style.display = 'none');
  if (btn) btn.classList.add('active');
  document.getElementById('qrtab-' + name).style.display = 'block';
  // 切换到分享 tab 时，自动生成二维码
  if (name === 'share') generateQRSyncLink();
}

// 生成同步链接 + 二维码
async function generateQRSyncLink() {
  const syncCode = localStorage.getItem(CLOUD_TOKEN_KEY) || '';
  if (!syncCode) return;

  const pinInput = document.getElementById('qr-pin-input');
  const pin = pinInput ? pinInput.value.trim() : '1234';
  if (!pin || pin.length < 4) {
    document.getElementById('qrcode-canvas').innerHTML = '<div style="opacity:0.4;font-size:13px">PIN 码至少 4 位</div>';
    return;
  }

  try {
    // 构建配置 JSON 字符串
    const configStr = JSON.stringify({
      syncCode,
      apiKeys: getApiKeys(),
      preferences: {
        theme: localStorage.getItem('codingplan-theme') || 'dark',
      },
    });

    // 用 PIN 加密
    const encConfig = await encryptConfigWithPIN(configStr, pin);

    // 构建链接
    const appURL = window.location.origin + '/?import=' + encodeURIComponent(encConfig) + '&pin=' + pin;

    // 更新输入框
    const urlInput = document.getElementById('qrcode-share-url');
    if (urlInput) urlInput.value = appURL;

    // 生成二维码
    const container = document.getElementById('qrcode-canvas');
    container.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      // 使用 qrcodejs 库
      const qr = new QRCode(container, {
        text: appURL,
        width: 210,
        height: 210,
        colorDark: '#ffffff',
        colorLight: 'transparent',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      // 降级：显示链接文本
      container.innerHTML = `<div style="font-size:12px;opacity:0.5;text-align:center;word-break:break-all;padding:16px">${appURL}</div>`;
    }
  } catch(e) {
    console.warn('[v0.9.5] QR 生成失败:', e);
    document.getElementById('qrcode-canvas').innerHTML = '<div style="opacity:0.4;font-size:12px;color:red">生成失败: ' + e.message + '</div>';
  }
}

// 扫码上传
async function handleQRScreenshot(event) {
  const file = event.target.files[0];
  if (!file) return;
  const resultDiv = document.getElementById('qr-scan-result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '⏳ 识别中...';

  try {
    // 使用免费在线 QR 解码 API（无需注册）
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', '');
    // 使用 goQR.me API
    const resp = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
      method: 'POST',
      body: formData,
    });
    const [result] = await resp.json();
    const data = result.symbol[0].data;
    if (!data) {
      resultDiv.innerHTML = '❌ 未识别到二维码';
      return;
    }

    // 解析 URL
    const url = new URL(data);
    const encConfig = url.searchParams.get('import');
    const pin = url.searchParams.get('pin');

    if (!encConfig || !pin) {
      resultDiv.innerHTML = '❌ 二维码格式错误，请使用本应用生成的二维码';
      return;
    }

    // 解密并导入
    const configStr = await decryptConfigWithPIN(encConfig, pin);
    const config = JSON.parse(configStr);

    if (config.syncCode) {
      setCloudToken(config.syncCode);
    }
    if (config.apiKeys) {
      setApiKeys(config.apiKeys);
    }
    if (config.preferences && config.preferences.theme) {
      localStorage.setItem('codingplan-theme', config.preferences.theme);
      document.documentElement.setAttribute('data-theme', config.preferences.theme);
    }

    resultDiv.innerHTML = '✅ 配置已同步！\n同步码已更新，API Key 配置已导入。';

    // 自动下载云端对话
    setTimeout(() => {
      if (document.getElementById('qrcode-overlay')) {
        document.getElementById('qrcode-overlay').remove();
      }
      cloudDownload();
    }, 1500);
  } catch (e) {
    resultDiv.innerHTML = '❌ 识别失败：' + e.message;
  }
}

// 复制链接
function copyQRSyncLink() {
  const input = document.getElementById('qrcode-share-url');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.querySelector('.qrcode-copy-btn');
    if (btn) {
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📋'; }, 2000);
    }
  });
}

// PIN 变化时自动重新生成二维码
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'qr-pin-input') {
    generateQRSyncLink();
  }
});


// ─────────────────────────────────────────────────
// 页面加载时检测 import 参数（扫描二维码 → 手机跳转）
// ─────────────────────────────────────────────────

(async function() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encConfig = params.get('import');
    const pin = params.get('pin');
    if (!encConfig || !pin) return;

    const configStr = await decryptConfigWithPIN(encConfig, pin);
    const config = JSON.parse(configStr);

    if (config.syncCode) setCloudToken(config.syncCode);
    if (config.apiKeys) setApiKeys(config.apiKeys);
    if (config.preferences && config.preferences.theme) {
      localStorage.setItem('codingplan-theme', config.preferences.theme);
      document.documentElement.setAttribute('data-theme', config.preferences.theme);
    }

    // 清除 URL 参数
    const cleanURL = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanURL);

    // 延迟弹出提示
    setTimeout(() => {
      alert('📲 配置已从二维码导入！\n同步码 + API Keys 已生效。\n是否从云端恢复对话？');
      // 用户点确定后自动下载
      if (confirm('是否立即从云端下载备份数据？')) {
        cloudDownload();
      }
    }, 1500);
  } catch(e) {
    console.warn('[v0.9.5] import 参数解析失败:', e);
  }
})();


// ─────────────────────────────────────────────────
// M5: Token 有效性校验 + 余额查询（通用框架）
// ─────────────────────────────────────────────────

/**
 * 校验 API Key 是否有效
 * @param {string} providerId - 'codingplan' | 'deepseek' | 'zhipu' | 'moonshot' | 'custom'
 * @param {string} apiKey
 * @returns {Promise<{valid: boolean, model?: string, error?: string}>}
 */
async function validateApiKey(providerId, apiKey) {
  if (!apiKey) return { valid: false, error: 'API Key 为空' };

  // 各家最轻的校验方式
  const valiCfg = VALIDATION_ENDPOINTS[providerId];
  if (!valiCfg) return { valid: false, error: '不支持的 provider' };

  try {
    const resp = await fetch(valiCfg.url, {
      method: valiCfg.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        ...(valiCfg.headers || {}),
      },
      body: valiCfg.body ? JSON.stringify(valiCfg.body) : undefined,
    });

    if (resp.ok) {
      return { valid: true, model: valiCfg.successLabel };
    }
    // 401 / 403 = key 无效
    if (resp.status === 401 || resp.status === 403) {
      const body = await resp.text().catch(() => '');
      return { valid: false, error: 'API Key 无效（' + resp.status + '）' };
    }
    // 其他 4xx / 5xx — 可能是网络问题
    return { valid: false, error: '校验失败（HTTP ' + resp.status + '）' };
  } catch (e) {
    return { valid: false, error: '网络错误：' + e.message };
  }
}

// 各家校验 endpoint 配置
const VALIDATION_ENDPOINTS = {
  codingplan: {
    url: '/api/chat',  // 走自己的代理 → 轻量校验
    method: 'POST',
    headers: { 'X-Validate-Only': '1' },
    body: { model: 'auto', messages: [{ role: 'user', content: '' }], max_tokens: 1 },
    successLabel: '✅ CodingPlan Key 有效',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/models',
    method: 'GET',
    successLabel: '✅ DeepSeek Key 有效',
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/models',
    method: 'GET',
    successLabel: '✅ 智谱 GLM Key 有效',
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/models',
    method: 'GET',
    successLabel: '✅ Moonshot Key 有效',
  },
  custom: {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    successLabel: '✅ Key 有效（自定义 OpenAI 兼容）',
  },
};

/**
 * 查询余额（仅支持有余额 API 的 provider）
 * @param {string} providerId
 * @param {string} apiKey
 * @returns {Promise<{supported: boolean, balance?: string, total?: string, expiresAt?: string, error?: string}>}
 */
async function checkBalance(providerId, apiKey) {
  if (!apiKey) return { supported: false, error: 'API Key 为空' };

  const balCfg = BALANCE_ENDPOINTS[providerId];
  if (!balCfg) return { supported: false, error: '该 provider 暂不支持余额查询' };

  try {
    const resp = await fetch(balCfg.url, {
      method: balCfg.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        ...(balCfg.headers || {}),
      },
    });

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        return { supported: true, error: 'API Key 无效，无法查询余额' };
      }
      return { supported: true, error: '查询失败（HTTP ' + resp.status + '）' };
    }

    const data = await resp.json();
    return balCfg.parse(data);

  } catch (e) {
    return { supported: true, error: '网络错误：' + e.message };
  }
}

// 各家余额 API endpoint + 返回解析
const BALANCE_ENDPOINTS = {
  deepseek: {
    url: 'https://api.deepseek.com/user/balance',
    method: 'GET',
    parse: (data) => {
      // DeepSeek 返回: { "is_available": true, "balance_infos": [{"currency": "CNY","total_balance": "59.40","topped_up_balance": "0.00","granted_balance": "59.40"}] }
      const info = data.balance_infos?.[0];
      if (!info) return { supported: true, balance: '未知', error: '无法解析余额数据' };
      const bal = parseFloat(info.total_balance || '0');
      const expiring = parseFloat(info.granted_balance || '0');
      let desc = '¥' + bal.toFixed(2);
      if (expiring > 0) desc += '（含 ' + expiring.toFixed(2) + ' 即将过期赠送金）';
      return { supported: true, balance: desc };
    },
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/users/me/balance',
    method: 'GET',
    parse: (data) => {
      // Moonshot 返回: { "balance": "49.99", "currency": "CNY", "total": "100.00" }
      const bal = parseFloat(data.balance || '0');
      const total = data.total ? ' / 总额 ¥' + parseFloat(data.total).toFixed(2) : '';
      return { supported: true, balance: '¥' + bal.toFixed(2) + total };
    },
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/user/balance',
    method: 'GET',
    parse: (data) => {
      // 智谱返回: { "code": 200, "data": { "total_balance": "188.00", "available_balance": "188.00", "free_balance": "0.00" } }
      const d = data.data || data;
      if (d.total_balance === undefined) return { supported: true, balance: '未知' };
      const avail = parseFloat(d.available_balance || d.total_balance || '0');
      const total = parseFloat(d.total_balance || '0');
      return { supported: true, balance: '¥' + avail.toFixed(2) + '（总额 ¥' + total.toFixed(2) + '）' };
    },
  },
};


// ─────────────────────────────────────────────────
// sidebar 中添加按钮
// ─────────────────────────────────────────────────

// 这些按钮在 index.html 中直接添加了 onclick 引用。
// exportConfigAsJSON  /  importConfigFromJSON  /  showQRSyncDialog
// validateApiKey  /  checkBalance  — 在设置弹窗中新增按钮触发