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

// ========== GitHub Gist 云存储 ==========