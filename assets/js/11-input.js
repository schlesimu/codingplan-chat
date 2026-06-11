// ========== 输入处理 ==========
// (拆自 index.html v0.8.4)

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
});
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function quickAsk(text) { userInput.value = text; sendMessage(); }

// 根据 AI 回答内容生成追问快捷按钮
function updateQuickActions(aiContent) {
  const container = document.getElementById('quickActions');
  if (!container || !aiContent) return;
  
  // 提取追问建议：从内容中智能生成 3-5 个相关追问
  const suggestions = generateFollowUps(aiContent);
  
  // 追问图标池
  const icons = [
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  ];
  
  container.innerHTML = suggestions.map((s, i) => {
    const safe = s.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `<button class="quick-btn" onclick="quickAsk('${safe}')">${icons[i % icons.length]}${s}</button>`;
  }).join('');
}

// 智能生成追问
function generateFollowUps(content) {
  const suggestions = [];
  
  // 去掉代码块，提取纯文本
  const plainText = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  
  // 规则1: 如果内容提到代码/函数/方法，生成「能帮我优化这段代码吗」
  if (/代码|函数|方法|class|function|def |const |let |var |import |export/.test(content)) {
    suggestions.push('能帮我优化这段代码吗');
  }
  
  // 规则2: 如果内容包含解释说明，生成「能举个具体例子吗」
  if (/例如|比如|举例|说明|解释|概念|原理/.test(plainText) && plainText.length > 200) {
    suggestions.push('能举个具体例子吗');
  }
  
  // 规则3: 如果涉及技术话题，生成深入追问
  if (/性能|优化|安全|最佳实践|原理|底层|源码/.test(plainText)) {
    suggestions.push('还有更好的实现方案吗');
  }
  
  // 规则4: 通用追问 - 根据内容长度判断
  if (plainText.length > 300) {
    suggestions.push('能帮我总结一下要点吗');
  }
  
  // 规则5: 提取关键词生成追问
  const keywords = extractKeywords(plainText);
  if (keywords.length >= 2) {
    suggestions.push(`${keywords[0]}和${keywords[1]}有什么区别`);
  }
  
  // 规则6: 代码相关追问
  if (/bug|错误|报错|异常|Error|error|调试|debug/.test(content)) {
    suggestions.push('如何避免这类错误');
  }
  
  // 规则7: 追问适用场景
  if (/应用|场景|使用|适用于|适用于|用途/.test(plainText) && suggestions.length < 5) {
    suggestions.push('还有哪些应用场景');
  }
  
  // 规则8: 追问相关工具/框架
  if (/框架|库|工具|平台|语言|Python|JavaScript|Java|Go|Rust|React|Vue/.test(plainText)) {
    suggestions.push('有没有相关的学习资源推荐');
  }
  
  // 如果规则生成的少于3个，补充通用追问
  const fallbacks = [
    '这个方案有什么局限性',
    '和主流做法相比有什么优劣',
    '适合初学者入门吗',
    '生产环境中需要注意什么',
  ];
  
  while (suggestions.length < 3) {
    const fb = fallbacks[suggestions.length % fallbacks.length];
    if (!suggestions.includes(fb)) suggestions.push(fb);
  }
  
  // 最多5个
  return suggestions.slice(0, 5);
}

// 提取文本中的关键词
function extractKeywords(text) {
  const techTerms = text.match(/[A-Z][a-z]+|[A-Z]{2,}|\b(?:Python|JavaScript|Java|Go|Rust|React|Vue|Angular|Node\.js|Docker|Kubernetes|API|SQL|HTML|CSS|Git|Linux|Redis|MySQL|MongoDB|AWS|Azure|TypeScript|Swift|Kotlin|Flutter)\b/g);
  if (techTerms) {
    const unique = [...new Set(techTerms)];
    return unique.slice(0, 4);
  }
  return [];
}

function formatContent(text) {
  let f = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  f = f.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  f = f.replace(/`([^`]+)`/g, '<code>$1</code>');
  f = f.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  f = f.replace(/^[-•]\s+(.+)/gm, '• $1');
  f = f.replace(/^>\s+(.+)/gm, '<blockquote>$1</blockquote>');
  return f;
}

// ========== 消息操作：复制 / 引用 / 右键菜单 / 重新生成 ==========