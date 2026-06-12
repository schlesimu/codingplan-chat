// ========== 消息渲染 ==========
// (拆自 index.html v0.8.4)

function renderMessages() {
  const boatLogo = '<img src="logo.png" alt="小纸船" style="width:52%;height:52%;object-fit:contain;border-radius:50%">';
  const userSVG = '<svg viewBox="0 0 24 24" style="width:52%;height:52%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  if (messages.length === 0) {
    // v0.9.8.5: 欢迎气泡 + 场景化 6 瓷砖
    const tiles = [
      { icon: '💡', title: '商业点子可行性', hint: '帮你分析风险和关键问题', fill: '我有个想法：\n\n[在这里描述你的想法]\n\n帮我分析它的可行性、潜在风险和需要解决的关键问题。' },
      { icon: '🛒', title: '该不该买', hint: '帮你做购物决策', fill: '我在考虑买 [商品名]，预算 [X 元]，主要用途是 [X]，帮我分析下值不值、有没有更好的替代选择。' },
      { icon: '✈️', title: '旅行规划', hint: '帮你定路线和预算', fill: '我想去 [地点] 玩 [X 天]，预算 [X 元]，[人数/同行人/偏好]，帮我规划行程和必去的地方。' },
      { icon: '✍️', title: '帮我写文案', hint: '朋友圈、小红书、邮件…', fill: '帮我写一段 [朋友圈/小红书/微博/邮件] 文案，主题：[X]，风格：[X]，要求：[X]。' },
      { icon: '📚', title: '解释这个概念', hint: '大白话讲给小白听', fill: '用大白话解释 [概念名]，假设我完全是新手，可以多用比喻和例子。' },
      { icon: '🌍', title: '查最新动态', hint: '联网帮你查（记得开🌐）', fill: '帮我搜一下 [话题] 最近有什么新进展，给我一个简短的总结。' },
    ];
    const tilesHTML = tiles.map(t => {
      const safeFill = t.fill.replace(/'/g, "\\'").replace(/\n/g, '\\n');
      return `<button class="welcome-tile" onclick="quickFill('${safeFill}')">
        <div class="welcome-tile-icon">${t.icon}</div>
        <div class="welcome-tile-text">
          <div class="welcome-tile-title">${t.title}</div>
          <div class="welcome-tile-hint">${t.hint}</div>
        </div>
      </button>`;
    }).join('');
    chatArea.innerHTML = `<div class="msg assistant"><div class="avatar">${boatLogo}</div><div class="bubble">嗨～我是小纸船 🚢\n\n把豆包、Kimi、DeepSeek、GLM、Claude 都装进了一艘小船，\n你说什么、我就用最合适的那位 AI 来回。\n\n聊聊？</div></div>
    <div class="welcome-tiles" id="welcomeTiles">${tilesHTML}</div>`;
    return;
  }
  chatArea.innerHTML = messages.map(m => {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const avatar = m.role === 'user' ? userSVG : boatLogo;
    // v0.9.3: assistant 消息如果有 reasoning，渲染折叠块在 bubble 前面
    let reasoningHTML = '';
    if (m.role === 'assistant' && m.reasoning) {
      const escaped = String(m.reasoning).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      reasoningHTML = `<details class="reasoning-box"><summary> <span class="reasoning-label">思考过程（${m.reasoning.length} 字，点击展开）</span></summary><div class="reasoning-body">${escaped}</div></details>`;
    }
    return `<div class="msg ${role}"><div class="avatar">${avatar}</div><div class="bubble-wrap">${reasoningHTML}<div class="bubble">${formatContent(m.content)}</div></div></div>`;
  }).join('');
  chatArea.scrollTop = chatArea.scrollHeight;
  // v0.9.6: 渲染完触发 highlight.js（懒加载）
  if (typeof loadHighlightJS === 'function') {
    loadHighlightJS().then(() => {
      if (typeof highlightCodeBlocks === 'function') highlightCodeBlocks(chatArea);
    });
  }
}

// ========== 主题 ==========