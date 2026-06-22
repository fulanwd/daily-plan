const TAG_CLASS = {
  '健身': 'tag-健身', '雅思': 'tag-雅思', '饮食': 'tag-饮食',
  '睡眠': 'tag-睡眠', '放松': 'tag-放松', '通勤': '', '日常': '', '休息': ''
};

let plansData = { plans: {} };
let viewingDate = todayStr();
const notified = new Set();

const $ = (id) => document.getElementById(id);

function todayStr() {
  const d = new Date();
  return fmtDate(d);
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

    if (isViewingToday()) {
      if (now >= start && now < end) { cls += ' current'; currentIdx = i; }
      else if (now >= end) cls += ' past';
      else if (currentIdx === -1 && i === plan.items.findIndex(it => timeToMinutes(it.time) > now)) cls += ' next';
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
  setTimeout(() => { t.hidden = true; }, 2800);
}

async function requestNotify() {
  if (!('Notification' in window)) {
    showToast('此浏览器不支持通知');
    return;
  }
  const perm = await Notification.requestPermission();
  const btn = $('notifyBtn');
  if (perm === 'granted') {
    btn.textContent = '提醒已开启 ✓';
    btn.classList.add('on');
    showToast('到点会弹窗提醒（请保持页面或已加主屏幕）');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification('日课', {
        body: '提醒已就绪，到点会通知你～',
        icon: 'icons/icon-192.png'
      }));
    }
  } else {
    btn.textContent = '开启提醒';
    showToast('未授权通知，可用下方导入日历');
  }
}

function checkReminders() {
  if (!isViewingToday() || Notification.permission !== 'granted') return;
  const plan = plansData.plans[viewingDate];
  if (!plan) return;

  const now = nowMinutes();
  plan.items.forEach((item, i) => {
    const key = `${viewingDate}-${i}-${item.time}`;
    const start = timeToMinutes(item.time);
    if (now === start && !notified.has(key)) {
      notified.add(key);
      const body = item.detail || '查看计划详情';
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`⏰ ${item.title}`, { body, icon: 'icons/icon-192.png', tag: key });
        });
      } else {
        new Notification(`⏰ ${item.title}`, { body });
      }
    }
  });
}

function exportICS() {
  const plan = plansData.plans[viewingDate];
  if (!plan) { showToast('这天没有计划可导出'); return; }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DailyPlan//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  plan.items.forEach((item, i) => {
    const start = item.time.replace(':', '');
    const end = (item.end || item.time).replace(':', '');
    const uid = `${viewingDate}-${i}@dailyplan`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;TZID=Asia/Shanghai:${viewingDate.replace(/-/g, '')}T${start}00`,
      `DTEND;TZID=Asia/Shanghai:${viewingDate.replace(/-/g, '')}T${end}00`,
      `SUMMARY:${item.title}`,
      item.detail ? `DESCRIPTION:${item.detail.replace(/\n/g, '\\n')}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${item.title}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.filter(Boolean).join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `日课-${viewingDate}.ics`;
  a.click();
  showToast('已下载，用手机日历打开即可定时提醒');
}

function bindEvents() {
  $('prevBtn').onclick = () => { viewingDate = addDays(viewingDate, -1); render(); };
  $('nextBtn').onclick = () => { viewingDate = addDays(viewingDate, 1); render(); };
  $('todayBtn').onclick = () => { viewingDate = todayStr(); render(); };
  $('datePicker').onchange = (e) => { viewingDate = e.target.value; render(); };
  $('notifyBtn').onclick = requestNotify;
  $('calendarBtn').onclick = exportICS;
}

async function init() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (_) {}
  }
  await loadPlans();
  bindEvents();
  render();
  setInterval(() => { render(); checkReminders(); }, 30000);
  checkReminders();
}

init();