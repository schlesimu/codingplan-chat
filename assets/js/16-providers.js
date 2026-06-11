// ========== LLM Provider 抽象层（v0.9.0 新增）==========
// 多模型支持：CodingPlan（默认免费）/ 智谱 GLM / DeepSeek / OpenAI 兼容 / Anthropic Claude / Moonshot Kimi
// 每个 provider 知道自己的 endpoint / 鉴权方式 / 模型列表
// 大多数 provider 走 OpenAI 兼容协议，浏览器直连官方 API（不经过 CF Functions）
// 只有 CodingPlan（默认通道）走后端 /api/chat 中转（用平台共享 key）

const PROVIDERS = {
  codingplan: {
    id: 'codingplan',
    label: '🔥 火山 CodingPlan（默认免费）',
    description: '平台共享 key，无需配置，开箱即用',
    needsKey: false,
    backend: 'cf-proxy',   // 走 /api/chat
    models: [
      { id: 'ark-code-latest', label: 'CodingPlan Latest', default: true },
    ],
    docsUrl: 'https://www.volcengine.com/product/coding-copilot',
  },
  zhipu: {
    id: 'zhipu',
    label: '🧠 智谱 GLM（zhipu.ai）',
    description: 'GLM-4.5 / GLM-4.5-Air / GLM-4-Flash 免费版',
    needsKey: true,
    backend: 'openai-compatible',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: [
      { id: 'glm-4-flash', label: 'GLM-4-Flash（免费）', default: true },
      { id: 'glm-4.5-air', label: 'GLM-4.5-Air' },
      { id: 'glm-4.5', label: 'GLM-4.5' },
      { id: 'glm-4-plus', label: 'GLM-4-Plus' },
    ],
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyHelp: '到 https://open.bigmodel.cn/usercenter/apikeys 创建 API Key',
  },
  deepseek: {
    id: 'deepseek',
    label: '🐳 DeepSeek（deepseek.com）',
    description: 'DeepSeek V3 / R1 推理模型',
    needsKey: true,
    backend: 'openai-compatible',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3（对话）', default: true },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1（推理）' },
    ],
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyHelp: '到 https://platform.deepseek.com/api_keys 创建 API Key',
  },
  moonshot: {
    id: 'moonshot',
    label: '🌙 Moonshot Kimi（moonshot.cn）',
    description: 'Kimi 长上下文 8k / 32k / 128k',
    needsKey: true,
    backend: 'openai-compatible',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    models: [
      { id: 'moonshot-v1-8k', label: 'Kimi 8k', default: true },
      { id: 'moonshot-v1-32k', label: 'Kimi 32k' },
      { id: 'moonshot-v1-128k', label: 'Kimi 128k' },
    ],
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    keyHelp: '到 https://platform.moonshot.cn/console/api-keys 创建 API Key',
  },
  openai: {
    id: 'openai',
    label: '🤖 OpenAI 兼容（自定义）',
    description: '支持 OpenAI 官方、One-API、新 API 等所有 OpenAI 兼容协议',
    needsKey: true,
    needsCustomEndpoint: true,
    needsCustomModel: true,
    backend: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',  // 默认值
    models: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini', default: true },
      { id: 'gpt-4o', label: 'gpt-4o' },
      { id: 'gpt-4-turbo', label: 'gpt-4-turbo' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
    keyHelp: '填 OpenAI 官方或任何 OpenAI 兼容服务的 endpoint 和 key',
  },
  anthropic: {
    id: 'anthropic',
    label: '🦋 Anthropic Claude（直连，需代理）',
    description: 'Claude Sonnet 4.5 / Opus 4 - 浏览器直连受 CORS 限制，建议通过代理',
    needsKey: true,
    backend: 'anthropic',  // 特殊协议
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: [
      { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', default: true },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { id: 'claude-haiku-4-5-20251022', label: 'Claude Haiku 4.5' },
    ],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyHelp: '⚠️ Anthropic 官方端点不允许浏览器直连，需通过 OpenRouter 或自建代理',
  },
};

const ACTIVE_PROVIDER_KEY = 'codingplan-active-provider';
const ACTIVE_MODEL_KEY = 'codingplan-active-model';
const PROVIDER_KEYS_KEY = 'codingplan-provider-keys';   // {providerId: {key, endpoint?, model?}}

function getActiveProvider() {
  return localStorage.getItem(ACTIVE_PROVIDER_KEY) || 'codingplan';
}
function setActiveProvider(pid) {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, pid);
}
function getActiveModel() {
  const pid = getActiveProvider();
  const cfg = getProviderConfig(pid);
  if (cfg.model) return cfg.model;
  const provider = PROVIDERS[pid];
  if (!provider) return null;
  const def = provider.models.find(m => m.default) || provider.models[0];
  return def?.id;
}
function setActiveModel(modelId) {
  const pid = getActiveProvider();
  const cfg = getProviderConfig(pid);
  cfg.model = modelId;
  saveProviderConfig(pid, cfg);
}

function getAllProviderConfigs() {
  try { return JSON.parse(localStorage.getItem(PROVIDER_KEYS_KEY) || '{}'); }
  catch (e) { return {}; }
}
function getProviderConfig(pid) {
  const all = getAllProviderConfigs();
  return all[pid] || {};
}
function saveProviderConfig(pid, cfg) {
  const all = getAllProviderConfigs();
  all[pid] = { ...all[pid], ...cfg };
  localStorage.setItem(PROVIDER_KEYS_KEY, JSON.stringify(all));
}

// ========== 统一调用入口 ==========
// 替换原 callAI：根据当前 provider 路由到 cf-proxy / openai-compatible / anthropic
async function callLLMProvider(sendMessages, onDelta, options = {}) {
  const pid = getActiveProvider();
  const provider = PROVIDERS[pid];
  if (!provider) throw new Error('未知 provider: ' + pid);

  const cfg = getProviderConfig(pid);
  const modelId = getActiveModel();

  if (provider.backend === 'cf-proxy') {
    return await callViaCFProxy(sendMessages, onDelta, options);
  }
  if (provider.backend === 'openai-compatible') {
    return await callOpenAICompatible(provider, cfg, modelId, sendMessages, onDelta, options);
  }
  if (provider.backend === 'anthropic') {
    return await callAnthropicDirect(provider, cfg, modelId, sendMessages, onDelta, options);
  }
  throw new Error('未实现的 backend: ' + provider.backend);
}

// ===== CF Proxy（默认 CodingPlan）=====
async function callViaCFProxy(sendMessages, onDelta, options) {
  const codingplanKey = getCodingplanKey();
  const baseURL = getCodingplanBaseURL();
  const headers = { 'Content-Type': 'application/json' };
  if (codingplanKey) headers['X-Codingplan-Key'] = codingplanKey;
  if (baseURL) headers['X-Codingplan-Base'] = baseURL;

  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages: sendMessages, stream: true }),
    signal: options.signal,
  });
  return await readSSE(resp, onDelta);
}

// ===== OpenAI 兼容协议（智谱/DeepSeek/Moonshot/OpenAI/One-API）=====
async function callOpenAICompatible(provider, cfg, modelId, sendMessages, onDelta, options) {
  const key = cfg.key;
  if (!key) throw new Error(`${provider.label} 需要 API Key，请在设置中配置`);
  const endpoint = (provider.needsCustomEndpoint && cfg.endpoint) ? cfg.endpoint : provider.endpoint;
  const model = (provider.needsCustomModel && cfg.customModel) ? cfg.customModel : modelId;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
    },
    body: JSON.stringify({
      model,
      messages: sendMessages,
      stream: true,
      temperature: 0.7,
    }),
    signal: options.signal,
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`${provider.label} ${resp.status}: ${errTxt.slice(0, 200)}`);
  }
  return await readSSE(resp, onDelta);
}

// ===== Anthropic 直连（用 messages API，特殊 header）=====
async function callAnthropicDirect(provider, cfg, modelId, sendMessages, onDelta, options) {
  const key = cfg.key;
  if (!key) throw new Error('Anthropic 需要 API Key');

  // 转换 messages 格式：把 system 提取出来
  let systemContent = '';
  const userAssistantMsgs = [];
  for (const m of sendMessages) {
    if (m.role === 'system') systemContent += (m.content + '\n');
    else userAssistantMsgs.push(m);
  }

  const resp = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      system: systemContent || undefined,
      messages: userAssistantMsgs,
      stream: true,
    }),
    signal: options.signal,
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errTxt.slice(0, 200)}`);
  }

  // Anthropic SSE 格式不同，要解 event: content_block_delta
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        if (json.type === 'content_block_delta' && json.delta?.text) {
          fullContent += json.delta.text;
          onDelta(json.delta.text, fullContent);
        }
      } catch (e) {}
    }
  }
  return fullContent;
}

// ===== 通用 SSE 解析（OpenAI 兼容协议）=====
async function readSSE(resp, onDelta) {
  if (!resp.ok && resp.status !== 200) {
    const errTxt = await resp.text();
    throw new Error(`${resp.status}: ${errTxt.slice(0, 200)}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onDelta(delta, fullContent);
        }
      } catch (e) {}
    }
  }
  return fullContent;
}

// ========== Provider 设置面板 UI ==========
function showProviderDialog() {
  const activePid = getActiveProvider();
  const activeProvider = PROVIDERS[activePid];
  const activeCfg = getProviderConfig(activePid);
  const activeModelId = getActiveModel();

  let html = '<div style="padding:0">';
  html += '<h3 style="margin:0 0 12px 0;font-size:15px;color:var(--text-main)">🤖 模型选择</h3>';

  // 1. Provider 列表
  html += '<div style="margin-bottom:14px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:6px">选择模型供应商</div>';
  html += '<select id="prov-select" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:13px">';
  for (const p of Object.values(PROVIDERS)) {
    html += `<option value="${p.id}" ${p.id === activePid ? 'selected' : ''}>${p.label}</option>`;
  }
  html += '</select>';
  html += `<div id="prov-desc" style="font-size:11px;color:var(--text-dim);margin-top:4px">${activeProvider.description}</div>`;
  html += '</div>';

  // 2. Provider 配置区（动态填充）
  html += '<div id="prov-config"></div>';

  // 3. 模型选择
  html += '<div id="prov-model-wrap" style="margin-bottom:14px">';
  html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:6px">选择模型</div>';
  html += '<select id="prov-model" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:13px"></select>';
  html += '</div>';

  // 4. 保存按钮
  html += '<div style="display:flex;gap:8px;margin-top:16px">';
  html += '<button onclick="closeProviderDialog()" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:transparent;color:var(--text-main);font-size:13px;cursor:pointer">取消</button>';
  html += '<button onclick="saveProviderDialog()" style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#7c66dc,#5e8ef7);color:white;font-size:13px;cursor:pointer">保存</button>';
  html += '</div>';
  html += '</div>';

  // 复用 changelog modal 容器（如果已有 #provider-modal 就先删）
  const old = document.getElementById('provider-modal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'provider-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `<div style="background:var(--sidebar-bg);border-radius:14px;padding:20px;max-width:440px;width:100%;max-height:85vh;overflow-y:auto;backdrop-filter:blur(20px);border:1px solid var(--sidebar-divider)">${html}</div>`;
  modal.onclick = (e) => { if (e.target === modal) closeProviderDialog(); };
  document.body.appendChild(modal);

  // 初次渲染 + 绑事件
  refreshProviderConfigUI(activePid);
  document.getElementById('prov-select').addEventListener('change', (e) => {
    refreshProviderConfigUI(e.target.value);
  });
}

function refreshProviderConfigUI(pid) {
  const provider = PROVIDERS[pid];
  const cfg = getProviderConfig(pid);
  const cfgBox = document.getElementById('prov-config');
  const descBox = document.getElementById('prov-desc');
  const modelSel = document.getElementById('prov-model');

  descBox.textContent = provider.description;

  let html = '';
  if (provider.needsKey) {
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:6px">API Key</div>';
    html += `<input id="prov-key" type="password" value="${cfg.key || ''}" placeholder="sk-..." style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:monospace">`;
    if (provider.keyHelp) html += `<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${provider.keyHelp}</div>`;
    html += '</div>';
  }
  if (provider.needsCustomEndpoint) {
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:6px">API Endpoint（可选，默认 OpenAI 官方）</div>';
    html += `<input id="prov-endpoint" value="${cfg.endpoint || provider.endpoint}" placeholder="${provider.endpoint}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:monospace">`;
    html += '</div>';
  }
  if (provider.needsCustomModel) {
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-size:12px;color:var(--sidebar-text);margin-bottom:6px">自定义模型名（覆盖下方下拉）</div>';
    html += `<input id="prov-custom-model" value="${cfg.customModel || ''}" placeholder="如：gpt-4o，留空走下拉选择" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--sidebar-divider);background:var(--input-bg);color:var(--input-color);font-size:12px;font-family:monospace">`;
    html += '</div>';
  }
  cfgBox.innerHTML = html;

  // 重渲染模型下拉
  const activeModelId = (cfg.model || provider.models.find(m => m.default)?.id || provider.models[0]?.id);
  modelSel.innerHTML = provider.models.map(m =>
    `<option value="${m.id}" ${m.id === activeModelId ? 'selected' : ''}>${m.label}</option>`
  ).join('');
}

function closeProviderDialog() {
  const m = document.getElementById('provider-modal');
  if (m) m.remove();
}

function saveProviderDialog() {
  const pid = document.getElementById('prov-select').value;
  const provider = PROVIDERS[pid];
  const cfg = {};
  if (provider.needsKey) cfg.key = document.getElementById('prov-key').value.trim();
  if (provider.needsCustomEndpoint) {
    const ep = document.getElementById('prov-endpoint').value.trim();
    if (ep && ep !== provider.endpoint) cfg.endpoint = ep;
  }
  if (provider.needsCustomModel) {
    const cm = document.getElementById('prov-custom-model').value.trim();
    if (cm) cfg.customModel = cm;
  }
  cfg.model = document.getElementById('prov-model').value;
  saveProviderConfig(pid, cfg);
  setActiveProvider(pid);
  closeProviderDialog();
  // 更新顶栏显示
  updateModelBadge();
  // 友好提示
  if (typeof toast === 'function') toast(`✅ 已切换到 ${provider.label}`);
}

// 顶栏显示当前模型徽章
function updateModelBadge() {
  const badge = document.getElementById('modelBadge');
  if (!badge) return;
  const pid = getActiveProvider();
  const provider = PROVIDERS[pid];
  const modelId = getActiveModel();
  const model = provider?.models.find(m => m.id === modelId);
  badge.textContent = (provider?.label || '?').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '') + ' · ' + (model?.label || modelId || '?');
}

// 简单 toast
function toast(msg, duration = 2000) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(20,20,30,0.92);color:#fff;padding:10px 18px;border-radius:20px;z-index:10000;font-size:13px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.3)';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, duration - 300);
  setTimeout(() => t.remove(), duration);
}

// 自启动徽章
function _initProviderBadge() {
  try { updateModelBadge(); } catch (e) { console.error('[providers] badge 失败', e); }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initProviderBadge);
} else {
  _initProviderBadge();
}
