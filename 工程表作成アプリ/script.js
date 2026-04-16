'use strict';

const STORAGE_KEY = 'gantt_tasks';
const COLORS = [
  '#3498db', '#2ecc71', '#e67e22', '#9b59b6',
  '#e74c3c', '#1abc9c', '#f39c12', '#34495e'
];

let tasks = [];

// ---- 初期化 ----
function init() {
  loadFromStorage();
  setDefaultDate();
  document.getElementById('addBtn').addEventListener('click', handleAdd);
  document.getElementById('clearBtn').addEventListener('click', handleClear);
  render();
}

function setDefaultDate() {
  const today = formatDate(new Date());
  document.getElementById('startDate').value = today;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseDate(str) {
  // "YYYY-MM-DD" → Date（UTC midnight 扱い）
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  // a, b: Date objects
  const ms = b - a;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ---- ストレージ ----
function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) tasks = JSON.parse(data);
  } catch (e) {
    tasks = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ---- イベント ----
function handleAdd() {
  const name = document.getElementById('taskName').value.trim();
  const startStr = document.getElementById('startDate').value;
  const duration = parseInt(document.getElementById('duration').value, 10);
  const errEl = document.getElementById('errorMsg');

  errEl.hidden = true;

  if (!name) {
    showError('作業名を入力してください');
    return;
  }
  if (!startStr) {
    showError('開始日を入力してください');
    return;
  }
  if (!duration || duration < 1) {
    showError('日数は1以上を入力してください');
    return;
  }

  const task = {
    id: Date.now(),
    name,
    startStr,
    duration
  };
  tasks.push(task);
  saveToStorage();

  document.getElementById('taskName').value = '';
  document.getElementById('duration').value = '1';
  render();
}

function handleClear() {
  if (tasks.length === 0) return;
  if (!confirm('全ての作業を削除しますか？')) return;
  tasks = [];
  saveToStorage();
  render();
}

function handleDelete(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveToStorage();
  render();
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.hidden = false;
}

// ---- 描画 ----
function render() {
  const container = document.getElementById('chartContainer');

  if (tasks.length === 0) {
    container.innerHTML = '<p class="empty-msg">作業を追加するとチャートが表示されます</p>';
    return;
  }

  // 表示期間を計算
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let minDate = today;
  let maxDate = today;

  tasks.forEach(t => {
    const start = parseDate(t.startStr);
    const end = addDays(start, t.duration - 1);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });

  // 前後に余白を追加
  const chartStart = addDays(minDate, -1);
  const chartEnd = addDays(maxDate, 2);
  const totalDays = daysBetween(chartStart, chartEnd) + 1;

  // タスク名列の幅
  const nameColWidth = 140;
  const dayColWidth = 32; // px per day

  const wrapper = document.createElement('div');
  wrapper.className = 'gantt-wrapper';
  wrapper.style.width = `${nameColWidth + totalDays * dayColWidth}px`;

  // ヘッダー行
  const header = buildHeader(chartStart, totalDays, nameColWidth, dayColWidth, today);
  wrapper.appendChild(header);

  // 各タスク行
  tasks.forEach((task, idx) => {
    const row = buildRow(task, idx, chartStart, totalDays, nameColWidth, dayColWidth);
    wrapper.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function buildHeader(chartStart, totalDays, nameColWidth, dayColWidth, today) {
  const header = document.createElement('div');
  header.className = 'gantt-header';

  const cols = `${nameColWidth}px ` + Array(totalDays).fill(`${dayColWidth}px`).join(' ');
  header.style.gridTemplateColumns = cols;

  // タスク名列ヘッダー
  const nameLabel = document.createElement('div');
  nameLabel.className = 'gantt-header-name';
  nameLabel.textContent = '作業名';
  header.appendChild(nameLabel);

  // 日付ラベル
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(chartStart, i);
    const isToday = daysBetween(today, d) === 0;
    const cell = document.createElement('div');
    cell.className = 'gantt-header-label' + (isToday ? ' today-header' : '');

    // 月初と週の頭だけラベル表示（日曜 or 1日）
    const dayOfMonth = d.getDate();
    const dayOfWeek = d.getDay(); // 0=日
    if (dayOfMonth === 1 || dayOfWeek === 0 || totalDays <= 14) {
      if (totalDays <= 14) {
        cell.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
      } else if (dayOfMonth === 1) {
        cell.textContent = `${d.getMonth() + 1}月`;
      } else {
        cell.textContent = `${d.getDate()}`;
      }
    }

    header.appendChild(cell);
  }

  return header;
}

function buildRow(task, idx, chartStart, totalDays, nameColWidth, dayColWidth) {
  const row = document.createElement('div');
  row.className = 'gantt-row';
  const cols = `${nameColWidth}px ` + Array(totalDays).fill(`${dayColWidth}px`).join(' ');
  row.style.gridTemplateColumns = cols;
  row.style.position = 'relative';

  // 作業名セル
  const nameCell = document.createElement('div');
  nameCell.className = 'gantt-task-name';
  nameCell.title = task.name;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = '削除';
  deleteBtn.addEventListener('click', () => handleDelete(task.id));

  const nameSpan = document.createElement('span');
  nameSpan.textContent = task.name;
  nameSpan.style.overflow = 'hidden';
  nameSpan.style.textOverflow = 'ellipsis';
  nameSpan.style.whiteSpace = 'nowrap';

  nameCell.appendChild(deleteBtn);
  nameCell.appendChild(nameSpan);
  row.appendChild(nameCell);

  const taskStart = parseDate(task.startStr);
  const taskEnd = addDays(taskStart, task.duration - 1);
  const startOffset = daysBetween(chartStart, taskStart); // 0-based
  const endOffset = daysBetween(chartStart, taskEnd);

  // 日付セル群（ガントバー配置用）
  for (let i = 0; i < totalDays; i++) {
    const cell = document.createElement('div');
    cell.className = 'gantt-cell';

    // バーをスタートセルに配置
    if (i === startOffset) {
      const barWidth = (endOffset - startOffset + 1) * dayColWidth - 4;
      const bar = document.createElement('div');
      bar.className = 'gantt-bar';
      bar.style.left = '2px';
      bar.style.width = `${barWidth}px`;
      bar.style.background = COLORS[idx % COLORS.length];
      bar.title = `${task.name}：${task.startStr} ～ ${formatDate(taskEnd)}（${task.duration}日）`;

      // バーが十分広い場合だけラベル表示
      if (barWidth > 40) {
        bar.textContent = `${task.duration}日`;
      }

      cell.appendChild(bar);
    }

    row.appendChild(cell);
  }

  return row;
}

document.addEventListener('DOMContentLoaded', init);
