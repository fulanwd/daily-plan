const THEME_API = "/.netlify/functions/theme";
const THEME_FALLBACK = "data/theme.json";
const LS_KEY = "rike-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = theme === "dark" ? "☀️ 白天" : "🌙 黑夜";
}

async function fetchRemoteTheme() {
  try {
    const res = await fetch(THEME_API + "?" + Date.now());
    if (res.ok) return (await res.json()).theme;
  } catch (_) {}
  try {
    const res = await fetch(THEME_FALLBACK + "?" + Date.now());
    if (res.ok) return (await res.json()).theme;
  } catch (_) {}
  return null;
}

async function saveRemoteTheme(theme) {
  try {
    await fetch(THEME_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch (_) {}
}

async function initTheme() {
  const remote = await fetchRemoteTheme();
  const local = localStorage.getItem(LS_KEY);
  const theme = remote || local || "light";
  applyTheme(theme);
  localStorage.setItem(LS_KEY, theme);
}

async function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(LS_KEY, next);
  await saveRemoteTheme(next);
}

window.initTheme = initTheme;
window.toggleTheme = toggleTheme;