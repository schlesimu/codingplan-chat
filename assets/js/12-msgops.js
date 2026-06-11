// ========== 消息操作 ==========
// (拆自 index.html v0.8.4)

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('已复制到剪贴板');
  }
}

function quoteText(text) {
  // 选中的文字，截取前 200 字符避免太长
  const snippet = text.length > 200 ? text.slice(0, 200) + '...' : text;
  quotedText = snippet;
  userInput.value = '> ' + snippet.replace(/\n/g, '\n> ') + '\n\n';
  userInput.focus();
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  showToast('已引用，继续输入你的问题');
}

function showMsgContextMenu(e, content, msgDiv) {
  const menu = document.getElementById('msgContextMenu');
  menu.innerHTML = `
    <button class="msg-context-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制全文</button>
    <button class="msg-context-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>引用回复</button>
    <button class="msg-context-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>朗读</button>
    <button class="msg-context-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>重新生成</button>
  `;
  menu.children[0].onclick = () => { copyText(content); menu.classList.remove('show'); };
  menu.children[1].onclick = () => { quoteText(content); menu.classList.remove('show'); };
  menu.children[2].onclick = () => { speakText(content); menu.classList.remove('show'); };
  menu.children[3].onclick = () => { regenerateAnswer(msgDiv); menu.classList.remove('show'); };
  menu.style.left = Math.min(e.clientX || (e.touches && e.touches[0].clientX) || 0, window.innerWidth - 140) + 'px';
  menu.style.top = Math.min(e.clientY || (e.touches && e.touches[0].clientY) || 0, window.innerHeight - 150) + 'px';
  menu.classList.add('show');
  // 点击其他地方关闭
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.classList.remove('show');
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 10);
}

function regenerateAnswer(msgDiv) {
  // 找到这条消息在 messages 数组中的位置，移除后重新请求
  const allMsgs = chatArea.querySelectorAll('.msg.assistant');
  let idx = -1;
  allMsgs.forEach((m, i) => { if (m === msgDiv) idx = i; });
  if (idx < 0) return;

  // 找到对应的消息并移除 AI 的回复
  const userMsgs = [];
  let aiCount = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      if (aiCount === allMsgs.length - 1 - idx) {
        messages.splice(i, 1); // 移除这条 AI 消息
        break;
      }
      aiCount++;
    }
  }

  // 移除 DOM 中的消息
  msgDiv.remove();
  // 移除后面的所有消息（重渲染）
  const nextSiblings = [];
  let next = msgDiv.nextElementSibling;
  while (next) { nextSiblings.push(next); next = next.nextElementSibling; }
  nextSiblings.forEach(el => el.remove());

  // 重新发送请求
  const sendMessages = [SYSTEM_PROMPT, ...messages];
  const { div, bubble } = addStreamingMessage();
  callAI(sendMessages, bubble).then(fullContent => {
    if (fullContent) {
      messages.push({ role: 'assistant', content: fullContent });
      saveCurrentConversation();
      speakText(fullContent);
      updateQuickActions(fullContent);
    }
    isStreaming = false; sendBtn.disabled = false;
  });
  isStreaming = true; sendBtn.disabled = true;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);background:rgba(0,0,0,0.75);color:#fff;transition:opacity 0.3s';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
}

// ========== 图片处理 ==========