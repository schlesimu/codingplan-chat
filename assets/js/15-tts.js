// ========== 语音朗读 v2 ==========
// (拆自 index.html v0.8.4)

// 引擎：Edge TTS（默认，免费）/ 火山引擎（需用户填 key）
// 旧版用浏览器 SpeechSynthesisUtterance（系统级 SAPI），效果机器人。
// 新版调云端神经 TTS（Edge / 火山），与豆包/千问/Kimi 同级别音质。

const TTS_CONFIG_KEY = 'codingplan-tts-config';
function getTTSConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(TTS_CONFIG_KEY) || '{}');
    // 迁移：v0.8.3 之前默认 edge，但 web 端走不通 → 强制回退 browser（用户可在设置里手动改回 edge 测试）
    if (c.provider === 'edge' && !c._userChoseEdge) {
      c.provider = 'browser';
    }
    return {
      provider: c.provider || 'browser',       // 'browser' | 'edge' | 'volc'，默认浏览器原生最稳
      voice: c.voice || (c.provider === 'volc' ? 'yangguang' : 'yunxi'),
      rate: c.rate || 1.0,                     // 0.5 ~ 2.0
      volcAppid: c.volcAppid || '',
      volcToken: c.volcToken || '',
    };
  } catch (e) { return { provider: 'browser', voice: 'yunxi', rate: 1.0, volcAppid: '', volcToken: '' }; }
}
function setTTSConfig(cfg) { localStorage.setItem(TTS_CONFIG_KEY, JSON.stringify(cfg)); }

let voiceEnabled = false;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let ttsAudio = null;            // 当前播放的 Audio 元素
let ttsQueue = [];              // 待播队列（按句切分）
let ttsAbortCtrl = null;        // 取消正在进行的 fetch

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const btn = document.getElementById('headerVoiceBtn');
  if (voiceEnabled) {
    btn.classList.add('on');
    btn.title = '语音朗读：开';
  } else {
    btn.classList.remove('on');
    btn.title = '语音朗读：关';
    stopSpeaking();
  }
}

// ===== 文本归一化（让 TTS 念得更顺） =====
function normalizeForTTS(text) {
  let t = text
    // 代码块整体去掉
    .replace(/```[\s\S]*?```/g, '。代码片段省略。')
    // 行内代码保留内容
    .replace(/`([^`]*)`/g, '$1')
    // 链接 [text](url) -> text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 删 Markdown 强调符号
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    // 引用、标题前缀、列表符号
    .replace(/^[\t ]*[>#]+[\t ]*/gm, '')
    .replace(/^[\t ]*[-*+][\t ]+/gm, '')
    .replace(/^[\t ]*\d+\.[\t ]+/gm, '')
    // 表格分隔行
    .replace(/^\s*\|[-:\s|]+\|\s*$/gm, '')
    // emoji 大部分保留（神经 TTS 会跳过），单独剥几个常见冗余
    .replace(/[️]/g, '')
    // 多空行变停顿
    .replace(/\n{2,}/g, '。')
    .replace(/\n/g, '，')
    // 常见冗余符号
    .replace(/[#*_~|]/g, '')
    // 多余空白
    .replace(/[ \t]{2,}/g, '')
    .trim();
  return t;
}

// ===== 按句切分（流式播放的关键：先播首句，后台合成后续） =====
function splitSentences(text, maxLen = 200) {
  // 中文句末标点 + 英文 .?! 切分
  const parts = text.split(/(?<=[。！？!?\.\n])\s*/);
  const out = [];
  let buf = '';
  for (const p of parts) {
    if (!p) continue;
    if ((buf + p).length > maxLen && buf) { out.push(buf); buf = p; }
    else buf += p;
  }
  if (buf.trim()) out.push(buf);
  return out.filter(s => s.trim().length > 0);
}

// ===== 实际调 TTS Provider 拿 audio Blob =====
async function fetchTTSAudio(text, cfg, signal) {
  if (cfg.provider === 'browser') {
    return null;
  }
  if (cfg.provider === 'edge') {
    // 浏览器直连 Edge TTS WSS（绕过 CF Workers IP 封禁）
    return await fetchEdgeTTSDirect(text, cfg, signal);
  }
  // 火山仍走服务端代理（隐藏用户的 AppID/Token 到 Function 里？不，这里也是前端直传，
  // 暂时还经服务端中转避免暴露 token 给页面外部抓包；后续可优化）
  const resp = await fetch('/api/tts/volc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: cfg.voice, rate: cfg.rate, appid: cfg.volcAppid, token: cfg.volcToken }),
    signal,
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`TTS ${resp.status}: ${errTxt.slice(0, 120)}`);
  }
  return await resp.blob();
}

// ===== Edge TTS 浏览器直连（WSS）=====
const EDGE_VOICE_MAP = {
  'xiaoxiao': 'zh-CN-XiaoxiaoNeural',
  'xiaoyi':   'zh-CN-XiaoyiNeural',
  'yunxi':    'zh-CN-YunxiNeural',
  'yunyang':  'zh-CN-YunyangNeural',
  'yunjian':  'zh-CN-YunjianNeural',
  'yunxia':   'zh-CN-YunxiaNeural',
  'xiaomeng': 'zh-CN-XiaomengNeural',
  'xiaohan':  'zh-CN-XiaohanNeural',
};
// Edge 浏览器内置常量（公开非机密，所有 edge-tts 项目都用同一个）
const _EDGE_TCT = '6A5AA1D4' + 'EAFF4E9F' + 'B37E23D6' + '8491D6F4';

function _edgeUuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)).toString(16)
  ).replace(/-/g, '');
}

async function fetchEdgeTTSDirect(text, cfg, signal) {
  const voice = EDGE_VOICE_MAP[cfg.voice] || EDGE_VOICE_MAP['yunxi'];
  const reqId = _edgeUuid();
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${_EDGE_TCT}&ConnectionId=${reqId}`;

  return new Promise((resolve, reject) => {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { return reject(e); }
    ws.binaryType = 'arraybuffer';
    const chunks = [];
    const cleanup = () => { try { ws.close(); } catch(e){} };

    const onAbort = () => { cleanup(); reject(new DOMException('aborted', 'AbortError')); };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort);
    }
    const timer = setTimeout(() => { cleanup(); reject(new Error('Edge TTS timeout 30s')); }, 30000);

    ws.onopen = () => {
      // 1) speech.config
      const cfgMsg = `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(cfgMsg);
      // 2) SSML
      const rate = cfg.rate ? (rateToEdgePct(cfg.rate)) : '+0%';
      const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='+0Hz' rate='${rate}' volume='+0%'>${esc}</prosody>` +
        `</voice></speak>`;
      const ssmlMsg = `X-RequestId:${reqId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}Z\r\n` +
        `Path:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = async (ev) => {
      if (typeof ev.data === 'string') {
        if (ev.data.includes('Path:turn.end')) {
          clearTimeout(timer);
          cleanup();
          const total = chunks.reduce((s, c) => s + c.byteLength, 0);
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { out.set(new Uint8Array(c), off); off += c.byteLength; }
          resolve(new Blob([out], { type: 'audio/mpeg' }));
        }
      } else {
        const buf = ev.data instanceof ArrayBuffer ? ev.data : await ev.data.arrayBuffer();
        const view = new DataView(buf);
        const headerLen = view.getUint16(0, false);
        const audioStart = 2 + headerLen;
        if (buf.byteLength > audioStart) chunks.push(buf.slice(audioStart));
      }
    };

    ws.onerror = (e) => { clearTimeout(timer); cleanup(); reject(new Error('Edge TTS WebSocket error')); };
    ws.onclose = (ev) => {
      clearTimeout(timer);
      if (chunks.length > 0) {
        const total = chunks.reduce((s, c) => s + c.byteLength, 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { out.set(new Uint8Array(c), off); off += c.byteLength; }
        resolve(new Blob([out], { type: 'audio/mpeg' }));
      } else if (ev.code !== 1000) {
        reject(new Error(`Edge TTS closed: ${ev.code} ${ev.reason || ''}`));
      }
    };
  });
}

function rateToEdgePct(rate) {
  // 1.0 -> +0%；0.5 -> -50%；1.5 -> +50%
  const pct = Math.round((Number(rate) - 1) * 100);
  return (pct >= 0 ? '+' : '') + pct + '%';
}

// ===== 主入口 =====
function speakText(text) {
  if (!voiceEnabled) return;
  stopSpeaking();

  const cleanText = normalizeForTTS(text);
  if (!cleanText) return;

  const cfg = getTTSConfig();

  // 浏览器原生兜底
  if (cfg.provider === 'browser') {
    speakWithBrowser(cleanText, cfg);
    return;
  }

  // 神经 TTS（Edge/火山）按句切分流式播放
  ttsQueue = splitSentences(cleanText);
  ttsAbortCtrl = new AbortController();
  playNextSentence(cfg);
}

async function playNextSentence(cfg) {
  if (!voiceEnabled || ttsQueue.length === 0) {
    setSpeakingUI(false);
    return;
  }
  const sentence = ttsQueue.shift();
  setSpeakingUI(true);
  try {
    const blob = await fetchTTSAudio(sentence, cfg, ttsAbortCtrl.signal);
    if (!voiceEnabled) return;
    const url = URL.createObjectURL(blob);
    ttsAudio = new Audio(url);
    ttsAudio.playbackRate = 1.0;  // 速率已在服务端按 cfg.rate 渲染
    ttsAudio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
      playNextSentence(cfg);
    });
    ttsAudio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      playNextSentence(cfg);
    });
    await ttsAudio.play();
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.warn('TTS 失败，退化到浏览器原生:', e.message);
    // 失败一次性退化到浏览器（不打扰用户）
    const all = [sentence, ...ttsQueue].join('');
    ttsQueue = [];
    speakWithBrowser(all, cfg);
  }
}

function speakWithBrowser(text, cfg) {
  if (!speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = Number(cfg.rate) || 1.0;
  u.pitch = 1.0;
  const voices = speechSynthesis.getVoices();
  const zh = voices.find(v => v.lang.startsWith('zh'));
  if (zh) u.voice = zh;
  u.onstart = () => setSpeakingUI(true);
  u.onend = () => setSpeakingUI(false);
  u.onerror = () => setSpeakingUI(false);
  currentUtterance = u;
  speechSynthesis.speak(u);
}

function setSpeakingUI(on) {
  const btn = document.getElementById('headerVoiceBtn');
  if (!btn) return;
  if (on) btn.classList.add('speaking'); else btn.classList.remove('speaking');
}

function stopSpeaking() {
  // 取消队列
  ttsQueue = [];
  if (ttsAbortCtrl) { try { ttsAbortCtrl.abort(); } catch (e) {} ttsAbortCtrl = null; }
  if (ttsAudio) {
    try { ttsAudio.pause(); ttsAudio.src = ''; } catch (e) {}
    ttsAudio = null;
  }
  if (speechSynthesis) speechSynthesis.cancel();
  currentUtterance = null;
  setSpeakingUI(false);
}

// 预加载语音列表
if (speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

function updateSearchToggleUI() {
  // 更新侧边栏搜索开关（如果存在）
  const toggle = document.getElementById('searchToggle');
  const status = document.getElementById('searchStatus');
  if (toggle) {
    if (webSearchEnabled) {
      toggle.classList.add('on');
    } else {
      toggle.classList.remove('on');
    }
  }
  if (status) {
    status.textContent = webSearchEnabled ? '联网搜索：开' : '联网搜索：关';
  }
  // 更新顶栏搜索按钮
  const headerBtn = document.getElementById('headerSearchBtn');
  if (headerBtn) {
    if (webSearchEnabled) {
      headerBtn.classList.add('on');
      headerBtn.title = '联网搜索：开';
    } else {
      headerBtn.classList.remove('on');
      headerBtn.title = '联网搜索：关';
    }
  }
}

// 页面加载时初始化开关状态
updateSearchToggleUI();

// 更多工具折叠
function toggleMoreTools() {
  const content = document.getElementById('moreToolsContent');
  const toggle = document.getElementById('moreToolsToggle');
  content.classList.toggle('open');
  toggle.classList.toggle('open');
}

// v0.9.5.3 新增：同步与备份折叠
function toggleSyncBackup() {
  const content = document.getElementById('syncBackupContent');
  const toggle = document.getElementById('syncBackupToggle');
  if (!content || !toggle) return;
  content.classList.toggle('open');
  toggle.classList.toggle('open');
}

// 系统提示词：告诉 AI 如何使用搜索工具
const SYSTEM_PROMPT = {
  role: 'system',
  content: `你是一个智能编程助手。当用户的问题涉及实时信息、最新新闻、当前事件、股价、天气、时间等需要联网查询的内容时，你可以使用搜索工具获取信息。

搜索工具使用方式：在回复中输出 <search>搜索关键词</search>，系统会自动搜索并把结果给你。

注意：
1. 只有需要实时信息时才使用搜索
2. 搜索关键词要简洁准确
3. 收到搜索结果后，基于结果给出完整回答
4. 不要告诉用户你在搜索，直接给出答案`
};

// 调用 AI（支持搜索工具调用）
async function callAI(sendMessages, bubble, allowSearch = true) {
  let fullContent = '';
  let fullReasoning = '';
  let reasoningBox = null;
  let reasoningBody = null;
  try {
    // v0.9.3: 路由到当前 provider；onDelta 多出 reasoning 两参支持推理模型
    const result = await callLLMProvider(sendMessages, (dContent, fContent, dReasoning, fReasoning) => {
      // 思考期：第一次收到 reasoning 就在气泡前面插入展开的 reasoning-box
      if (fReasoning && !reasoningBox) {
        reasoningBox = document.createElement('details');
        reasoningBox.className = 'reasoning-box';
        reasoningBox.open = true;
        reasoningBox.innerHTML = '<summary> <span class="reasoning-label">正在思考...</span></summary><div class="reasoning-body"></div>';
        bubble.parentElement.insertBefore(reasoningBox, bubble);
        reasoningBody = reasoningBox.querySelector('.reasoning-body');
      }
      if (dReasoning && reasoningBody) {
        reasoningBody.textContent = fReasoning;
        chatArea.scrollTop = chatArea.scrollHeight;
      }
      // 回答期：第一次收到 content 就自动折叠 reasoning + 改 summary 文案
      if (dContent && reasoningBox && reasoningBox.open) {
        reasoningBox.open = false;
        const label = reasoningBox.querySelector('.reasoning-label');
        if (label) label.textContent = `思考过程（${fReasoning.length} 字，点击展开）`;
      }
      if (dContent) {
        bubble.innerHTML = formatContent(fContent);
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    });
    fullContent = String(result);
    fullReasoning = result.reasoning || '';
    // 流结束后兜底：如果只吐了 reasoning 没吐 content（极端情况），把 reasoning-box 折叠
    if (reasoningBox && reasoningBox.open) {
      reasoningBox.open = false;
      const label = reasoningBox.querySelector('.reasoning-label');
      if (label) label.textContent = `思考过程（${fullReasoning.length} 字，点击展开）`;
    }

    // 检测是否需要搜索（联网搜索开启时）
    if (allowSearch && webSearchEnabled) {
      const searchMatch = fullContent.match(/<search>(.+?)<\/search>/);
      if (searchMatch) {
        const searchQuery = searchMatch[1].trim();
        // 清除 <search> 标记，显示搜索状态
        bubble.innerHTML = formatContent('正在搜索：' + searchQuery);
        chatArea.scrollTop = chatArea.scrollHeight;

        // 执行搜索
        const searchResults = await searchWeb(searchQuery) || '';

        // 构建新的消息上下文：原始消息 + AI的搜索请求 + 搜索结果
        const newMessages = [
          SYSTEM_PROMPT,
          ...sendMessages.filter(m => m.role !== 'system'),
          { role: 'assistant', content: fullContent },
          { role: 'user', content: `搜索结果：\n\n${searchResults}\n\n请基于以上搜索结果回答。` }
        ];

        // 清空当前气泡，重新调用 AI
        bubble.innerHTML = '';
        return await callAI(newMessages, bubble, false); // 禁止二次搜索
      }
    }

    // v0.9.3: 把 reasoning 也带回去，调用方用 .reasoning 取
    const ret = new String(fullContent);
    ret.reasoning = fullReasoning;
    return ret;
  } catch (e) {
    bubble.innerHTML = `<span style="color:var(--text-error)"> 网络出错：${e.message}，请重试</span>`;
    return '';
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  const hasFiles = typeof pendingFiles !== 'undefined' && pendingFiles.some(f => f.status === 'ok');
  if ((!text && pendingImages.length === 0 && !hasFiles) || isStreaming) return;
  if (isStreaming) return;
  isStreaming = true; sendBtn.disabled = true;
  userInput.value = ''; userInput.style.height = 'auto';

  // 处理图片
  const imageB64s = [...pendingImages];
  pendingImages = [];
  renderImagePreview();
  const hasImage = imageB64s.length > 0;

  // v0.9.0: 处理文件附件
  const fileSummaryForDisplay = hasFiles ? pendingFiles.filter(f => f.status === 'ok').map(f => ` ${f.name}${f.truncated ? '（截断）' : ''}`).join('') : '';
  // 真正给模型看的内容：原文本 + 文件正文
  const contentForLLM = hasFiles ? injectPendingFilesToMessage(text) : text;
  if (hasFiles) clearPendingFiles();

  // 构建用户消息内容
  let userContent = contentForLLM;
  if (quotedText) {
    userContent = '>' + quotedText.replace(/\n/g, '\n>') + '\n\n' + contentForLLM;
    quotedText = '';
  }

  // 显示用户消息（界面上只显示原文本 + 文件名摘要，避免把文件全文糊在气泡里）
  const userDisplayText = (text || '') + (fileSummaryForDisplay ? (text ? '\n\n' : '') + fileSummaryForDisplay : '');
  if (hasImage) {
    // 带图片的消息
    const imgHtml = imageB64s.map(b64 => `<img src="${b64}" alt="uploaded image">`).join('');
    addMessage('user', imgHtml + (userDisplayText ? '\n' + userDisplayText : ''), true);
  } else {
    addMessage('user', userDisplayText || userContent);
  }

  // 存储到 messages（多模态格式）
  if (hasImage) {
    const parts = [{ type: 'text', text: text || '请描述这张图片' }];
    imageB64s.forEach(b64 => parts.push({ type: 'image_url', image_url: { url: b64 } }));
    messages.push({ role: 'user', content: parts });
  } else {
    messages.push({ role: 'user', content: userContent });
  }

  const { div, bubble } = addStreamingMessage();

  // 构建消息上下文（包含系统提示）
  const sendMessages = [SYSTEM_PROMPT, ...messages];

  const aiResult = await callAI(sendMessages, bubble);
  const fullContent = String(aiResult || '');
  const fullReasoning = (aiResult && aiResult.reasoning) || '';

  if (fullContent) {
    const msg = { role: 'assistant', content: fullContent };
    if (fullReasoning) msg.reasoning = fullReasoning;  // v0.9.3: 持久化思考链
    messages.push(msg);
    saveCurrentConversation();
    // 给流式消息 div 加上右键/长按/操作按钮
    setupAssistantActions(div, bubble, fullContent);
  }

  isStreaming = false; sendBtn.disabled = false; userInput.focus();
  
  // 语音朗读（如果已开启）
  if (fullContent) speakText(fullContent);
  // 动态更新追问快捷按钮
  if (fullContent) updateQuickActions(fullContent);
}
