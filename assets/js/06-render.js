// ========== 消息渲染 ==========
// (拆自 index.html v0.8.4)

function renderMessages() {
  const boatLogo = '<img src="logo.png" alt="小纸船" style="width:52%;height:52%;object-fit:contain;border-radius:50%">';
  const userSVG = '<svg viewBox="0 0 24 24" style="width:52%;height:52%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  if (messages.length === 0) {
    chatArea.innerHTML = `<div class="msg assistant"><div class="avatar">${boatLogo}</div><div class="bubble">你好！我是小纸船 - codingplan-chat，可以帮你：\n\n· 写代码、改代码、查 Bug\n· 解答编程和技术问题\n· 解释概念、翻译代码\n\n直接输入问题就行！</div></div>`;
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
}

// ========== 主题 ==========