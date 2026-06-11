// ========== 首次欢迎页 ==========
// (拆自 index.html v0.8.4)

function finishOnboarding() {
  localStorage.setItem('codingplan-onboarded', '1');
  onboarding.classList.add('hidden');
  appMain.classList.add('visible');
  userInput.focus();
}

function cancelOnboarding() {
  // 返回空白页或提示
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--text-main);font-size:16px;">已取消，请刷新页面重新进入</div>';
}

function checkOnboarding() {
  if (localStorage.getItem('codingplan-onboarded') === '1') {
    onboarding.classList.add('hidden');
    appMain.classList.add('visible');
    return true;
  }
  return false;
}

// ========== 数据持久化 ==========