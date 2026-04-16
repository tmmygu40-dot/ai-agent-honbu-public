'use strict';

const STORAGE_KEY = 'shift_manager_data';

let shifts = loadShifts();

// DOM要素
const staffNameEl = document.getElementById('staffName');
const workDateEl = document.getElementById('workDate');
const startTimeEl = document.getElementById('startTime');
const endTimeEl = document.getElementById('endTime');
const addBtn = document.getElementById('addBtn');
const dailyList = document.getElementById('dailyList');
const personList = document.getElementById('personList');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 今日の日付をデフォルトに
workDateEl.value = today();

// イベント
addBtn.addEventListener('click', addShift);

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addShift() {
  const name = staffNameEl.value.trim();
  const date = workDateEl.value;
  const start = startTimeEl.value;
  const end = endTimeEl.value;

  if (!name || !date || !start || !end) {
    alert('すべての項目を入力してください。');
    return;
  }

  const hours = calcHours(start, end);
  if (hours <= 0) {
    alert('終了時刻は開始時刻より後に設定してください。');
    return;
  }

  const shift = {
    id: Date.now(),
    name,
    date,
    start,
    end,
    hours
  };

  shifts.push(shift);
  saveShifts();
  render();

  staffNameEl.value = '';
  startTimeEl.value = '';
  endTimeEl.value = '';
}

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return Math.round((endMin - startMin) / 60 * 10) / 10;
}

function deleteShift(id) {
  shifts = shifts.filter(s => s.id !== id);
  saveShifts();
  render();
}

function render() {
  renderDaily();
  renderPerson();
}

function renderDaily() {
  if (shifts.length === 0) {
    dailyList.innerHTML = '<p class="empty-msg">シフトがまだ登録されていません。</p>';
    return;
  }

  // 日付でグループ化
  const grouped = {};
  shifts.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  // 日付順でソート
  const dates = Object.keys(grouped).sort();

  dailyList.innerHTML = dates.map(date => {
    const dayShifts = grouped[date].sort((a, b) => a.start.localeCompare(b.start));
    const rows = dayShifts.map(s => `
      <div class="shift-row">
        <span class="shift-name">${escHtml(s.name)}</span>
        <span class="shift-time">${s.start} 〜 ${s.end}</span>
        <span class="shift-hours">${s.hours}h</span>
        <button class="btn-delete" data-id="${s.id}">削除</button>
      </div>
    `).join('');

    const totalH = Math.round(dayShifts.reduce((sum, s) => sum + s.hours, 0) * 10) / 10;
    return `
      <div class="day-card">
        <div class="day-header">${formatDate(date)}　合計 ${totalH}h</div>
        ${rows}
      </div>
    `;
  }).join('');

  dailyList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteShift(Number(btn.dataset.id)));
  });
}

function renderPerson() {
  if (shifts.length === 0) {
    personList.innerHTML = '<p class="empty-msg">シフトがまだ登録されていません。</p>';
    return;
  }

  // 名前でグループ化
  const totals = {};
  shifts.forEach(s => {
    totals[s.name] = (totals[s.name] || 0) + s.hours;
  });

  // 合計時間の降順でソート
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  personList.innerHTML = sorted.map(([name, total]) => `
    <div class="person-card">
      <span class="person-name">${escHtml(name)}</span>
      <span class="person-total">${Math.round(total * 10) / 10} h</span>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${days[d.getDay()]}）`;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function saveShifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

function loadShifts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// 初期描画
render();
