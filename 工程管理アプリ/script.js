'use strict';

const STORAGE_KEY = 'gantt_tasks_v1';

let tasks = loadTasks();

// DOM
const taskNameEl = document.getElementById('taskName');
const startDateEl = document.getElementById('startDate');
const durationEl  = document.getElementById('duration');
const addBtn      = document.getElementById('addBtn');
const clearBtn    = document.getElementById('clearBtn');
const errorMsg    = document.getElementById('errorMsg');
const emptyMsg    = document.getElementById('emptyMsg');
const ganttWrap   = document.getElementById('ganttWrap');
const ganttLabels = document.getElementById('ganttLabels');
const ganttAxis   = document.getElementById('ganttAxis');
const ganttBars   = document.getElementById('ganttBars');

// 今日の日付をデフォルトにセット
startDateEl.value = toISO(new Date());

addBtn.addEventListener('click', addTask);
clearBtn.addEventListener('click', clearAll);

// Enterキーで追加
[taskNameEl, startDateEl, durationEl].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
});

render();

/* ─── タスク操作 ─── */

function addTask() {
  const name     = taskNameEl.value.trim();
  const dateStr  = startDateEl.value;
  const duration = parseInt(durationEl.value, 10);

  if (!name)           { showError('タスク名を入力してください'); return; }
  if (!dateStr)        { showError('開始日を入力してください'); return; }
  if (!duration || duration < 1) { showError('期間（日数）を1以上で入力してください'); return; }

  tasks.push({ id: Date.now(), name, startDate: dateStr, duration });
  saveTasks();
  render();

  taskNameEl.value = '';
  durationEl.value = '';
  taskNameEl.focus();
  showError('');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearAll() {
  if (tasks.length === 0) return;
  if (!confirm('全タスクを削除しますか？')) return;
  tasks = [];
  saveTasks();
  render();
}

/* ─── 描画 ─── */

function render() {
  ganttLabels.innerHTML = '';
  ganttAxis.innerHTML   = '';
  ganttBars.innerHTML   = '';

  if (tasks.length === 0) {
    emptyMsg.style.display = 'block';
    ganttWrap.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  ganttWrap.style.display = 'block';

  // 全タスクの日付範囲を計算
  const allDates = tasks.flatMap(t => [
    parseDate(t.startDate),
    addDays(parseDate(t.startDate), t.duration - 1)
  ]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // 週の始まりに揃える（月曜）
  const chartStart = getMondayBefore(minDate);
  // 週の終わりに揃える（日曜）
  const chartEnd   = getSundayAfter(maxDate);

  const totalDays = daysBetween(chartStart, chartEnd) + 1;
  const DAY_PX    = 28; // 1日あたりのピクセル幅
  const chartWidth = totalDays * DAY_PX;

  // ── ラベル列ヘッダー ──
  const labelHeader = el('div', 'label-header', 'タスク名');
  ganttLabels.appendChild(labelHeader);

  // ── 軸ヘッダー ──
  ganttAxis.style.width = chartWidth + 'px';

  // 週ごとにラベルを描画
  let cur = new Date(chartStart);
  while (cur <= chartEnd) {
    const offset = daysBetween(chartStart, cur);
    const lbl = el('div', 'axis-label');
    lbl.style.left = (offset * DAY_PX + DAY_PX * 7 / 2) + 'px';
    lbl.textContent = formatAxisDate(cur);
    ganttAxis.appendChild(lbl);
    cur = addDays(cur, 7);
  }

  // ── バー背景（グリッド線） ──
  ganttBars.style.width = chartWidth + 'px';
  // 週ごとのグリッド線
  let curLine = new Date(chartStart);
  while (curLine <= chartEnd) {
    const offset = daysBetween(chartStart, curLine);
    const line = el('div', 'grid-line');
    line.style.left   = (offset * DAY_PX) + 'px';
    line.style.height = (tasks.length * 40) + 'px';
    ganttBars.appendChild(line);
    curLine = addDays(curLine, 7);
  }

  // ── タスク行 ──
  tasks.forEach(task => {
    const taskStart = parseDate(task.startDate);
    const offsetDays = daysBetween(chartStart, taskStart);
    const barLeft    = offsetDays * DAY_PX;
    const barWidth   = task.duration * DAY_PX;

    // ラベル行
    const labelRow = el('div', 'label-row');
    const nameSpan = el('span', 'label-name', task.name);
    nameSpan.title = task.name;
    const delBtn = el('button', 'delete-btn', '×');
    delBtn.title = '削除';
    delBtn.addEventListener('click', () => deleteTask(task.id));
    labelRow.appendChild(nameSpan);
    labelRow.appendChild(delBtn);
    ganttLabels.appendChild(labelRow);

    // バー行
    const barRow = el('div', 'bar-row');
    const bar    = el('div', 'bar');
    bar.style.left  = barLeft + 'px';
    bar.style.width = Math.max(barWidth, 4) + 'px';
    // バー内ラベル：日数が短い場合は表示省略
    if (task.duration >= 2) {
      bar.textContent = task.duration + '日';
    }
    bar.title = `${task.name}｜${task.startDate} 〜 ${toISO(addDays(taskStart, task.duration - 1))}（${task.duration}日間）`;
    barRow.appendChild(bar);
    ganttBars.appendChild(barRow);
  });
}

/* ─── ユーティリティ ─── */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showError(msg) {
  errorMsg.textContent = msg;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function getMondayBefore(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=日, 1=月
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSundayAfter(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatAxisDate(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

/* ─── localStorage ─── */

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
