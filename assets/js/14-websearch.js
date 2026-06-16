// ========== 联网搜索 v0.9.11 ==========
// (拆自 index.html v0.8.4 / v0.9.11 升级到博查 ai-search）
// ai-search 返回多模态（webpage/image/video/weather/baike/mp/...），
// 前端不再要求 AI 总结，原样喂给上游模型当 system 上下文。

// ---- 时效性关键词嗅探（前置触发联网） ----
// 命中下列任一，即使开关没开，也强烈建议联网。当前实现只在开关已开时按嗅探决定要不要主动检索。
const _WEB_SNIFF_KEYWORDS = [
  // 时间
  '今天', '今日', '昨天', '昨日', '本周', '上周', '本月', '上月', '今年', '去年',
  '最近', '最新', '近期', '当前', '现在', '此刻', '目前',
  // 年份（覆盖 2024-2030 显式词）
  '2024年', '2025年', '2026年', '2027年', '2028年', '2029年', '2030年',
  // 时效场景
  '新闻', '热点', '热搜', '头条', '快讯',
  '股价', '股市', '汇率', '价格', '行情', '涨跌',
  '天气', '气温', '台风', '地震',
  '比赛', '比分', '直播',
  '发布会', '上市', '官宣', '公告',
  // 询价类
  '多少钱', '怎么卖', '现在价格',
  // 英文
  'today', 'latest', 'recent', 'current', 'now',
  '2024', '2025', '2026', '2027',
  'news', 'price', 'stock', 'weather'
];

function sniffWebSearchKeyword(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  for (const kw of _WEB_SNIFF_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

// ---- 调用博查 ai-search，返回原始 data ----
async function _rawAiSearch(query, count) {
  const searchKey = getSearchKey();
  const headers = { 'Content-Type': 'application/json' };
  if (searchKey) headers['X-Search-Key'] = searchKey;
  const resp = await fetch('/api/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, count: count || 5 })
  });
  if (!resp.ok) throw new Error('search http ' + resp.status);
  return await resp.json();
}

// ---- ai-search 结果格式化为 system prompt 字符串（模型友好） ----
// ai-search 返回结构（v1）:
//   { code, msg, data: { messages: [ {content_type, content, ...} ], queryContext, ... } }
// content_type 枚举：source（网页列表 JSON）/ image（图片列表 JSON）/ weather_china / baike_pro / medical_pro / ...
// 不同 content_type 的 content 都是 JSON 字符串，需要再 parse
function _parseModalContent(c) {
  if (!c) return null;
  if (typeof c !== 'string') return c;
  try { return JSON.parse(c); } catch { return c; }
}

function formatAiSearchToSystem(data, query) {
  const result = data?.data || data;
  const messages = result?.messages || [];
  if (!messages.length) return null;

  const blocks = [];
  let webIdx = 0;

  for (const m of messages) {
    const ct = m.content_type || m.contentType || '';
    const parsed = _parseModalContent(m.content);

    // 网页搜索结果
    if (ct === 'source' || ct === 'webpage' || (parsed && parsed.value && Array.isArray(parsed.value))) {
      const pages = parsed?.value || parsed?.webPages?.value || [];
      for (const p of pages) {
        webIdx++;
        const title = p.name || p.title || '';
        const snip = p.snippet || p.summary || '';
        const url = p.url || p.link || '';
        const date = p.dateLastCrawled || p.datePublished || '';
        let item = `[${webIdx}] ${title}`;
        if (date) item += ` · ${String(date).slice(0, 10)}`;
        if (snip) item += `\n${snip}`;
        if (url) item += `\n来源: ${url}`;
        blocks.push(item);
      }
      continue;
    }

    // 天气
    if (ct === 'weather_china' || ct === 'weather') {
      const w = parsed || {};
      const loc = w.location || w.city || '';
      const temp = w.temperature || w.temp || '';
      const cond = w.condition || w.weather || w.text || '';
      const blk = `[天气] ${loc} ${cond} ${temp ? temp + '℃' : ''}`.trim();
      if (loc || cond || temp) blocks.unshift(blk);
      continue;
    }

    // 百科
    if (ct === 'baike_pro' || ct === 'baike') {
      const b = parsed || {};
      const t = b.title || b.name || '';
      const sum = b.summary || b.abstract || b.description || '';
      if (t || sum) blocks.unshift(`[百科] ${t}\n${sum}`.trim());
      continue;
    }

    // 视频/图片/公众号 等其它模态：略过（避免 system 太长），只让 webpage 主导
  }

  if (!blocks.length) return null;

  const body = blocks.join('\n\n');
  return `以下是关于「${query}」的最新联网检索结果（来源：博查 AI Search）。请以这些资料为准回答用户的问题，必要时引用来源链接。\n\n${body}\n\n（检索时间：${new Date().toLocaleString('zh-CN')}）`;
}

// ---- 兼容旧入口：searchWeb 返回 system 字符串 ----
async function searchWeb(query) {
  try {
    const data = await _rawAiSearch(query, 5);
    return formatAiSearchToSystem(data, query);
  } catch (e) {
    console.warn('搜索失败:', e.message);
    return null;
  }
}

function toggleWebSearch() {
  webSearchEnabled = !webSearchEnabled;
  localStorage.setItem('webSearchEnabled', webSearchEnabled);
  updateSearchToggleUI();
}

// ========== 语音朗读 v2（神经 TTS） ==========
