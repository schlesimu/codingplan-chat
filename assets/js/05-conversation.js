// ========== 对话管理 ==========
// (拆自 index.html v0.8.4)

function newConversation() {
  saveCurrentConversation();
  const id = createNewConversation();
  switchToConversation(id);
  closeSidebar();
}
function switchConversation(id) {
  saveCurrentConversation();
  switchToConversation(id);
  closeSidebar();
}
function switchToConversation(id) {
  currentConversationId = id;
  const convo = conversations[id];
  messages = convo.messages ? [...convo.messages] : [];
  headerTitle.textContent = convo.title || '小纸船 - codingplan-chat';
  renderMessages();
  renderChatHistory();
}
function deleteConversation(id) {
  if (!confirm('确定要删除这个对话吗？')) return;
  delete conversations[id];
  saveConversations();
  if (currentConversationId === id) {
    const remaining = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
    if (remaining.length > 0) switchToConversation(remaining[0].id);
    else { const newId = createNewConversation(); switchToConversation(newId); }
  }
  renderChatHistory();
}

// v0.9.8.1 A2: 置顶 / 重命名
function pinConversation(id) {
  const c = conversations[id];
  if (!c) return;
  c.pinned = !c.pinned;
  saveConversations();
  renderChatHistory();
}
function renameConversation(id) {
  const c = conversations[id];
  if (!c) return;
  const next = prompt('重命名对话', c.title || '新对话');
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  c.title = trimmed.slice(0, 80);
  c.updatedAt = Date.now();
  saveConversations();
  if (currentConversationId === id) headerTitle.textContent = c.title;
  renderChatHistory();
}
if (typeof window !== 'undefined') {
  window.pinConversation = pinConversation;
  window.renameConversation = renameConversation;
}
function clearCurrentChat() {
  messages = [];
  if (currentConversationId && conversations[currentConversationId]) {
    conversations[currentConversationId].messages = [];
    conversations[currentConversationId].title = '新对话';
    conversations[currentConversationId].updatedAt = Date.now();
    saveConversations();
  }
  headerTitle.textContent = '小纸船 - codingplan-chat';
  renderMessages();
  renderChatHistory();
  closeSidebar();
}
function exportChat() {
  if (messages.length === 0) { alert('当前对话没有内容'); return; }
  let text = '# 小纸船 - codingplan-chat - 对话记录\n\n';
  text += `导出时间: ${new Date().toLocaleString()}\n`;
  text += `共 ${messages.length} 条消息\n\n---\n\n`;
  messages.forEach(m => { text += `### ${m.role === 'user' ? '我' : '助手'}\n${m.content}\n\n`; });
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `chat-${Date.now()}.md`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  closeSidebar();
}

// ========== 消息渲染 ==========