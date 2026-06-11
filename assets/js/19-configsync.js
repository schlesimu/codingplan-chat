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
      theme: localStorage.getItem('codingplan-theme') || 'light',
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
        alert('无效的配置文件');
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
      alert('配置已导入！\n\n包括：API Keys、同步码、主题偏好');
    } catch (err) {
      alert('导入失败：' + err.message);
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
          theme: localStorage.getItem('codingplan-theme') || 'light',
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
      alert('云端暂无备份数据 (HTTP' + resp.status + ')');
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
    const msg = '云端数据已恢复！\n共' + Object.keys(cloudConvos).length + '个对话';
    if (cloudApiKeys && Object.keys(cloudApiKeys).length > 0) {
      const keyCount = Object.keys(cloudApiKeys).length;
      alert(msg + '\n配置同步：' + keyCount + '个 API Key');
    } else {
      alert(msg);
    }
  } catch (e) {
    alert('🌊 小纸船在风暴里迷路了：' + e.message);
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

// ========== v0.9.5.3: 时间戳加密（5分钟自动失效，无需 PIN）==========
// 加密 key 用一个固定 salt 派生（设备无关），二维码本身 5 分钟过期保证安全
const _QR_SALT = 'codingplan-chat-sync-v1';
const _QR_TTL_MS = 5 * 60 * 1000; // 5 分钟

async function _deriveStaticKey() {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(_QR_SALT));
  return new Uint8Array(hash);
}

async function encryptConfigTimed(configStr) {
  const key = await _deriveStaticKey();
  const payload = JSON.stringify({ t: Date.now(), d: configStr });
  const data = new TextEncoder().encode(payload);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return btoa(String.fromCharCode(...out));
}

async function decryptConfigTimed(encoded) {
  const key = await _deriveStaticKey();
  const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  const payload = JSON.parse(new TextDecoder().decode(out));
  const age = Date.now() - payload.t;
  if (age > _QR_TTL_MS) {
    const mins = Math.floor(age / 60000);
    throw new Error(`二维码已过期（生成于 ${mins} 分钟前，5 分钟内有效）`);
  }
  if (age < -60000) throw new Error('二维码时间异常（生成时间晚于当前）');
  return payload.d;
}

function showQRSyncDialog() {
  const syncCode = localStorage.getItem(CLOUD_TOKEN_KEY) || '';
  if (!syncCode) {
    alert('尚无同步码，系统会自动生成，请稍后重试。');
    return;
  }

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
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      stopCameraScan();
      stopQRCountdown();
      overlay.remove();
    }
  };

  // v0.9.5.4: 单一界面（去掉主入口选择页），默认进分享视图但二维码隐藏，点「生成二维码」才出
  overlay.innerHTML = `
    <div class="qrcode-dialog">
      <div class="qrcode-dialog-header">
        <button class="qrsync-icon-btn" onclick="enterScanMode()" title="扫一扫">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><line x1="15" y1="15" x2="15" y2="21"/><line x1="18" y1="15" x2="18" y2="18"/><line x1="21" y1="15" x2="21" y2="21"/><line x1="15" y1="18" x2="18" y2="18"/></svg>
          <span>扫一扫</span>
        </button>
        <span class="qrcode-dialog-title">跨设备同步</span>
        <button class="qrcode-close-btn" onclick="stopCameraScan();stopQRCountdown();this.closest('#qrcode-overlay').remove()" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="qrcode-dialog-body">
        <!-- 扫码画面（初始隐藏，点右上「扫一扫」进）-->
        <div id="qrsync-scan" style="display:none">
          <button class="qrsync-back-btn" onclick="backToMain()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>返回</span>
          </button>
          <div id="qr-camera-view" style="display:flex">
            <button class="qr-camera-cancel" onclick="backToMain()" title="取消">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <video id="qr-camera-video" playsinline muted autoplay></video>
            <div class="qr-scan-overlay"></div>
            <div class="qr-scan-frame"></div>
          </div>
          <div id="qr-scan-result" style="display:none;margin-top:10px"></div>
        </div>

        <!-- 分享画面（默认显示，但二维码隐藏，等用户点「生成二维码」）-->
        <div id="qrsync-share">
          <!-- 占位区：二维码隐藏时显示提示 + 生成按钮 -->
          <div id="qrcode-placeholder" class="qrcode-placeholder">
            <div class="qrcode-placeholder-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div class="qrcode-placeholder-text">点击下方按钮生成同步二维码<br><span class="qrcode-placeholder-sub">5 分钟内有效，扫码即可同步配置</span></div>
            <button class="qrsync-generate-btn" onclick="generateQRSyncLink()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
              <span>生成二维码</span>
            </button>
          </div>

          <!-- 二维码区（初始隐藏，generateQRSyncLink 调用后才显示）-->
          <div id="qrcode-area" style="display:none">
            <div class="qrcode-container">
              <div id="qrcode-canvas" style="display:flex;align-items:center;justify-content:center;min-height:220px"></div>
            </div>
            <div id="qr-countdown" class="qr-countdown-bar">
              <span class="qr-countdown-text">有效期：<span id="qr-countdown-num">5:00</span></span>
            </div>
            <div class="qrcode-output-row">
              <input type="text" id="qrcode-share-url" readonly class="qrcode-share-input">
              <button class="qrcode-copy-btn" onclick="copyQRSyncLink()" title="复制链接">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  if (!document.getElementById('qrcode-fade-anim')) {
    const s = document.createElement('style');
    s.id = 'qrcode-fade-anim';
    s.textContent = '@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }';
    document.head.appendChild(s);
  }
}

// 进扫码视图
function enterScanMode() {
  document.getElementById('qrsync-share').style.display = 'none';
  document.getElementById('qrsync-scan').style.display = 'block';
  stopQRCountdown();
  startCameraScan();
}

// 回主菜单（= 分享视图，但隐藏二维码）
function backToMain() {
  stopCameraScan();
  stopQRCountdown();
  const scan = document.getElementById('qrsync-scan');
  const share = document.getElementById('qrsync-share');
  const placeholder = document.getElementById('qrcode-placeholder');
  const area = document.getElementById('qrcode-area');
  if (scan) scan.style.display = 'none';
  if (share) share.style.display = 'block';
  if (placeholder) placeholder.style.display = 'flex';
  if (area) area.style.display = 'none';
  const result = document.getElementById('qr-scan-result');
  if (result) result.style.display = 'none';
}

// 隐藏二维码（回到占位提示态）
function hideQRCode() {
  stopQRCountdown();
  const placeholder = document.getElementById('qrcode-placeholder');
  const area = document.getElementById('qrcode-area');
  if (placeholder) placeholder.style.display = 'flex';
  if (area) area.style.display = 'none';
}

// 倒计时
let _qrCountdownTimer = null;
let _qrCountdownEnd = 0;
function startQRCountdown() {
  stopQRCountdown();
  _qrCountdownEnd = Date.now() + _QR_TTL_MS;
  const tick = () => {
    const remain = _qrCountdownEnd - Date.now();
    const el = document.getElementById('qr-countdown-num');
    if (!el) { stopQRCountdown(); return; }
    if (remain <= 0) {
      el.textContent = '已过期';
      el.style.color = '#ff8a5e';
      const canvas = document.getElementById('qrcode-canvas');
      if (canvas) canvas.style.opacity = '0.25';
      stopQRCountdown();
      return;
    }
    const mins = Math.floor(remain / 60000);
    const secs = Math.floor((remain % 60000) / 1000);
    el.textContent = mins + ':' + String(secs).padStart(2, '0');
    el.style.color = remain < 60000 ? '#ff8a5e' : '#4ade80';
  };
  tick();
  _qrCountdownTimer = setInterval(tick, 1000);
}
function stopQRCountdown() {
  if (_qrCountdownTimer) { clearInterval(_qrCountdownTimer); _qrCountdownTimer = null; }
}

// 生成同步链接 + 二维码（v0.9.5.4：从占位态切到二维码态）
async function generateQRSyncLink() {
  const syncCode = localStorage.getItem(CLOUD_TOKEN_KEY) || '';
  if (!syncCode) return;

  // 切换显示：隐藏占位、显示二维码区
  const placeholder = document.getElementById('qrcode-placeholder');
  const area = document.getElementById('qrcode-area');
  if (placeholder) placeholder.style.display = 'none';
  if (area) area.style.display = 'block';

  const canvas = document.getElementById('qrcode-canvas');
  if (canvas) canvas.style.opacity = '1';

  try {
    const configStr = JSON.stringify({
      syncCode,
      apiKeys: getApiKeys(),
      preferences: {
        theme: localStorage.getItem('codingplan-theme') || 'light',
      },
    });
    const encConfig = await encryptConfigTimed(configStr);
    const appURL = window.location.origin + '/?import=' + encodeURIComponent(encConfig);

    const urlInput = document.getElementById('qrcode-share-url');
    if (urlInput) urlInput.value = appURL;

    canvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(canvas, {
        text: appURL,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      canvas.innerHTML = '<div style="font-size:12px;opacity:0.5;text-align:center;word-break:break-all;padding:16px">' + appURL + '</div>';
    }
    startQRCountdown();
  } catch(e) {
    console.warn('[v0.9.5.4] QR 生成失败:', e);
    if (canvas) canvas.innerHTML = '<div style="opacity:0.7;font-size:13px;color:#ff8a5e;text-align:center">生成失败:' + e.message + '</div>';
  }
}

// 启动摄像头实时扫码（v0.9.5.1）
let _qrCameraStream = null;
let _qrScanRAF = null;

async function startCameraScan() {
  const resultDiv = document.getElementById('qr-scan-result');
  const trigger = document.getElementById('qr-scan-trigger');
  const cameraView = document.getElementById('qr-camera-view');
  const video = document.getElementById('qr-camera-video');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color:#ff8a5e"> 浏览器不支持摄像头 API，请用最新版浏览器</div>';
    }
    return;
  }

  if (typeof jsQR === 'undefined') {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color:#ff8a5e"> jsQR 库未加载，请刷新页面重试</div>';
    }
    return;
  }

  try {
    _qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // 后置摄像头
      audio: false,
    });
    video.srcObject = _qrCameraStream;
    await video.play();

    trigger.style.display = 'none';
    cameraView.style.display = 'flex';
    if (resultDiv) resultDiv.style.display = 'none';

    // 用 canvas 抓帧解码
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (!_qrCameraStream) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          handleQRDecoded(code.data);
          return;
        }
      }
      _qrScanRAF = requestAnimationFrame(scanFrame);
    };
    scanFrame();
  } catch (e) {
    let msg = e.message;
    if (e.name === 'NotAllowedError') msg = '摄像头权限被拒绝，请在浏览器设置中允许';
    else if (e.name === 'NotFoundError') msg = '未找到摄像头设备';
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color:#ff8a5e">' + msg + '</div>';
    }
    stopCameraScan();
  }
}

function stopCameraScan() {
  if (_qrScanRAF) {
    cancelAnimationFrame(_qrScanRAF);
    _qrScanRAF = null;
  }
  if (_qrCameraStream) {
    _qrCameraStream.getTracks().forEach(t => t.stop());
    _qrCameraStream = null;
  }
  const cameraView = document.getElementById('qr-camera-view');
  const trigger = document.getElementById('qr-scan-trigger');
  if (cameraView) cameraView.style.display = 'none';
  if (trigger) trigger.style.display = 'block';
}

async function handleQRDecoded(qrData) {
  stopCameraScan();
  const resultDiv = document.getElementById('qr-scan-result');
  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#4ade80"> ✨ 已识别到二维码，小纸船在拆密信…</div>';
  }

  try {
    const url = new URL(qrData);
    const encConfig = url.searchParams.get('import');

    if (!encConfig) {
      throw new Error('二维码格式错误，请使用本应用生成的二维码');
    }

    const configStr = await decryptConfigTimed(encConfig);
    const config = JSON.parse(configStr);

    if (config.syncCode) setCloudToken(config.syncCode);
    if (config.apiKeys) setApiKeys(config.apiKeys);
    if (config.preferences && config.preferences.theme) {
      localStorage.setItem('codingplan-theme', config.preferences.theme);
      document.documentElement.setAttribute('data-theme', config.preferences.theme);
    }

    if (resultDiv) {
      const keyCount = config.apiKeys ? Object.keys(config.apiKeys).length : 0;
      resultDiv.innerHTML = '<div style="color:#4ade80;font-weight:600"> 配置已同步！</div>' +
        '<div style="color:#a0a0b0;font-size:12px;margin-top:4px">同步码已更新，导入' + keyCount + '个 API Key 配置</div>';
    }

    setTimeout(() => {
      const overlay = document.getElementById('qrcode-overlay');
      if (overlay) overlay.remove();
      cloudDownload();
    }, 1800);
  } catch (e) {
    if (resultDiv) {
      resultDiv.innerHTML = '<div style="color:#ff8a5e">' + e.message + '</div>' +
        '<button onclick="startCameraScan()" style="margin-top:8px;background:#ff6b35;color:#fff;border:none;padding:8px 16px;border-radius:10px;cursor:pointer"> 重新扫码</button>';
    }
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
      btn.textContent = '';
      setTimeout(() => { btn.textContent = ''; }, 2000);
    }
  });
}


// ─────────────────────────────────────────────────
// 页面加载时检测 import 参数（扫描二维码 → 手机跳转）
// ─────────────────────────────────────────────────

(async function() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encConfig = params.get('import');
    if (!encConfig) return;

    const configStr = await decryptConfigTimed(encConfig);
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
      alert('配置已从二维码导入！\n同步码 + API Keys 已生效。\n是否从云端恢复对话？');
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
    successLabel: 'CodingPlan Key 有效',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/models',
    method: 'GET',
    successLabel: 'DeepSeek Key 有效',
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/models',
    method: 'GET',
    successLabel: '智谱 GLM Key 有效',
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/models',
    method: 'GET',
    successLabel: 'Moonshot Key 有效',
  },
  custom: {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    successLabel: 'Key 有效（自定义 OpenAI 兼容）',
  },
  openai: {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    successLabel: 'Key 有效',
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
      if (expiring > 0) desc += '（含' + expiring.toFixed(2) + '即将过期赠送金）';
      return { supported: true, balance: desc };
    },
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/users/me/balance',
    method: 'GET',
    parse: (data) => {
      // Moonshot 返回: { "balance": "49.99", "currency": "CNY", "total": "100.00" }
      const bal = parseFloat(data.balance || '0');
      const total = data.total ? '/ 总额 ¥' + parseFloat(data.total).toFixed(2) : '';
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