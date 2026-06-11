// ========== 主题 ==========
// (拆自 index.html v0.8.4)

const THEMES = ['dark', 'light', 'liquid'];

function switchTheme(theme) {
  if (!THEMES.includes(theme)) return;
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('codingplan-theme', theme);
  updateThemeSwitcherUI();
}

function toggleTheme() {
  const idx = THEMES.indexOf(currentTheme);
  const next = THEMES[(idx + 1) % THEMES.length];
  switchTheme(next);
}

function updateThemeSwitcherUI() {
  document.querySelectorAll('.sidebar-theme-btn').forEach(btn => {
    if (btn.dataset.mode === currentTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ========== v0.9.5.7: 弱视觉效果开关 ==========
const REDUCE_FX_KEY = 'codingplan-reduce-fx';

function isReduceFxOn() {
  return localStorage.getItem(REDUCE_FX_KEY) === '1';
}

function applyReduceFx(on) {
  document.body.classList.toggle('reduce-fx', !!on);
  const btn = document.getElementById('reduceFxToggle');
  const label = document.getElementById('reduceFxLabel');
  if (btn) btn.classList.toggle('reduce-fx-active', !!on);
  if (label) label.textContent = on ? '弱视觉效果（已开启）' : '弱视觉效果';
}

function toggleReduceFx() {
  const on = !isReduceFxOn();
  if (on) {
    localStorage.setItem(REDUCE_FX_KEY, '1');
  } else {
    localStorage.removeItem(REDUCE_FX_KEY);
  }
  applyReduceFx(on);
}

// 启动时恢复弱视觉状态
function _initReduceFx() {
  try { applyReduceFx(isReduceFxOn()); }
  catch (e) { console.error('[reduce-fx] init 失败', e); }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initReduceFx);
} else {
  _initReduceFx();
}

if (typeof window !== 'undefined') {
  window.toggleReduceFx = toggleReduceFx;
}

// ========== GitHub Gist 云存储 ==========