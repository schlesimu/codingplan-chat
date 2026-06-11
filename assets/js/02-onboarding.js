// ========== 首次欢迎页 ==========
// (拆自 index.html v0.8.4)
// v0.9.2 修复：按钮 onclick 直接调，函数自身容错，不依赖全局变量预初始化

function finishOnboarding() {
  try { localStorage.setItem('codingplan-onboarded', '1'); } catch (e) {}
  const onb = document.getElementById('onboarding');
  const main = document.getElementById('app-main');
  const input = document.getElementById('userInput');
  if (onb) onb.classList.add('hidden');
  if (main) main.classList.add('visible');
  if (input && typeof input.focus === 'function') {
    try { input.focus(); } catch (e) {}
  }
}

function cancelOnboarding() {
  // 返回空白页或提示
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-size:16px;background:#1a1a2e;">已取消，请刷新页面重新进入</div>';
}

function checkOnboarding() {
  if (localStorage.getItem('codingplan-onboarded') === '1') {
    const onb = document.getElementById('onboarding');
    const main = document.getElementById('app-main');
    if (onb) onb.classList.add('hidden');
    if (main) main.classList.add('visible');
    return true;
  }
  return false;
}

// 暴露到 window 给 inline onclick 用（关键！）
if (typeof window !== 'undefined') {
  window.finishOnboarding = finishOnboarding;
  window.cancelOnboarding = cancelOnboarding;
  window.checkOnboarding = checkOnboarding;
}

// ========== 数据持久化 ==========