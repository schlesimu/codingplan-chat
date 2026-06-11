// ========== 联网搜索 ==========
// (拆自 index.html v0.8.4)

async function searchWeb(query) {
  try {
    const searchKey = getSearchKey();
    const headers = { 'Content-Type': 'application/json' };
    if (searchKey) headers['X-Search-Key'] = searchKey;
    const resp = await fetch('/api/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, count: 5 })
    });
    const data = await resp.json();
    // 博查API返回格式: {code, data: {webPages: {value: [...]}}}
    const result = data.data || data;
    if (result.webPages?.value) {
      return result.webPages.value.map((p, i) => 
        `[${i + 1}] ${p.name}\n${p.snippet || p.summary || ''}\n来源: ${p.url}`
      ).join('\n\n');
    }
    return null;
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