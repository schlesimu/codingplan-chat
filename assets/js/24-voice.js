/* v0.9.8.4 — 语音模块 (B 加号菜单 + C 语音输入 + D 通话页 + E 语音 API 设置)
 * 阶段 1：用 doubao 多模态音频接口模拟通话；
 * 阶段 2（v0.9.9）：接入火山 RTC 真·全双工。
 */

/* ===== 默认语音配置 ===== */
const VOICE_CONFIG_KEY = 'codingplan-voice-config';
const DEFAULT_VOICE_CONFIG = {
  asrProvider: 'doubao-multimodal',     // doubao-multimodal | volc-asr | volc-rtc(v0.9.9)
  asrApiKey: '',                         // 留空 = 沿用主 LLM provider 的 key
  asrEndpoint: 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions',
  asrModel: 'doubao-seed-1.6-flash',     // 推荐音频多模态模型
  ttsProvider: 'browser',                // browser | volc-tts
  ttsApiKey: '',
  ttsVoice: 'zh-CN-XiaoxiaoNeural',      // 浏览器原生 voice 名
  ttsRate: 1.0,
  rtcAppId: '',                          // v0.9.9 占位
};

function getVoiceConfig() {
  try {
    const raw = localStorage.getItem(VOICE_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_VOICE_CONFIG };
    return { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_VOICE_CONFIG }; }
}
function saveVoiceConfigData(cfg) {
  localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(cfg));
}

/* 解析最终调用 key/endpoint：优先用语音单独配置，否则沿用主 provider */
function resolveVoiceApiCreds() {
  const cfg = getVoiceConfig();
  if (cfg.asrApiKey) {
    return { apiKey: cfg.asrApiKey, endpoint: cfg.asrEndpoint, model: cfg.asrModel };
  }
  // 沿用主 provider（应是 codingplan / doubao）
  try {
    const pid = (typeof getActiveProvider === 'function') ? getActiveProvider() : 'codingplan';
    const pcfg = (typeof getProviderConfig === 'function') ? getProviderConfig(pid) : {};
    const apiKey = pcfg.apiKey || '';
    return { apiKey, endpoint: cfg.asrEndpoint, model: cfg.asrModel };
  } catch {
    return { apiKey: '', endpoint: cfg.asrEndpoint, model: cfg.asrModel };
  }
}

/* ============================================================
 * B 模块：加号 popover 菜单
 * ============================================================ */
function toggleAddMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('addMenu');
  const ov = document.getElementById('addMenuOverlay');
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  if (isOpen) { closeAddMenu(); return; }
  // 计算定位（贴在 addBtn 上方）
  const btn = document.getElementById('addBtn');
  if (btn) {
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, r.left) + 'px';
    menu.style.bottom = (window.innerHeight - r.top + 8) + 'px';
  }
  menu.classList.add('open');
  ov.classList.add('open');
}
function closeAddMenu() {
  document.getElementById('addMenu')?.classList.remove('open');
  document.getElementById('addMenuOverlay')?.classList.remove('open');
}
function addMenuPick(kind) {
  closeAddMenu();
  if (kind === 'image') {
    document.getElementById('imgInput')?.click();
  } else if (kind === 'file') {
    const inp = document.getElementById('addFileInput');
    if (inp) {
      inp.accept = '.pdf,.txt,.md,.markdown,.js,.ts,.py,.json,.html,.css,.yaml,.yml,.docx,.csv';
      inp.click();
    }
  } else if (kind === 'call') {
    openCallModal();
  }
}
async function handleAddFileUpload(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  if (typeof handleFileUpload === 'function') {
    await handleFileUpload(files);
  }
  e.target.value = '';
}
window.toggleAddMenu = toggleAddMenu;
window.closeAddMenu = closeAddMenu;
window.addMenuPick = addMenuPick;
window.handleAddFileUpload = handleAddFileUpload;

/* ============================================================
 * C 模块：语音输入按钮（按住录音 → ASR → 回填输入框）
 * ============================================================ */
let _voiceRecorder = null;
let _voiceChunks = [];
let _voiceStream = null;
let _voiceStartTs = 0;
let _voiceMaxTimer = null;
const VOICE_MAX_MS = 60000;

async function startVoiceRecord(targetMode) {
  // targetMode: 'input' (填到输入框) | 'call' (通话页)
  if (_voiceRecorder) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('🌫️ 这台设备的浏览器不支持麦克风录音');
    return;
  }
  try {
    _voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert('🌫️ 无法访问麦克风：' + (err.message || err.name || '未知错误') + '\n请检查浏览器麦克风权限');
    return;
  }
  // 选最优 mime
  const mimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  let mime = '';
  for (const m of mimes) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) { mime = m; break; }
  }
  _voiceChunks = [];
  _voiceRecorder = new MediaRecorder(_voiceStream, mime ? { mimeType: mime } : undefined);
  _voiceRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) _voiceChunks.push(e.data); };
  _voiceRecorder.onstop = () => onVoiceRecorded(targetMode);
  _voiceRecorder.start();
  _voiceStartTs = Date.now();
  // UI 提示
  if (targetMode === 'input') {
    document.getElementById('voiceBtn')?.classList.add('recording');
    showVoiceToast('🎙️ 小纸船在听...');
  } else {
    document.getElementById('callMicBtn')?.classList.add('recording');
    setCallStatus('🎙️ 正在听你说...');
  }
  // 60 秒上限
  _voiceMaxTimer = setTimeout(() => { stopVoiceRecord(targetMode); }, VOICE_MAX_MS);
}

function stopVoiceRecord(targetMode) {
  if (_voiceMaxTimer) { clearTimeout(_voiceMaxTimer); _voiceMaxTimer = null; }
  if (_voiceRecorder && _voiceRecorder.state !== 'inactive') {
    try { _voiceRecorder.stop(); } catch {}
  }
  if (_voiceStream) {
    _voiceStream.getTracks().forEach(t => t.stop());
    _voiceStream = null;
  }
  if (targetMode === 'input') {
    document.getElementById('voiceBtn')?.classList.remove('recording');
  } else {
    document.getElementById('callMicBtn')?.classList.remove('recording');
  }
}

async function onVoiceRecorded(targetMode) {
  const duration = Date.now() - _voiceStartTs;
  const recorder = _voiceRecorder;
  _voiceRecorder = null;
  if (duration < 400) {
    hideVoiceToast();
    setCallStatus('⌛ 太短了，按住久一点再说话 🚢');
    return;
  }
  const blob = new Blob(_voiceChunks, { type: recorder?.mimeType || 'audio/webm' });
  _voiceChunks = [];
  if (targetMode === 'input') {
    showVoiceToast('🌫️ 小纸船在打捞文字...');
  } else {
    setCallStatus('🌫️ 小纸船在打捞你说的话...');
  }
  let text = '';
  try {
    text = await transcribeAudioBlob(blob);
  } catch (err) {
    if (targetMode === 'input') showVoiceToast('🌫️ 转写失败：' + (err.message || err));
    else setCallStatus('🌫️ 没接住，再来一次：' + (err.message || err));
    setTimeout(hideVoiceToast, 2500);
    return;
  }
  if (!text) {
    if (targetMode === 'input') showVoiceToast('🌫️ 没听清，再说一次？');
    else setCallStatus('🌫️ 没听清，按住再说一次？');
    setTimeout(hideVoiceToast, 2000);
    return;
  }
  if (targetMode === 'input') {
    hideVoiceToast();
    const ti = document.getElementById('userInput');
    if (ti) {
      const prev = ti.value.trim();
      ti.value = prev ? (prev + ' ' + text) : text;
      ti.focus();
      ti.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    // 通话页：触发整轮 (用户文字 → LLM → TTS)
    await callOneTurn(text);
  }
}

/* ASR：把 audio blob 送 doubao 多模态 chat completions */
async function transcribeAudioBlob(blob) {
  const { apiKey, endpoint, model } = resolveVoiceApiCreds();
  if (!apiKey) throw new Error('未配置 API Key（设置 → 设置 API Key）');
  // 转 base64
  const b64 = await blobToBase64(blob);
  const fmt = blob.type.includes('mp4') ? 'mp4' : (blob.type.includes('ogg') ? 'ogg' : 'webm');
  const body = {
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'input_audio', input_audio: { data: b64, format: fmt } },
        { type: 'text', text: '请把上面这段音频的语音内容完整转写为文字，只输出转写结果，不要任何解释或前缀。' }
      ]
    }],
    temperature: 0.1,
  };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error('HTTP ' + r.status + ' ' + errText.slice(0, 200));
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return (typeof text === 'string' ? text : JSON.stringify(text)).trim();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = fr.result || '';
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/* 简易 toast */
function showVoiceToast(msg) {
  let t = document.getElementById('voiceToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'voiceToast';
    t.className = 'voice-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
}
function hideVoiceToast() {
  document.getElementById('voiceToast')?.classList.remove('show');
}

/* ============================================================
 * D 模块：通话页（按住说话单轮版）
 * ============================================================ */
let _callHistory = [];
let _callTtsUtter = null;

function openCallModal() {
  const m = document.getElementById('callModal');
  if (!m) return;
  m.classList.add('open');
  document.body.classList.add('call-active');
  _callHistory = [{ role: 'system', content: '你是用户的实时语音通话伙伴「小纸船」。回复必须像真人讲电话：自然口语、不用 markdown、不用列表、不用代码块、每次回复尽量控制在 60 字以内，必要时主动追问一句让对话能继续。' }];
  setCallStatus('按住下方按钮说话 🚢');
  document.getElementById('callTranscript').innerHTML = '';
}
function closeCallModal() {
  document.getElementById('callModal')?.classList.remove('open');
  document.body.classList.remove('call-active');
  // 停止录音 + TTS
  if (_voiceRecorder) stopVoiceRecord('call');
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function setCallStatus(text) {
  const el = document.getElementById('callStatus');
  if (el) el.textContent = text;
}
function appendCallTranscript(role, text) {
  const wrap = document.getElementById('callTranscript');
  if (!wrap) return;
  const line = document.createElement('div');
  line.className = 'call-line call-line-' + role;
  line.innerHTML = '<span class="call-line-tag">' + (role === 'user' ? '你' : '🚢') + '</span><span class="call-line-text"></span>';
  line.querySelector('.call-line-text').textContent = text;
  wrap.appendChild(line);
  wrap.scrollTop = wrap.scrollHeight;
}

async function callOneTurn(userText) {
  appendCallTranscript('user', userText);
  _callHistory.push({ role: 'user', content: userText });
  setCallStatus('🌊 小纸船在思考...');
  // 调主 chat completions
  let reply = '';
  try {
    reply = await callChatCompletion(_callHistory);
  } catch (err) {
    setCallStatus('🌫️ 网络迷航：' + (err.message || err));
    return;
  }
  _callHistory.push({ role: 'assistant', content: reply });
  appendCallTranscript('assistant', reply);
  setCallStatus('🚢 小纸船在说话...');
  await speakText(reply);
  setCallStatus('按住下方按钮继续 🚢');
}

async function callChatCompletion(messages) {
  const { apiKey, endpoint, model } = resolveVoiceApiCreds();
  if (!apiKey) throw new Error('未配置 API Key');
  const body = { model, messages, temperature: 0.7, max_tokens: 200 };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 200));
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

/* TTS：浏览器原生优先；可后续切火山 */
function speakText(text) {
  return new Promise((resolve) => {
    const cfg = getVoiceConfig();
    if (cfg.ttsProvider !== 'browser' || !('speechSynthesis' in window)) {
      resolve(); return;
    }
    try { speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = cfg.ttsRate || 1.0;
    // 选个中文 voice
    const voices = speechSynthesis.getVoices();
    const zh = voices.find(v => /zh|Chinese|中文/i.test(v.lang + v.name));
    if (zh) u.voice = zh;
    u.onend = resolve;
    u.onerror = resolve;
    _callTtsUtter = u;
    speechSynthesis.speak(u);
  });
}

/* ============================================================
 * E 模块：语音 API 设置 modal
 * ============================================================ */
function showVoiceConfigDialog() {
  const cfg = getVoiceConfig();
  const body = document.getElementById('voiceConfigBody');
  if (!body) return;
  body.innerHTML = renderVoiceConfigForm(cfg);
  document.getElementById('voiceConfigModal').classList.add('open');
}
function closeVoiceConfigDialog() {
  document.getElementById('voiceConfigModal')?.classList.remove('open');
}
function renderVoiceConfigForm(cfg) {
  return `
    <div class="vc-section">
      <div class="vc-section-title">🎧 语音识别（ASR）</div>
      <label class="vc-row">
        <span class="vc-label">服务商</span>
        <select id="vcAsrProvider" class="vc-input">
          <option value="doubao-multimodal" ${cfg.asrProvider==='doubao-multimodal'?'selected':''}>豆包多模态（推荐 · 当前可用）</option>
          <option value="volc-asr" ${cfg.asrProvider==='volc-asr'?'selected':''}>火山豆包 ASR（需单独开通）</option>
          <option value="volc-rtc" ${cfg.asrProvider==='volc-rtc'?'selected':''}>火山 RTC 实时对话（v0.9.9 上线）</option>
        </select>
      </label>
      <label class="vc-row">
        <span class="vc-label">Endpoint</span>
        <input id="vcAsrEndpoint" class="vc-input" type="text" value="${escapeAttr(cfg.asrEndpoint)}" placeholder="https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions">
      </label>
      <label class="vc-row">
        <span class="vc-label">模型</span>
        <select id="vcAsrModel" class="vc-input">
          <option value="doubao-seed-1.6-flash" ${cfg.asrModel==='doubao-seed-1.6-flash'?'selected':''}>doubao-seed-1.6-flash（推荐）</option>
          <option value="doubao-seed-1.6" ${cfg.asrModel==='doubao-seed-1.6'?'selected':''}>doubao-seed-1.6</option>
          <option value="ark-code-latest" ${cfg.asrModel==='ark-code-latest'?'selected':''}>ark-code-latest（auto）</option>
          <option value="__custom__" ${!['doubao-seed-1.6-flash','doubao-seed-1.6','ark-code-latest'].includes(cfg.asrModel)?'selected':''}>自定义...</option>
        </select>
      </label>
      <label class="vc-row" id="vcAsrModelCustomRow" style="display:${!['doubao-seed-1.6-flash','doubao-seed-1.6','ark-code-latest'].includes(cfg.asrModel)?'flex':'none'}">
        <span class="vc-label">自定义模型</span>
        <input id="vcAsrModelCustom" class="vc-input" type="text" value="${escapeAttr(!['doubao-seed-1.6-flash','doubao-seed-1.6','ark-code-latest'].includes(cfg.asrModel)?cfg.asrModel:'')}" placeholder="模型 ID">
      </label>
      <label class="vc-row">
        <span class="vc-label">API Key</span>
        <input id="vcAsrApiKey" class="vc-input" type="password" value="${escapeAttr(cfg.asrApiKey)}" placeholder="留空 = 沿用主 LLM 的 API Key">
      </label>
      <div class="vc-tip">💡 留空 API Key 即沿用「设置 API Key」里当前 provider 的密钥，无需重复填</div>
    </div>

    <div class="vc-section">
      <div class="vc-section-title">🔊 语音合成（TTS）</div>
      <label class="vc-row">
        <span class="vc-label">服务商</span>
        <select id="vcTtsProvider" class="vc-input">
          <option value="browser" ${cfg.ttsProvider==='browser'?'selected':''}>浏览器原生（免费 · 音色受设备限制）</option>
          <option value="volc-tts" ${cfg.ttsProvider==='volc-tts'?'selected':''}>火山豆包 TTS（v0.9.9 接入）</option>
          <option value="none" ${cfg.ttsProvider==='none'?'selected':''}>不朗读 · 仅文字</option>
        </select>
      </label>
      <label class="vc-row">
        <span class="vc-label">语速</span>
        <input id="vcTtsRate" class="vc-input" type="number" min="0.5" max="2.0" step="0.1" value="${cfg.ttsRate}">
      </label>
    </div>

    <div class="vc-section vc-section-stage2">
      <div class="vc-section-title">✨ 实时对话（v0.9.9 阶段 2）</div>
      <label class="vc-row">
        <span class="vc-label">火山 RTC App ID</span>
        <input id="vcRtcAppId" class="vc-input" type="text" value="${escapeAttr(cfg.rtcAppId)}" placeholder="待 v0.9.9 启用">
      </label>
      <div class="vc-tip">
        🚢 真·全双工实时对话（&lt;1s 延迟 · 可打断 · AI 降噪）需在
        <a href="https://console.volcengine.com/rtc" target="_blank">火山控制台</a> 开通 RTC + ASR + TTS 三件套，
        将在 v0.9.9 接入。
      </div>
    </div>
  `;
}
function escapeAttr(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

function saveVoiceConfig() {
  const cfg = getVoiceConfig();
  cfg.asrProvider = document.getElementById('vcAsrProvider').value;
  cfg.asrEndpoint = document.getElementById('vcAsrEndpoint').value.trim() || DEFAULT_VOICE_CONFIG.asrEndpoint;
  const modelSel = document.getElementById('vcAsrModel').value;
  cfg.asrModel = (modelSel === '__custom__') ? (document.getElementById('vcAsrModelCustom').value.trim() || DEFAULT_VOICE_CONFIG.asrModel) : modelSel;
  cfg.asrApiKey = document.getElementById('vcAsrApiKey').value.trim();
  cfg.ttsProvider = document.getElementById('vcTtsProvider').value;
  cfg.ttsRate = parseFloat(document.getElementById('vcTtsRate').value) || 1.0;
  cfg.rtcAppId = document.getElementById('vcRtcAppId').value.trim();
  saveVoiceConfigData(cfg);
  closeVoiceConfigDialog();
  if (typeof showToast === 'function') showToast('🎙️ 语音设置已保存');
}
function resetVoiceConfig() {
  if (!confirm('恢复语音 API 设置为默认值？')) return;
  saveVoiceConfigData({ ...DEFAULT_VOICE_CONFIG });
  showVoiceConfigDialog();
}

/* 语音模型下拉切换自定义 */
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'vcAsrModel') {
    const row = document.getElementById('vcAsrModelCustomRow');
    if (row) row.style.display = (e.target.value === '__custom__') ? 'flex' : 'none';
  }
});

window.showVoiceConfigDialog = showVoiceConfigDialog;
window.closeVoiceConfigDialog = closeVoiceConfigDialog;
window.saveVoiceConfig = saveVoiceConfig;
window.resetVoiceConfig = resetVoiceConfig;
window.openCallModal = openCallModal;
window.closeCallModal = closeCallModal;

/* ============================================================
 * 绑定语音按钮 + 通话麦克风按钮（按住）
 * ============================================================ */
function _bindVoiceButtons() {
  const v = document.getElementById('voiceBtn');
  if (v) {
    const start = (ev) => { ev.preventDefault(); startVoiceRecord('input'); };
    const stop = (ev) => { ev.preventDefault(); stopVoiceRecord('input'); };
    v.addEventListener('mousedown', start);
    v.addEventListener('mouseup', stop);
    v.addEventListener('mouseleave', stop);
    v.addEventListener('touchstart', start, { passive: false });
    v.addEventListener('touchend', stop);
    v.addEventListener('touchcancel', stop);
  }
  const m = document.getElementById('callMicBtn');
  if (m) {
    const start = (ev) => { ev.preventDefault(); startVoiceRecord('call'); };
    const stop = (ev) => { ev.preventDefault(); stopVoiceRecord('call'); };
    m.addEventListener('mousedown', start);
    m.addEventListener('mouseup', stop);
    m.addEventListener('mouseleave', stop);
    m.addEventListener('touchstart', start, { passive: false });
    m.addEventListener('touchend', stop);
    m.addEventListener('touchcancel', stop);
  }
  // ESC 关 modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddMenu();
      if (document.getElementById('callModal')?.classList.contains('open')) closeCallModal();
      if (document.getElementById('voiceConfigModal')?.classList.contains('open')) closeVoiceConfigDialog();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bindVoiceButtons);
} else {
  _bindVoiceButtons();
}
