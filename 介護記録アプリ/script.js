const STORAGE_KEY = 'careRecords';

let selectedCategory = '食事';
let viewDate = todayStr();

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const day = new Date(str).getDay();
  return `${y}年${m}月${d}日（${days[day]}）`;
}

function addDays(str, n) {
  const d = new Date(str);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getIcon(category) {
  const map = { '食事': '🍚', '水分': '💧', '排泄': '🚽' };
  return map[category] || '📋';
}

function renderRecords() {
  const records = loadRecords();
  const dayRecords = (records[viewDate] || []).slice().sort((a, b) => a.time.localeCompare(b.time));

  document.getElementById('currentDate').textContent = formatDate(viewDate);

  // サマリー
  const counts = { '食事': 0, '水分': 0, '排泄': 0 };
  dayRecords.forEach(r => { if (counts[r.category] !== undefined) counts[r.category]++; });
  document.querySelector('#summaryFood strong').textContent = counts['食事'];
  document.querySelector('#summaryWater strong').textContent = counts['水分'];
  document.querySelector('#summaryToilet strong').textContent = counts['排泄'];

  // リスト
  const list = document.getElementById('recordList');
  if (dayRecords.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  list.innerHTML = dayRecords.map((r, i) => `
    <div class="record-item" data-category="${r.category}">
      <span class="record-category">${getIcon(r.category)}</span>
      <div class="record-info">
        <span class="record-time">${r.time}</span>
        <span class="record-label"> ${r.category}</span>
        ${r.memo ? `<div class="record-memo">${escapeHtml(r.memo)}</div>` : ''}
      </div>
      <button class="delete-btn" data-id="${r.id}" title="削除">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addRecord() {
  const time = document.getElementById('recordTime').value;
  const memo = document.getElementById('recordMemo').value.trim();

  if (!time) {
    alert('時刻を入力してください');
    return;
  }

  const records = loadRecords();
  if (!records[viewDate]) records[viewDate] = [];

  records[viewDate].push({
    id: Date.now().toString(),
    category: selectedCategory,
    time,
    memo
  });

  saveRecords(records);
  document.getElementById('recordMemo').value = '';
  renderRecords();
}

function deleteRecord(id) {
  const records = loadRecords();
  if (!records[viewDate]) return;
  records[viewDate] = records[viewDate].filter(r => r.id !== id);
  saveRecords(records);
  renderRecords();
}

// 初期設定
function setDefaultTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('recordTime').value = `${hh}:${mm}`;
}

// イベント
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.category;
  });
});

document.getElementById('addBtn').addEventListener('click', addRecord);

document.getElementById('prevDay').addEventListener('click', () => {
  viewDate = addDays(viewDate, -1);
  renderRecords();
});

document.getElementById('nextDay').addEventListener('click', () => {
  viewDate = addDays(viewDate, 1);
  renderRecords();
});

// 初期化
setDefaultTime();
renderRecords();
