// ========== 图片处理 ==========
// (拆自 index.html v0.8.4)

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  processImage(file);
  event.target.value = ''; // 重置以便重新选择同一文件
}

function processImage(file) {
  if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
  if (file.size > 10 * 1024 * 1024) { alert('图片不能超过 10MB'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    compressImage(reader.result, 1200, 0.8).then(compressed => {
      pendingImages.push(compressed);
      renderImagePreview();
    });
  };
  reader.readAsDataURL(file);
}

function compressImage(dataUrl, maxWidth, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function renderImagePreview() {
  const wrap = document.getElementById('imgPreview');
  wrap.innerHTML = pendingImages.map((img, i) => `
    <div class="img-preview-item">
      <img src="${img}" alt="preview">
      <button class="img-preview-remove" onclick="removeImage(${i})">✕</button>
    </div>
  `).join('');
  if (pendingImages.length > 0) wrap.classList.add('has-image');
  else wrap.classList.remove('has-image');
}

function removeImage(index) {
  pendingImages.splice(index, 1);
  renderImagePreview();
}

// 粘贴图片支持
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      processImage(item.getAsFile());
      return;
    }
  }
});

// 拖入图片支持
userInput.addEventListener('dragover', (e) => { e.preventDefault(); });
userInput.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) processImage(file);
});

function addMessage(role, content, hasImage = false) {
  const div = document.createElement('div'); div.className = `msg ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar';
  if (role === 'user') {
    avatar.innerHTML = '<svg viewBox="0 0 24 24" style="width:52%;height:52%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  } else {
    avatar.innerHTML = '<img src="logo.png" alt="小纸船" style="width:52%;height:52%;object-fit:contain;border-radius:50%">';
  }
  const bodyWrap = document.createElement('div'); bodyWrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (role === 'user' ? 'flex-end' : 'flex-start') + ';max-width:80%';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  if (hasImage) bubble.classList.add('has-image');
  bubble.innerHTML = formatContent(content);
  bodyWrap.appendChild(bubble);

  // AI 消息加操作按钮
  if (role === 'assistant') {
    const actions = document.createElement('div'); actions.className = 'msg-actions';
    actions.innerHTML = `
      <button class="msg-action-btn" title="复制"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button class="msg-action-btn" title="引用"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
      <button class="msg-action-btn" title="朗读"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
      <button class="msg-action-btn" title="重新生成"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
    `;
    // 绑定事件
    actions.children[0].onclick = (e) => { e.stopPropagation(); copyText(content); };
    actions.children[1].onclick = (e) => { e.stopPropagation(); quoteText(content); };
    actions.children[2].onclick = (e) => { e.stopPropagation(); speakText(content); };
    actions.children[3].onclick = (e) => { e.stopPropagation(); regenerateAnswer(div); };
    bodyWrap.appendChild(actions);
    // 右键菜单 — 绑在 msg div 上确保整个区域都能触发
    div.addEventListener('contextmenu', (e) => { e.preventDefault(); showMsgContextMenu(e, content, div); });
    // 移动端长按 — 阻止文字选择
    let longPressTimer;
    div.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        showMsgContextMenu(e, content, div);
      }, 500);
    }, { passive: true });
    div.addEventListener('touchend', () => clearTimeout(longPressTimer));
    div.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    // 阻止长按时的文字选择
    div.addEventListener('selectstart', (e) => {
      if (longPressTimer) e.preventDefault();
    });
  }

  div.appendChild(avatar); div.appendChild(bodyWrap);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;

  // v0.9.8.2 C2: Liquid 凝结发送动画 — 小纸船激起水面涟漪
  // 触发条件：user 消息 + 标准档（非 fx-simple） + 非 reduce-motion
  if (role === 'user'
      && !document.body.classList.contains('fx-simple')
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    triggerLiquidCondense(bubble);
  }

  return { div, bubble };
}

// v0.9.8.2 C2: Liquid 凝结动画核心
// 1) 从 send-btn 中心发射一圈玻璃涟漪（fixed 定位，跨 chat-area 不受 scroll 影响）
// 2) bubble 自身加 .bubble-liquid-condense 类播放凝结动画（模糊液滴 → 圆角矩形）
function triggerLiquidCondense(bubble) {
  // 涟漪
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    const btnRect = sendBtn.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'liquid-send-ripple';
    ripple.style.left = (btnRect.left + btnRect.width / 2) + 'px';
    ripple.style.top  = (btnRect.top  + btnRect.height / 2) + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }
  // 气泡凝结
  bubble.classList.add('bubble-liquid-condense');
  setTimeout(() => bubble.classList.remove('bubble-liquid-condense'), 700);
}

function addStreamingMessage() {
  const div = document.createElement('div');
  // v0.9.8.1 F2: 加 streaming 类，CSS 会锁 min-width 防气泡跳动
  div.className = 'msg assistant streaming';
  const avatar = document.createElement('div'); avatar.className = 'avatar';
  avatar.innerHTML = '<img src="logo.png" alt="小纸船" style="width:52%;height:52%;object-fit:contain;border-radius:50%">';
  const bodyWrap = document.createElement('div'); bodyWrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;max-width:80%';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  bodyWrap.appendChild(bubble);
  div.appendChild(avatar); div.appendChild(bodyWrap);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return { div, bubble };
}

// 给流式消息 div 补上操作按钮和右键/长按事件
function setupAssistantActions(div, bubble, content) {
  // v0.9.8.1 F2: 流式结束，移除 streaming 类让气泡恢复 fit-content 自然收缩
  div.classList.remove('streaming');
  // 操作按钮
  const actions = document.createElement('div'); actions.className = 'msg-actions';
  actions.innerHTML = `
    <button class="msg-action-btn" title="复制"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
    <button class="msg-action-btn" title="引用"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
    <button class="msg-action-btn" title="朗读"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
    <button class="msg-action-btn" title="重新生成"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
  `;
  actions.children[0].onclick = (e) => { e.stopPropagation(); copyText(content); };
  actions.children[1].onclick = (e) => { e.stopPropagation(); quoteText(content); };
  actions.children[2].onclick = (e) => { e.stopPropagation(); speakText(content); };
  actions.children[3].onclick = (e) => { e.stopPropagation(); regenerateAnswer(div); };
  bubble.parentElement.appendChild(actions);
  
  // 右键菜单 — 整个 msg div 都能触发
  div.addEventListener('contextmenu', (e) => { e.preventDefault(); showMsgContextMenu(e, content, div); });
  // 移动端长按
  let longPressTimer;
  div.addEventListener('touchstart', (e) => {
    longPressTimer = setTimeout(() => { showMsgContextMenu(e, content, div); }, 500);
  }, { passive: true });
  div.addEventListener('touchend', () => clearTimeout(longPressTimer));
  div.addEventListener('touchmove', () => clearTimeout(longPressTimer));
}

// ========== 联网搜索 ==========