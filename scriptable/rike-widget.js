// 日课 · Scriptable 小组件
// 用法：iPhone 安装 Scriptable → 新建脚本 → 粘贴本文件 → 主屏幕添加小组件 → 选「日课」
// 文档：https://scriptable.app

const PLANS_URL = "https://fulan-daily-plan.netlify.app/data/plans.json";

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const res = await req.loadJSON();
  return res;
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

async function createWidget() {
  const w = new ListWidget();
  w.setPadding(14, 14, 14, 14);
  w.backgroundColor = new Color("#fff8fa");

  try {
    const data = await fetchPlans();
    const plan = data.plans[todayStr()];

    if (!plan) {
      w.addText("日课 ✿").font = Font.boldSystemFont(16);
      w.addText("今天暂无计划").font = Font.systemFont(12);
      w.addSpacer();
      w.widgetUrl = "https://fulan-daily-plan.netlify.app/";
      return w;
    }

    const title = w.addText(`${plan.emoji || "✿"} ${plan.label} · ${plan.title}`);
    title.font = Font.boldSystemFont(13);
    title.textColor = new Color("#ff7a9a");

    const { cur, next } = findCurrent(plan);

    if (cur) {
      const nowLabel = w.addText("进行中");
      nowLabel.font = Font.mediumSystemFont(11);
      nowLabel.textColor = new Color("#2a9d7a");
      const t = w.addText(cur.title);
      t.font = Font.boldSystemFont(15);
      if (cur.detail) {
        const d = w.addText(cur.detail);
        d.font = Font.systemFont(11);
        d.textColor = new Color("#9a8faa");
        d.lineLimit = 2;
      }
    } else if (next) {
      const nl = w.addText(`下一步 ${next.time}`);
      nl.font = Font.mediumSystemFont(11);
      nl.textColor = new Color("#5a82c4");
      const t = w.addText(next.title);
      t.font = Font.boldSystemFont(15);
    } else {
      w.addText("今日已结束 🌙").font = Font.systemFont(13);
    }

    w.addSpacer();
    const foot = w.addText("日课");
    foot.font = Font.systemFont(10);
    foot.textColor = new Color("#9a8faa");
    foot.rightAlignText();
    w.widgetUrl = "https://fulan-daily-plan.netlify.app/";
  } catch (e) {
    w.addText("日课 ✿").font = Font.boldSystemFont(16);
    w.addText("网络连接失败").font = Font.systemFont(12);
    w.widgetUrl = "https://fulan-daily-plan.netlify.app/";
  }

  return w;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();