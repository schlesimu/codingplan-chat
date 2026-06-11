// ========== 文件上传 & 解析（v0.9.0 新增）==========
// 支持类型：
//   - 纯文本：.txt .md .json .csv .log .xml .yaml .yml .toml .ini .conf
//   - 代码：.py .js .ts .jsx .tsx .java .cpp .c .h .go .rs .rb .php .sh .sql 等几十种
//   - 富文档：.pdf（PDF.js）/ .docx（mammoth.js）
// 策略：纯前端解析，文本内容拼接到消息发送时的 sendMessages
// 大文件：超过 80KB 自动截断到 80KB（约 2 万汉字 / 5-8 万 token），头尾保留

const FILE_MAX_CHARS = 80000;  // 80K 字符上限
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
const MAMMOTH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';

// 待发送的文件附件列表 {name, content, size, type, truncated}
let pendingFiles = [];

// 文本类扩展名
const TEXT_EXTS = new Set([
  // 纯文本
  'txt','md','markdown','rst','log',
  // 数据格式
  'json','xml','yaml','yml','toml','ini','conf','csv','tsv','env',
  // 网页
  'html','htm','css','scss','sass','less',
  // 代码 - JS 族
  'js','jsx','ts','tsx','mjs','cjs','vue','svelte',
  // 代码 - 系统
  'py','rb','php','go','rs','java','kt','scala','swift','dart',
  'c','h','cpp','hpp','cc','cs','m','mm',
  // 代码 - 脚本
  'sh','bash','zsh','fish','ps1','bat','cmd','sql','r','lua','pl',
  // 配置
  'gitignore','dockerfile','makefile','editorconfig','prettierrc','eslintrc',
]);

function getFileExt(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isTextFile(name) {
  const ext = getFileExt(name);
  if (TEXT_EXTS.has(ext)) return true;
  // 无扩展名的常见配置文件
  const base = name.toLowerCase().replace(/^.*\//, '');
  if (['dockerfile','makefile','readme','license','changelog','gitignore'].includes(base)) return true;
  return false;
}

function isPdfFile(name) { return getFileExt(name) === 'pdf'; }
function isDocxFile(name) { return getFileExt(name) === 'docx'; }

// 加载 CDN 脚本（一次）
let _pdfjsPromise = null;
async function loadPdfJs() {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = (async () => {
    const mod = await import(PDFJS_CDN);
    mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return mod;
  })();
  return _pdfjsPromise;
}

let _mammothPromise = null;
async function loadMammoth() {
  if (_mammothPromise) return _mammothPromise;
  _mammothPromise = new Promise((resolve, reject) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const s = document.createElement('script');
    s.src = MAMMOTH_CDN;
    s.onload = () => resolve(window.mammoth);
    s.onerror = () => reject(new Error('mammoth.js 加载失败'));
    document.head.appendChild(s);
  });
  return _mammothPromise;
}

// 解析单个文件 → 文本
async function parseFile(file) {
  const name = file.name;
  if (isTextFile(name)) {
    return await file.text();
  }
  if (isPdfFile(name)) {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(it => it.str).join(' ');
      pages.push(`--- 第 ${i} 页 ---\n${text}`);
    }
    return pages.join('\n\n');
  }
  if (isDocxFile(name)) {
    const mammoth = await loadMammoth();
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  throw new Error(`不支持的文件类型: ${name}`);
}

// 截断超长文本
function truncateContent(content, maxChars = FILE_MAX_CHARS) {
  if (content.length <= maxChars) return { content, truncated: false };
  const half = Math.floor(maxChars / 2) - 100;
  const head = content.slice(0, half);
  const tail = content.slice(-half);
  return {
    content: `${head}\n\n[...... 中间部分省略，原文共 ${content.length.toLocaleString()} 字符 ......]\n\n${tail}`,
    truncated: true
  };
}

// 选文件入口（支持多选）
async function handleFileUpload(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      // 图片走原 image.js 流程
      if (typeof handleImageFile === 'function') {
        await handleImageFile(file);
      }
      continue;
    }
    await ingestOneFile(file);
  }
  renderPendingFiles();
}

async function ingestOneFile(file) {
  const id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const entry = { id, name: file.name, size: file.size, status: 'parsing', content: '', truncated: false };
  pendingFiles.push(entry);
  renderPendingFiles();

  try {
    const raw = await parseFile(file);
    const { content, truncated } = truncateContent(raw);
    entry.content = content;
    entry.truncated = truncated;
    entry.status = 'ok';
    entry.chars = raw.length;
  } catch (e) {
    entry.status = 'error';
    entry.error = e.message;
    if (typeof toast === 'function') toast(`❌ ${file.name}: ${e.message}`, 3000);
  }
  renderPendingFiles();
}

function removePendingFile(id) {
  pendingFiles = pendingFiles.filter(f => f.id !== id);
  renderPendingFiles();
}

function clearPendingFiles() {
  pendingFiles = [];
  renderPendingFiles();
}

function renderPendingFiles() {
  let container = document.getElementById('pendingFilesBar');
  if (!container) {
    // 创建容器，放在 input-area 上方
    const inputArea = document.querySelector('.input-area') || document.querySelector('.input-box')?.parentElement;
    if (!inputArea) return;
    container = document.createElement('div');
    container.id = 'pendingFilesBar';
    container.className = 'pending-files-bar';
    inputArea.parentElement.insertBefore(container, inputArea);
  }
  if (pendingFiles.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = pendingFiles.map(f => {
    const icon = f.status === 'parsing' ? '⏳' :
                 f.status === 'error' ? '❌' :
                 isPdfFile(f.name) ? '📕' :
                 isDocxFile(f.name) ? '📘' : '📄';
    const sizeStr = f.size < 1024 ? `${f.size}B` :
                    f.size < 1024*1024 ? `${(f.size/1024).toFixed(1)}KB` :
                    `${(f.size/1024/1024).toFixed(1)}MB`;
    const info = f.status === 'parsing' ? '解析中...' :
                 f.status === 'error' ? f.error :
                 f.truncated ? `✂️ ${f.chars.toLocaleString()} 字符（已截断）` :
                 `${(f.chars || 0).toLocaleString()} 字符`;
    return `<div class="pending-file" data-id="${f.id}">
      <span class="pf-icon">${icon}</span>
      <div class="pf-info">
        <div class="pf-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
        <div class="pf-meta">${sizeStr} · ${escapeHtml(info)}</div>
      </div>
      <button class="pf-remove" onclick="removePendingFile('${f.id}')" title="移除">✕</button>
    </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 把已解析的文件拼接到用户消息（在 sendMessage 调用前调用）
function injectPendingFilesToMessage(userText) {
  const ok = pendingFiles.filter(f => f.status === 'ok');
  if (ok.length === 0) return userText;
  const parts = [];
  if (userText && userText.trim()) parts.push(userText);
  parts.push('\n\n--- 我上传了以下文件作为参考 ---\n');
  for (const f of ok) {
    parts.push(`\n📎 **${f.name}**${f.truncated ? '（已截断）' : ''}\n\`\`\`\n${f.content}\n\`\`\`\n`);
  }
  return parts.join('');
}

// ========== 触发器：扩展 imgInput 接受所有文件 / 加文件按钮 ==========
function setupFileUpload() {
  // 1) 找到现有的"添加图片"按钮，替换其文件 input 接受类型
  const imgInput = document.getElementById('imgInput');
  if (imgInput) {
    // 改 accept，包含图片 + 文档 + 文本
    imgInput.setAttribute('accept', 'image/*,.pdf,.docx,.txt,.md,.json,.csv,.xml,.yaml,.yml,.html,.css,.js,.ts,.py,.go,.rs,.java,.cpp,.c,.h,.sh,.sql,.log,.conf');
    imgInput.setAttribute('multiple', 'multiple');
    // 替换原 onchange（保留图片走 handleImageFile 的流程，文档走新逻辑）
    imgInput.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      await handleFileUpload(files);
      e.target.value = '';  // 清空便于重复选同名
    };
  }

  // 2) 拖拽上传
  const dropTarget = document.querySelector('.input-area') || document.body;
  dropTarget.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropTarget.classList.add('drag-over');
  });
  dropTarget.addEventListener('dragleave', (e) => {
    if (e.target === dropTarget) dropTarget.classList.remove('drag-over');
  });
  dropTarget.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropTarget.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) await handleFileUpload(files);
  });
}

// 入口：自启动（DOMContentLoaded 已过则立即执行）
function _initFileUpload() {
  try { setupFileUpload(); } catch (e) { console.error('[fileupload] setup 失败', e); }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initFileUpload);
} else {
  _initFileUpload();
}
