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

// ========== v0.9.5.8: 视觉效果三档式（标准 / 简约 / 极简） ==========
const FX_MODE_KEY = 'codingplan-fx-mode';
const FX_MODES = ['standard', 'simple', 'minimal'];
const FX_LABELS = {
  standard: '视觉效果：标准',
  simple: '视觉效果：简约',
  minimal: '视觉效果：极简'
};

function getFxMode() {
  const m = localStorage.getItem(FX_MODE_KEY);
  return FX_MODES.includes(m) ? m : 'standard';
}

function applyFxMode(mode) {
  document.body.classList.remove('fx-simple', 'fx-minimal');
  if (mode === 'simple') document.body.classList.add('fx-simple');
  else if (mode === 'minimal') document.body.classList.add('fx-minimal');

  const btn = document.getElementById('reduceFxToggle');
  const label = document.getElementById('reduceFxLabel');
  if (btn) {
    btn.classList.remove('fx-mode-simple', 'fx-mode-minimal');
    if (mode === 'simple') btn.classList.add('fx-mode-simple');
    else if (mode === 'minimal') btn.classList.add('fx-mode-minimal');
  }
  if (label) label.textContent = FX_LABELS[mode] || FX_LABELS.standard;
}

function toggleReduceFx() {
  const cur = getFxMode();
  const idx = FX_MODES.indexOf(cur);
  const next = FX_MODES[(idx + 1) % FX_MODES.length];
  if (next === 'standard') {
    localStorage.removeItem(FX_MODE_KEY);
  } else {
    localStorage.setItem(FX_MODE_KEY, next);
  }
  applyFxMode(next);
}

// 启动恢复
function _initFxMode() {
  try { applyFxMode(getFxMode()); }
  catch (e) { console.error('[fx-mode] init 失败', e); }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initFxMode);
} else {
  _initFxMode();
}

if (typeof window !== 'undefined') {
  window.toggleReduceFx = toggleReduceFx;
  window.getFxMode = getFxMode;
}

// ========== GitHub Gist 云存储 ==========