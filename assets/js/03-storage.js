// ========== 数据持久化 ==========
// (拆自 index.html v0.8.4)

function loadConversations() {
  try {
    const data = localStorage.getItem('codingplan-conversations');
    if (data) conversations = JSON.parse(data);
  } catch (e) { conversations = {}; }
}
function saveConversations() {
  localStorage.setItem('codingplan-conversations', JSON.stringify(conversations));
}
function saveCurrentConversation() {
  if (!currentConversationId || messages.length === 0) return;
  const convo = conversations[currentConversationId];
  if (!convo) return;
  convo.messages = [...messages];
  convo.updatedAt = Date.now();
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg && convo.title === '新对话') {
    convo.title = firstUserMsg.content.replace(/\n/g, ' ').slice(0, 30) + (firstUserMsg.content.length > 30 ? '…' : '');
  }
  saveConversations();
  renderChatHistory();
}

function createNewConversation() {
  const id = 'conv_' + Date.now();
  conversations[id] = { id, title: '新对话', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  saveConversations();
  return id;
}

// ========== 侧边栏 ==========