// 日课 · Scriptable 小组件
// widget-parameter: {"name":"theme","type":"enumeration","title":"配色","value":"light","caseTitles":["白天","黑夜"],"caseValues":["light","dark"]}

const PLANS_URL = "https://fulan-daily-plan.netlify.app/data/plans.json";
const RIKE_URL = "https://fulan-daily-plan.netlify.app/index.html";

const THEMES = {
  light: {
    bg: "#fff8fa",
    title: "#ff4d7a",
    heading: "#2d2438",
    body: "#5c4f6b",
    muted: "#8a7a9a",
    accent: "#1a9d6c",
    next: "#3d6fd4",
  },
  dark: {
    bg: "#0a0a0a",
    title: "#5dffc0",
    heading: "#5dffc0",
    body: "#b8ffe8",
    muted: "#6fd4b0",
    accent: "#5dffc0",
    next: "#7effd4",
  },
};

function themeKey() {
  const t = args.theme || args.widgetParameter || "light";
  return t === "dark" ? "dark" : "light";
}

function C(hex) {
  return new Color(hex);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

async function fetchPlans() {
  const req = new Request(PLANS_URL);
  req.headers = { "Cache-Control": "no-cache" };
  return await req.loadJSON();
}

function findCurrent(plan) {
  const now = nowMin();
  let cur = null;
  let next = null;
  for (const item of plan.items) {
    const start = timeToMin(item.time);
    const end = item.end ? timeToMin(item.end) : start + 15;
    if (now >= start && now < end) cur = item;
    if (!next && start > now) next = item;
  }
  return { cur, next };
}

function addLine(widget, text, size, color, bold) {
  const t = widget.addText(text);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = C(color);
  return t;
}

async function createWidget() {
  const theme = THEMES[themeKey()];
  const w = new ListWidget();
  w.setPadding(14, 14, 14, 14);
  w.backgroundColor = C(theme.bg);
  w.widgetUrl = RIKE_URL;

  try {
    const data = await fetchPlans();
    const plan = data.plans[todayStr()];

    if (!plan) {
      addLine(w, "日课 ✿", 16, theme.title, true);
      addLine(w, "今天暂无计划", 13, theme.body, false);
      return w;
    }

    addLine(w, `${plan.emoji || "✿"} ${plan.label} · ${plan.title}`, 13, theme.title, true);

    const { cur, next } = findCurrent(plan);

    if (cur) {
      addLine(w, "进行中", 11, theme.accent, true);
      addLine(w, cur.title, 16, theme.heading, true);
      if (cur.detail) {
        const d = addLine(w, cur.detail, 11, theme.muted, false);
        d.lineLimit = 2;
      }
    } else if (next) {
      addLine(w, `下一步 ${next.time}`, 11, theme.next, true);
      addLine(w, next.title, 16, theme.heading, true);
    } else {
      addLine(w, "今日已结束 🌙", 14, theme.body, false);
    }

    w.addSpacer();
    const foot = addLine(w, "日课 · 点击查看", 10, theme.muted, false);
    foot.rightAlignText();
  } catch (e) {
    addLine(w, "日课 ✿", 16, theme.title, true);
    addLine(w, "网络连接失败", 13, theme.body, false);
    addLine(w, "点击查看网页", 11, theme.muted, false);
  }

  return w;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();