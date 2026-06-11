// ========== API Key 管理 + TTS 设置面板 ==========
// (拆自 index.html v0.8.4)

const API_KEYS_KEY = 'codingplan-api-keys';
function getApiKeys() {
  try {
    return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}');
  } catch (e) { return {}; }
}
function setApiKeys(keys) {
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
}
function getCodingplanKey() {
  return getApiKeys().codingplan || '';
}
function getCodingplanBaseURL() {
  return getApiKeys().baseURL || '';
}
function getSearchKey() {
  return getApiKeys().search || '';
}

function showApiKeyDialog() {
  const keys = getApiKeys();
  const codingplanKey = keys.codingplan || '';
  const baseURL = keys.baseURL || '';
  const searchKey = keys.search || '';
  const hasCustomCodingplan = !!codingplanKey;
  const hasCustomBaseURL = !!baseURL;
  const hasCustomSearch = !!searchKey;

  let html = '<div style="text-align:center;margin-bottom:16px;font-size:16px;font-weight:700;color:var(--text-main)">🔑 API Key 设置</div>';

  // ===== 多模型 Provider 入口（v0.9.0+ 改造：从顶栏徽章迁来）=====
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--input-bg);border-radius:10px;border:1px dashed var(--sidebar-divider)">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:6px">🤖 模型 Provider 切换</div>';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;line-height:1.5">';
  html += '默认走火山 CodingPlan（免费共享 key）。如需切到 <b>智谱 GLM / DeepSeek / Kimi / OpenAI 兼容 / Claude</b> 等第三方 provider 并填自己的 Key，请打开下方面板。';
  html += '</div>';
  html += '<button id="open-provider-dialog-btn" style="width:100%;padding:8px 14px;border-radius:8px;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--btn-color);cursor:pointer;font-size:12px;font-family:inherit">⚙️ 打开「多 Provider 配置」面板</button>';
  html += '</div>';

  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px">CodingPlan API Key</div>';
  html += `<input id="apikey-codingplan" type="password" placeholder="${hasCustomCodingplan ? '已设置自定义 Key' : '使用默认 Key'}" value="${codingplanKey}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit">`;
  html += `<div style="font-size:10px;color:var(--text-dim);margin-top:3px">留空使用默认火山引擎 Key</div>`;
  html += '</div>';

  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px">API Base URL</div>';
  html += `<input id="apikey-baseurl" type="text" placeholder="${hasCustomBaseURL ? '已设置自定义地址' : 'https://ark.cn-beijing.volces.com/api/coding/v3'}" value="${baseURL}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit">`;
  html += `<div style="font-size:10px;color:var(--text-dim);margin-top:3px">可接入其他兼容 OpenAI 格式的 API</div>`;
  html += '</div>';

  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px">联网搜索 API Key（博查）</div>';
  html += `<input id="apikey-search" type="password" placeholder="${hasCustomSearch ? '已设置自定义 Key' : '使用默认 Key'}" value="${searchKey}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit">`;
  html += `<div style="font-size:10px;color:var(--text-dim);margin-top:3px">留空使用默认博查 Key，<a href="https://open.bochaai.com" target="_blank" style="color:#3b82f6">获取博查 Key</a></div>`;
  html += '</div>';

  // ===== 语音朗读（TTS）设置 =====
  const ttsCfg = getTTSConfig();
  html += '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--sidebar-divider)">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:10px">🔊 语音朗读（TTS）</div>';

  // 引擎选择
  html += '<div style="margin-bottom:10px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px">语音引擎</div>';
  html += `<select id="tts-provider" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit">
    <option value="browser" ${ttsCfg.provider === 'browser' ? 'selected' : ''}>浏览器原生（默认，离线可用 ⭐）</option>
    <option value="volc" ${ttsCfg.provider === 'volc' ? 'selected' : ''}>火山引擎 TTS（豆包同源，需 AppID + Token）</option>
    <option value="edge" ${ttsCfg.provider === 'edge' ? 'selected' : ''}>Edge 神经 TTS（⚠️ 需 Chrome 扩展环境，普通浏览器不可用）</option>
  </select>`;
  html += `<div style="font-size:10px;color:var(--text-dim);margin-top:3px">默认浏览器原生即可使用；火山为云端神经 TTS，需自备 AppID+Token</div>`;
  html += '</div>';

  // 音色选择（动态根据引擎切换可选项，JS 注入）
  html += '<div style="margin-bottom:10px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px">音色</div>';
  html += `<select id="tts-voice" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit"></select>`;
  html += '</div>';

  // 语速
  html += '<div style="margin-bottom:10px">';
  html += `<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:4px;display:flex;justify-content:space-between"><span>语速</span><span id="tts-rate-val" style="color:var(--text-dim)">${ttsCfg.rate.toFixed(1)}x</span></div>`;
  html += `<input id="tts-rate" type="range" min="0.5" max="2.0" step="0.1" value="${ttsCfg.rate}" style="width:100%;accent-color:#ff6b35" oninput="document.getElementById('tts-rate-val').textContent=this.value+'x'">`;
  html += '</div>';

  // 火山专属字段（默认隐藏）
  html += `<div id="tts-volc-fields" style="display:${ttsCfg.provider === 'volc' ? 'block' : 'none'};padding:10px;background:var(--input-bg);border-radius:8px;margin-top:8px">`;
  html += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">在 <a href="https://console.volcengine.com/speech/app" target="_blank" style="color:#3b82f6">火山引擎控制台</a> 开通"语音合成大模型"，新建应用拿 AppID 和 Access Token</div>';
  html += `<input id="tts-volc-appid" type="text" placeholder="火山 AppID" value="${ttsCfg.volcAppid}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit;margin-bottom:6px">`;
  html += `<input id="tts-volc-token" type="password" placeholder="火山 Access Token" value="${ttsCfg.volcToken}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:inherit">`;
  html += '</div>';

  // 试听按钮
  html += '<button id="tts-test-btn" style="width:100%;margin-top:10px;padding:8px 14px;border-radius:10px;border:1px dashed var(--btn-border);background:transparent;color:var(--text-main);cursor:pointer;font-size:12px;font-family:inherit">🎧 试听当前配置</button>';
  html += '</div>';

  // 弹窗
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  const dialog = document.createElement('div');
  // v0.9.2: 加 max-height + 滚动 + flex 布局，防内容超出按钮看不到
  dialog.style.cssText = 'max-width:400px;width:100%;max-height:90vh;display:flex;flex-direction:column;border-radius:18px;background:var(--sidebar-bg);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid var(--sidebar-border);box-shadow:0 16px 48px rgba(0,0,0,0.25);color:var(--text-main);overflow:hidden';

  // 可滚动内容区
  const scrollBox = document.createElement('div');
  scrollBox.style.cssText = 'padding:20px;overflow-y:auto;flex:1;min-height:0';
  scrollBox.innerHTML = html;
  dialog.appendChild(scrollBox);
  dialog.onclick = function(e) { e.stopPropagation(); };

  const btnRow = document.createElement('div');
  // v0.9.2: sticky 底部，永远可见，不参与 scrollBox 滚动
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--sidebar-divider);background:var(--sidebar-bg);flex:0 0 auto';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.style.cssText = 'padding:8px 18px;border-radius:10px;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--btn-color);cursor:pointer;font-size:13px;font-family:inherit';
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.style.cssText = 'padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff6b35,#ff3d00);color:#fff;cursor:pointer;font-size:13px;font-family:inherit';
  saveBtn.onclick = () => {
    const codingplanVal = document.getElementById('apikey-codingplan').value.trim();
    const baseURLVal = document.getElementById('apikey-baseurl').value.trim();
    const searchVal = document.getElementById('apikey-search').value.trim();
    const keys = {};
    if (codingplanVal) keys.codingplan = codingplanVal;
    if (baseURLVal) keys.baseURL = baseURLVal;
    if (searchVal) keys.search = searchVal;
    setApiKeys(keys);

    // 保存 TTS 配置
    const newTTS = {
      provider: document.getElementById('tts-provider').value,
      voice: document.getElementById('tts-voice').value,
      rate: parseFloat(document.getElementById('tts-rate').value),
      volcAppid: document.getElementById('tts-volc-appid').value.trim(),
      volcToken: document.getElementById('tts-volc-token').value.trim(),
    };
    setTTSConfig(newTTS);

    overlay.remove();
    const providerLabel = { edge: 'Edge 神经 TTS', volc: '火山引擎 TTS', browser: '浏览器原生' }[newTTS.provider];
    alert('✅ 设置已保存！\n\n' +
      (codingplanVal ? 'CodingPlan Key：自定义\n' : 'CodingPlan Key：使用默认\n') +
      (baseURLVal ? 'Base URL：自定义\n' : 'Base URL：使用默认\n') +
      (searchVal ? '搜索 Key：自定义\n' : '搜索 Key：使用默认\n') +
      `🔊 语音引擎：${providerLabel}（${newTTS.voice}，${newTTS.rate}x）`);
  };

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // ===== TTS 控件动态行为 =====
  const VOICE_OPTIONS = {
    edge: [
      { v: 'yunxi',    n: '云希（阳光男声，推荐）' },
      { v: 'yunyang',  n: '云扬（成熟男主播）' },
      { v: 'yunjian',  n: '云健（沉稳男声）' },
      { v: 'yunxia',   n: '云夏（年轻男孩）' },
      { v: 'xiaoxiao', n: '晓晓（温暖女声）' },
      { v: 'xiaoyi',   n: '晓伊（智能助手女）' },
      { v: 'xiaomeng', n: '晓梦（甜美女声）' },
      { v: 'xiaohan',  n: '晓涵（温柔女声）' },
    ],
    volc: [
      { v: 'yangguang',  n: '阳光青年（豆包默认男声）' },
      { v: 'cixing',     n: '磁性男主播' },
      { v: 'shaonian',   n: '少年音' },
      { v: 'huoli_nan',  n: '活力男生' },
      { v: 'tianmei',    n: '灿灿（通用女声）' },
      { v: 'donfang_nv', n: '东方女声' },
      { v: 'xiaomei',    n: '灵动女声' },
      { v: 'wencheng',   n: '温柔成熟女声' },
    ],
    browser: [
      { v: 'system', n: '系统默认（旧版机器音）' },
    ],
  };

  const providerSel = document.getElementById('tts-provider');
  const voiceSel = document.getElementById('tts-voice');
  const volcFields = document.getElementById('tts-volc-fields');
  const testBtn = document.getElementById('tts-test-btn');

  function refreshVoiceOptions() {
    const p = providerSel.value;
    const opts = VOICE_OPTIONS[p] || [];
    const currentSaved = getTTSConfig().voice;
    voiceSel.innerHTML = opts.map(o =>
      `<option value="${o.v}" ${o.v === currentSaved ? 'selected' : ''}>${o.n}</option>`
    ).join('');
    volcFields.style.display = p === 'volc' ? 'block' : 'none';
  }
  refreshVoiceOptions();
  providerSel.addEventListener('change', refreshVoiceOptions);

  // ===== Provider 配置按钮：关闭当前面板 + 打开 Provider Dialog =====
  const openProviderBtn = document.getElementById('open-provider-dialog-btn');
  if (openProviderBtn) {
    openProviderBtn.addEventListener('click', () => {
      overlay.remove();
      if (typeof showProviderDialog === 'function') showProviderDialog();
      else alert('Provider 配置模块未加载，请刷新页面');
    });
  }

  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = '🎧 合成中...';
    // 临时配置（不写 localStorage）
    const tempCfg = {
      provider: providerSel.value,
      voice: voiceSel.value,
      rate: parseFloat(document.getElementById('tts-rate').value),
      volcAppid: document.getElementById('tts-volc-appid').value.trim(),
      volcToken: document.getElementById('tts-volc-token').value.trim(),
    };
    try {
      if (tempCfg.provider === 'browser') {
        speakWithBrowser('你好，泠。这是当前语音设置的试听效果。', tempCfg);
      } else {
        const blob = await fetchTTSAudio('你好，泠。这是当前语音设置的试听效果。', tempCfg);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.addEventListener('ended', () => URL.revokeObjectURL(url));
        await audio.play();
      }
      testBtn.textContent = '✅ 已播放';
    } catch (e) {
      testBtn.textContent = '❌ 失败：' + (e.message || '').slice(0, 30);
    }
    setTimeout(() => { testBtn.disabled = false; testBtn.textContent = '🎧 试听当前配置'; }, 2500);
  });
}
// ========== 更新日志 ==========