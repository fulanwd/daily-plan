const THEME_FALLBACK = "data/theme.json";
const LS_KEY = "rike-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = theme === "dark" ? "☀️ 白天" : "🌙 黑夜";
}

async function fetchDefaultTheme() {
  try {
    const res = await fetch(THEME_FALLBACK + "?" + Date.now());
    if (res.ok) return (await res.json()).theme;
  } catch (_) {}
  return null;
}

async function initTheme() {
  const local = localStorage.getItem(LS_KEY);
  const fallback = await fetchDefaultTheme();
  const theme = local || fallback || "light";
  applyTheme(theme);
  localStorage.setItem(LS_KEY, theme);
}

async function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(LS_KEY, next);
}

window.initTheme = initTheme;
window.toggleTheme = toggleTheme;