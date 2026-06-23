const TAG_CLASS = {
  '健身': 'tag-健身', '雅思': 'tag-雅思', '饮食': 'tag-饮食',
  '睡眠': 'tag-睡眠', '放松': 'tag-放松', '通勤': '', '日常': '', '休息': ''
};

const KEY_TAGS = new Set(['睡眠']);
const KEY_KEYWORDS = ['练前', '练后', '午饭', '入睡', '起床', '午睡', '腹肌', '正餐'];
const SUBSCRIBE_URL = new URL('calendar.ics', location.href).href;

let plansData = { plans: {} };
let viewingDate = todayStr();
const alerted = new Set();

const $ = (id) => document.getElementById(id);

function todayStr() {
  return fmtDate(new Date());
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function fmtDisplayDate(str) {
  const d = parseDate(str);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function isViewingToday() {
  return viewingDate === todayStr();
}

function isKeyItem(item) {
  if (KEY_TAGS.has(item.tag)) return true;
  return KEY_KEYWORDS.some((k) => item.title.includes(k));
}

function alertKey(date, idx, item, suffix = '') {
  return `${date}-${idx}-${item.time}${suffix}`;
}

function loadAlertedFromStorage() {
  const day = todayStr();
  const prefix = `alert-${day}-`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) alerted.add(k.slice(prefix.length));
  }
}

function markAlerted(key) {
  alerted.add(key);
  localStorage.setItem(`alert-${todayStr()}-${key}`, '1');
}

async function loadPlans() {
  const res = await fetch('data/plans.json?' + Date.now());
  plansData = await res.json();
}

function render() {
  const plan = plansData.plans[viewingDate];
  $('dateLine').textContent = fmtDisplayDate(viewingDate);
  $('datePicker').value = viewingDate;

  if (!plan) {
    $('dayEmoji').textContent = '📭';
    $('dayTitle').textContent = '这天还没有计划';
    $('daySummary').textContent = '让 Grok 生成后会上传到这里';
    $('timeline').innerHTML = '<div class="empty"><span>🌸</span>暂无安排<br>可以先看其他日期</div>';
    $('nowBanner').hidden = true;
    return;
  }

  $('dayEmoji').textContent = plan.emoji || '📅';
  $('dayTitle').textContent = `${plan.label} · ${plan.title}`;
  $('daySummary').textContent = plan.summary || '';

  const now = nowMinutes();
  let currentIdx = -1;

  const html = plan.items.map((item, i) => {
    const start = timeToMinutes(item.time);
    const end = item.end ? timeToMinutes(item.end) : start + 15;
    let cls = 'item';
    if (isKeyItem(item)) cls += ' key-item';

    if (isViewingToday()) {
      if (now >= start && now < end) { cls += ' current'; currentIdx = i; }
      else if (now >= end) cls += ' past';
      else if (currentIdx === -1 && i === plan.items.findIndex((it) => timeToMinutes(it.time) > now)) cls += ' next';
    }

    const tagCls = TAG_CLASS[item.tag] || '';
    const endLine = item.end ? `<small>→ ${item.end}</small>` : '';

    return `
      <article class="${cls}" data-idx="${i}">
        <div class="item-time">${item.time}${endLine}</div>
        <div class="item-body">
          <h3>${item.title}</h3>
          ${item.detail ? `<p>${item.detail}</p>` : ''}
          ${item.tag ? `<span class="tag ${tagCls}">${item.tag}</span>` : ''}
        </div>
      </article>`;
  }).join('');

  $('timeline').innerHTML = html;

  const banner = $('nowBanner');
  if (isViewingToday() && currentIdx >= 0) {
    const cur = plan.items[currentIdx];
    $('nowTitle').textContent = cur.title;
    $('nowDetail').textContent = cur.detail || '';
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 3200);
}

function showAlertOverlay(item, opts = {}) {
  const key = opts.key;
  if (key && alerted.has(key)) return;

  const overlay = $('alertOverlay');
  const badge = $('alertBadge');
  const isKey = isKeyItem(item);

  badge.textContent = opts.badge || (isKey ? '⭐ 关键事项' : '到点了');
  badge.className = 'alert-badge' + (isKey ? ' key' : '');
  $('alertTitle').textContent = item.title;
  $('alertDetail').textContent = item.detail || '按计划执行即可';
  overlay.hidden = false;

  if (key) markAlerted(key);

  if (navigator.vibrate) {
    navigator.vibrate(isKey ? [180, 80, 180, 80, 180] : [120, 60, 120]);
  }
}

function dismissAlert() {
  $('alertOverlay').hidden = true;
}

function checkAlerts() {
  if (!isViewingToday()) return;
  const plan = plansData.plans[viewingDate];
  if (!plan) return;

  const now = nowMinutes();

  plan.items.forEach((item, i) => {
    const start = timeToMinutes(item.time);
    const key = alertKey(viewingDate, i, item);

    // 关键事项：提前 10 分钟弹屏（无声视觉提醒）
    if (isKeyItem(item)) {
      const preKey = alertKey(viewingDate, i, item, '-pre');
      if (now === start - 10 && !alerted.has(preKey)) {
        showAlertOverlay(item, {
          key: preKey,
          badge: '⏳ 10 分钟后',
        });
      }
    }

    // 准时弹屏
    if (now === start && !alerted.has(key)) {
      showAlertOverlay(item, { key, badge: '⏰ 现在' });
    }
  });
}

function openSubscribeModal() {
  $('subscribeUrl').textContent = SUBSCRIBE_URL;
  $('subscribeModal').hidden = false;
}

function closeSubscribeModal() {
  $('subscribeModal').hidden = true;
}

async function copySubscribeUrl() {
  try {
    await navigator.clipboard.writeText(SUBSCRIBE_URL);
    showToast('已复制！去 iPhone 设置里添加订阅日历');
  } catch {
    showToast('请长按上方链接手动复制');
  }
}

function bindEvents() {
  $('prevBtn').onclick = () => { viewingDate = addDays(viewingDate, -1); render(); };
  $('nextBtn').onclick = () => { viewingDate = addDays(viewingDate, 1); render(); };
  $('todayBtn').onclick = () => { viewingDate = todayStr(); render(); };
  $('datePicker').onchange = (e) => { viewingDate = e.target.value; render(); };
  $('subscribeBtn').onclick = openSubscribeModal;
  $('copyUrlBtn').onclick = copySubscribeUrl;
  $('closeModalBtn').onclick = closeSubscribeModal;
  $('alertDismiss').onclick = dismissAlert;
  $('subscribeModal').onclick = (e) => {
    if (e.target === $('subscribeModal')) closeSubscribeModal();
  };
}

async function init() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (_) {}
  }
  loadAlertedFromStorage();
  await loadPlans();
  bindEvents();
  render();
  checkAlerts();

  setInterval(() => { render(); checkAlerts(); }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { render(); checkAlerts(); }
  });

  // 首次打开提示订阅（只提示一次）
  if (!localStorage.getItem('rike-subscribe-hint')) {
    localStorage.setItem('rike-subscribe-hint', '1');
    setTimeout(openSubscribeModal, 800);
  }
}

init();