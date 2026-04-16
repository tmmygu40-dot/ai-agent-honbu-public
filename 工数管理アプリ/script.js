'use strict';

const STORAGE_KEY = 'kousuu_records';

let records = loadRecords();

// DOM
const projectNameEl = document.getElementById('projectName');
const hourlyRateEl  = document.getElementById('hourlyRate');
const workHoursEl   = document.getElementById('workHours');
const workDateEl    = document.getElementById('workDate');
const workMemoEl    = document.getElementById('workMemo');
const addBtn        = document.getElementById('addBtn');
const recordsList   = document.getElementById('recordsList');
const filterProject = document.getElementById('filterProject');
const summarySection = document.getElementById('summarySection');

// 今日の日付をデフォルトにセット
workDateEl.value = todayStr();

addBtn.addEventListener('click', addRecord);
filterProject.addEventListener('change', render);

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addRecord() {
  const project = projectNameEl.value.trim();
  const rate    = parseFloat(hourlyRateEl.value);
  const hours   = parseFloat(workHoursEl.value);
  const date    = workDateEl.value;

  if (!project) { alert('案件名を入力してください'); projectNameEl.focus(); return; }
  if (isNaN(rate) || rate < 0) { alert('時給を正しく入力してください'); hourlyRateEl.focus(); return; }
  if (isNaN(hours) || hours <= 0) { alert('作業時間を正しく入力してください'); workHoursEl.focus(); return; }
  if (!date) { alert('作業日を選択してください'); workDateEl.focus(); return; }

  records.push({
    id: Date.now(),
    project,
    rate,
    hours,
    date,
    memo: workMemoEl.value.trim(),
    amount: Math.round(rate * hours)
  });

  saveRecords();
  clearForm();
  render();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

function clearForm() {
  projectNameEl.value = '';
  hourlyRateEl.value  = '';
  workHoursEl.value   = '';
  workDateEl.value    = todayStr();
  workMemoEl.value    = '';
  projectNameEl.focus();
}

function getFilteredRecords() {
  const sel = filterProject.value;
  if (!sel) return records;
  return records.filter(r => r.project === sel);
}

function render() {
  updateFilter();
  renderSummary();
  renderList();
}

function updateFilter() {
  const projects = [...new Set(records.map(r => r.project))].sort();
  const current  = filterProject.value;
  filterProject.innerHTML = '<option value="">すべて表示</option>';
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === current) opt.selected = true;
    filterProject.appendChild(opt);
  });
}

function renderSummary() {
  const filtered = getFilteredRecords();
  if (filtered.length === 0) { summarySection.innerHTML = ''; return; }

  // 案件ごとの集計
  const byProject = {};
  filtered.forEach(r => {
    if (!byProject[r.project]) byProject[r.project] = { hours: 0, amount: 0 };
    byProject[r.project].hours  += r.hours;
    byProject[r.project].amount += r.amount;
  });

  const totalHours  = filtered.reduce((s, r) => s + r.hours, 0);
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);

  let html = '<div class="summary-cards">';

  html += `
    <div class="summary-card">
      <div class="summary-card__label">合計工数</div>
      <div class="summary-card__value">${fmtHours(totalHours)}</div>
      <div class="summary-card__sub">${filtered.length} 件</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">合計請求額</div>
      <div class="summary-card__value">${fmtYen(totalAmount)}</div>
    </div>
  `;

  Object.entries(byProject).forEach(([proj, { hours, amount }]) => {
    html += `
      <div class="summary-card">
        <div class="summary-card__label">${escapeHtml(proj)}</div>
        <div class="summary-card__value">${fmtYen(amount)}</div>
        <div class="summary-card__sub">${fmtHours(hours)}</div>
      </div>
    `;
  });

  html += '</div>';
  summarySection.innerHTML = html;
}

function renderList() {
  const filtered = getFilteredRecords().slice().sort((a, b) => b.date.localeCompare(a.date));

  if (filtered.length === 0) {
    recordsList.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  recordsList.innerHTML = filtered.map(r => `
    <div class="record-item" data-id="${r.id}">
      <div class="record-item__info">
        <div class="record-item__project">${escapeHtml(r.project)}</div>
        <div class="record-item__details">
          <span>${r.date}</span>
          <span>${fmtHours(r.hours)}</span>
          <span>時給 ${fmtYen(r.rate)}</span>
          ${r.memo ? `<span>${escapeHtml(r.memo)}</span>` : ''}
        </div>
      </div>
      <div class="record-item__actions">
        <span class="record-item__amount">${fmtYen(r.amount)}</span>
        <button class="btn btn--danger" onclick="deleteRecord(${r.id})">削除</button>
      </div>
    </div>
  `).join('');
}

function fmtYen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

function fmtHours(h) {
  const int  = Math.floor(h);
  const min  = Math.round((h - int) * 60);
  return min > 0 ? `${int}時間${min}分` : `${int}時間`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 初期表示
render();
