// ========== v0.9.8.3 E1: 提示词模板 ==========
// 内置 10 个 coding 场景预设 + 用户自定义；存 localStorage `codingplan-prompts`
// 选中后填入输入框，光标到末尾

const DEFAULT_PROMPTS = [
  { id: 'd1', icon: '🌐', name: '翻译成中文', content: '请把下面的内容翻译成自然流畅的中文：\n\n' },
  { id: 'd2', icon: '🌏', name: '翻译成英文', content: 'Please translate the following content into natural, fluent English:\n\n' },
  { id: 'd3', icon: '📖', name: '解释这段代码', content: '请详细解释下面这段代码的功能、关键逻辑和潜在注意点：\n\n```\n\n```' },
  { id: 'd4', icon: '🔧', name: '重构这段代码', content: '请帮我重构下面这段代码，目标：可读性、健壮性、性能（按这个优先级）。说明你的修改点和理由。\n\n```\n\n```' },
  { id: 'd5', icon: '🐛', name: '帮我找 Bug', content: '下面这段代码有问题（或我怀疑有问题），请帮我找出 bug 并说明原因 + 修复方案：\n\n问题描述：\n\n代码：\n```\n\n```' },
  { id: 'd6', icon: '✅', name: '写单元测试', content: '请为下面这段代码写完整的单元测试，覆盖正常路径、边界条件、异常场景。指明使用的测试框架：\n\n```\n\n```' },
  { id: 'd7', icon: '📝', name: '加注释', content: '请为下面这段代码加上清晰、必要、不冗余的中文注释（函数说明用 docstring/JSDoc 风格，行内注释只在复杂逻辑处加）：\n\n```\n\n```' },
  { id: 'd8', icon: '📋', name: '写 commit message', content: '我即将提交以下改动，请帮我写一条规范的中文 commit message（首行不超过 50 字 + 空行 + 详细列表）：\n\n改动内容：\n' },
  { id: 'd9', icon: '🎨', name: '优化样式', content: '请优化下面这段 CSS / 样式代码，目标：可维护性、响应式、视觉一致性。说明改动点：\n\n```css\n\n```' },
  { id: 'd10', icon: '📊', name: '总结这段内容', content: '请用结构化方式（要点列表 + 必要时表格）总结下面这段内容，提取核心信息：\n\n' },
];

const PROMPTS_STORAGE_KEY = 'codingplan-prompts';

function getPrompts() {
  try {
    const raw = localStorage.getItem(PROMPTS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROMPTS.slice();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_PROMPTS.slice();
    return arr;
  } catch (e) { return DEFAULT_PROMPTS.slice(); }
}

function savePrompts(arr) {
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(arr));
}

function renderPromptsSheet() {
  const body = document.getElementById('promptsSheetBody');
  if (!body) return;
  const prompts = getPrompts();
  body.innerHTML = prompts.map((p, i) => `
    <button class="prompt-item" data-id="${p.id}" data-idx="${i}">
      <span class="prompt-icon">${escapeHtml(p.icon || '✨')}</span>
      <span class="prompt-name">${escapeHtml(p.name)}</span>
      <button class="prompt-delete" data-idx="${i}" title="删除" onclick="event.stopPropagation(); deletePrompt(${i})">✕</button>
    </button>
  `).join('');
  // 绑定点击
  body.querySelectorAll('.prompt-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      applyPrompt(prompts[idx]);
    });
  });
}

function applyPrompt(p) {
  if (!p) return;
  const input = document.getElementById('userInput');
  if (!input) return;
  // 如果输入框已有内容，在末尾追加；否则直接填
  const cur = input.value;
  if (cur && cur.trim() && !cur.endsWith('\n')) {
    input.value = cur + '\n' + p.content;
  } else if (cur && cur.trim()) {
    input.value = cur + p.content;
  } else {
    input.value = p.content;
  }
  // 触发 input 事件让 textarea 自动撑高
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // 光标定位到末尾
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  togglePromptsSheet(); // 关闭面板
}

function togglePromptsSheet() {
  const sheet = document.getElementById('promptsSheet');
  const overlay = document.getElementById('promptsSheetOverlay');
  if (!sheet || !overlay) return;
  const open = sheet.classList.contains('open');
  if (open) {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    renderPromptsSheet();
    sheet.classList.add('open');
    overlay.classList.add('open');
  }
}

function deletePrompt(idx) {
  if (!confirm('确定删除这条提示词？')) return;
  const arr = getPrompts();
  arr.splice(idx, 1);
  savePrompts(arr);
  renderPromptsSheet();
}

function resetPromptsToDefault() {
  if (!confirm('确定恢复为默认提示词？\n\n你添加的自定义提示词会被清空。')) return;
  localStorage.removeItem(PROMPTS_STORAGE_KEY);
  renderPromptsSheet();
}

// ========== 编辑器（添加自定义） ==========
function openPromptEditor() {
  document.getElementById('promptEditorIcon').value = '';
  document.getElementById('promptEditorName').value = '';
  document.getElementById('promptEditorContent').value = '';
  document.getElementById('promptEditor').classList.add('open');
  document.getElementById('promptEditorOverlay').classList.add('open');
  setTimeout(() => document.getElementById('promptEditorName').focus(), 50);
}

function closePromptEditor() {
  document.getElementById('promptEditor').classList.remove('open');
  document.getElementById('promptEditorOverlay').classList.remove('open');
}

function savePromptEditor() {
  const icon = document.getElementById('promptEditorIcon').value.trim() || '✨';
  const name = document.getElementById('promptEditorName').value.trim();
  const content = document.getElementById('promptEditorContent').value;
  if (!name) { alert('名称不能为空'); return; }
  if (!content.trim()) { alert('提示词内容不能为空'); return; }
  const arr = getPrompts();
  arr.push({ id: 'u' + Date.now(), icon, name, content });
  savePrompts(arr);
  closePromptEditor();
  renderPromptsSheet();
}

// escapeHtml 兜底（如果其它模块已定义会被覆盖，无害）
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  };
}

// ESC 关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const editor = document.getElementById('promptEditor');
    if (editor && editor.classList.contains('open')) { closePromptEditor(); return; }
    const sheet = document.getElementById('promptsSheet');
    if (sheet && sheet.classList.contains('open')) { togglePromptsSheet(); }
  }
});

console.log('[v0.9.8.3 E1] prompts module loaded, default count:', DEFAULT_PROMPTS.length);
