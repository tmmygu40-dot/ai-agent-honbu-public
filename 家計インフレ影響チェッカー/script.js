'use strict';

// --- データ管理 ---
const STORAGE_KEY = 'inflate_checker_v1';

let state = {
  categories: ['食費', '光熱費', 'ガソリン代'],
  records: []
  // record: { id, category, thisYear, lastYear, month }
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch(e) {}
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- 初期化 ---
function init() {
  loadState();
  populateYearSelects();
  populateMonthSelect();
  renderCategories();
  renderCategoryOptions();
  renderFilterCategories();
  renderTable();
  renderSummary();
  renderGraph();
}

// --- 年セレクト ---
function getYears() {
  const now = new Date().getFullYear();
  const years = [];
  for (let y = now; y >= now - 5; y--) years.push(y);
  return years;
}

function populateYearSelects() {
  const years = getYears();
  const now = new Date().getFullYear();

  ['thisYearSelect', 'lastYearSelect', 'filterYearSelect', 'graphYearSelect'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y + '年';
      sel.appendChild(opt);
    });
  });

  // デフォルト値: 今年 / 去年
  document.getElementById('thisYearSelect').value = now;
  document.getElementById('lastYearSelect').value = now - 1;
  document.getElementById('filterYearSelect').value = now;
  document.getElementById('graphYearSelect').value = now;
}

function populateMonthSelect() {
  const sel = document.getElementById('monthSelect');
  sel.innerHTML = '';
  const now = new Date().getMonth() + 1;
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '月';
    sel.appendChild(opt);
  }
  sel.value = now;
}

// --- 費目管理 ---
function renderCategories() {
  const list = document.getElementById('categoryList');
  list.innerHTML = '';
  state.categories.forEach(cat => {
    const tag = document.createElement('div');
    tag.className = 'category-tag';
    tag.innerHTML = `<span>${escHtml(cat)}</span><button class="del-btn" onclick="deleteCategory('${escHtml(cat)}')">×</button>`;
    list.appendChild(tag);
  });
}

function addCategory() {
  const input = document.getElementById('newCategoryInput');
  const val = input.value.trim();
  if (!val) return;
  if (state.categories.includes(val)) {
    alert('同じ費目がすでにあります。');
    return;
  }
  state.categories.push(val);
  saveState();
  input.value = '';
  renderCategories();
  renderCategoryOptions();
  renderFilterCategories();
}

function deleteCategory(cat) {
  if (!confirm(`「${cat}」を削除しますか？\n（この費目のデータは残ります）`)) return;
  state.categories = state.categories.filter(c => c !== cat);
  saveState();
  renderCategories();
  renderCategoryOptions();
  renderFilterCategories();
}

function renderCategoryOptions() {
  const sel = document.getElementById('categorySelect');
  const cur = sel.value;
  sel.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  if (state.categories.includes(cur)) sel.value = cur;
}

function renderFilterCategories() {
  const sel = document.getElementById('filterCategorySelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">すべて</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  // 存在する値なら復元
  const opts = Array.from(sel.options).map(o => o.value);
  if (opts.includes(cur)) sel.value = cur;
}

// --- レコード追加 ---
function addRecord() {
  const category = document.getElementById('categorySelect').value;
  const thisYear = parseInt(document.getElementById('thisYearSelect').value);
  const lastYear = parseInt(document.getElementById('lastYearSelect').value);
  const month = parseInt(document.getElementById('monthSelect').value);
  const thisAmt = parseFloat(document.getElementById('thisYearAmount').value);
  const lastAmt = parseFloat(document.getElementById('lastYearAmount').value);

  if (!category) { alert('費目を選択してください。'); return; }
  if (isNaN(thisAmt) && isNaN(lastAmt)) {
    alert('今年または去年の金額を入力してください。');
    return;
  }

  // 同一レコードの更新（同費目・同年・同月）
  const existing = state.records.findIndex(
    r => r.category === category && r.thisYear === thisYear && r.month === month
  );
  const record = {
    id: existing >= 0 ? state.records[existing].id : Date.now(),
    category,
    thisYear,
    lastYear,
    month,
    thisAmt: isNaN(thisAmt) ? null : thisAmt,
    lastAmt: isNaN(lastAmt) ? null : lastAmt
  };

  if (existing >= 0) {
    state.records[existing] = record;
  } else {
    state.records.push(record);
  }

  saveState();
  document.getElementById('thisYearAmount').value = '';
  document.getElementById('lastYearAmount').value = '';
  renderTable();
  renderSummary();
  renderGraph();
}

function deleteRecord(id) {
  state.records = state.records.filter(r => r.id !== id);
  saveState();
  renderTable();
  renderSummary();
  renderGraph();
}

// --- テーブル描画 ---
function renderTable() {
  const filterYear = parseInt(document.getElementById('filterYearSelect').value);
  const filterCat = document.getElementById('filterCategorySelect').value;

  let records = state.records.filter(r => r.thisYear === filterYear);
  if (filterCat !== 'all') records = records.filter(r => r.category === filterCat);

  // 月→費目 順にソート
  records = records.sort((a, b) => a.month - b.month || a.category.localeCompare(b.category));

  const tbody = document.getElementById('tableBody');
  const emptyMsg = document.getElementById('emptyMsg');

  if (records.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = records.map(r => {
    const diff = calcDiff(r.thisAmt, r.lastAmt);
    const rateStr = calcRate(r.thisAmt, r.lastAmt);
    const cls = diff === null ? 'neutral' : diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'neutral';
    const sign = diff !== null && diff > 0 ? '+' : '';
    return `<tr>
      <td>${escHtml(r.category)}</td>
      <td>${r.month}月</td>
      <td>${r.thisAmt !== null ? '¥' + fmt(r.thisAmt) : '—'}</td>
      <td>${r.lastAmt !== null ? '¥' + fmt(r.lastAmt) : '—'}</td>
      <td class="${cls}">${diff !== null ? sign + '¥' + fmt(diff) : '—'}</td>
      <td class="${cls}">${rateStr}</td>
      <td><button class="del-record-btn" onclick="deleteRecord(${r.id})">🗑</button></td>
    </tr>`;
  }).join('');
}

// --- サマリー ---
function renderSummary() {
  const filterYear = parseInt(document.getElementById('filterYearSelect').value);
  const area = document.getElementById('summaryArea');

  // 費目ごとの年間増加額合計
  const catMap = {};
  state.records.filter(r => r.thisYear === filterYear).forEach(r => {
    const d = calcDiff(r.thisAmt, r.lastAmt);
    if (d === null) return;
    if (!catMap[r.category]) catMap[r.category] = { diff: 0, thisTotal: 0, lastTotal: 0 };
    catMap[r.category].diff += d;
    if (r.thisAmt !== null) catMap[r.category].thisTotal += r.thisAmt;
    if (r.lastAmt !== null) catMap[r.category].lastTotal += r.lastAmt;
  });

  const cats = Object.keys(catMap);
  if (cats.length === 0) {
    area.innerHTML = '<p class="no-data">データがありません。</p>';
    return;
  }

  const totalDiff = cats.reduce((s, c) => s + catMap[c].diff, 0);
  const totalThis = cats.reduce((s, c) => s + catMap[c].thisTotal, 0);
  const totalLast = cats.reduce((s, c) => s + catMap[c].lastTotal, 0);
  const totalRate = totalLast > 0 ? ((totalThis / totalLast - 1) * 100).toFixed(1) : null;

  const sign = totalDiff > 0 ? '+' : '';
  const cls = totalDiff > 0 ? 'increase' : totalDiff < 0 ? 'decrease' : '';

  let html = `<div class="summary-card">
    <div class="label">年間累計 増加額合計</div>
    <div class="amount ${cls}">${sign}¥${fmt(totalDiff)}</div>
    <div class="rate">${totalRate !== null ? (totalDiff > 0 ? '+' : '') + totalRate + '%' : ''}</div>
  </div>`;

  cats.forEach(cat => {
    const d = catMap[cat].diff;
    const s = d > 0 ? '+' : '';
    const c = d > 0 ? 'increase' : d < 0 ? 'decrease' : '';
    const r = catMap[cat].lastTotal > 0
      ? ((catMap[cat].thisTotal / catMap[cat].lastTotal - 1) * 100).toFixed(1)
      : null;
    html += `<div class="summary-card">
      <div class="label">${escHtml(cat)}</div>
      <div class="amount ${c}">${s}¥${fmt(d)}</div>
      <div class="rate">${r !== null ? (d > 0 ? '+' : '') + r + '%' : ''}</div>
    </div>`;
  });

  area.innerHTML = html;
}

// --- グラフ ---
function renderGraph() {
  const filterYear = parseInt(document.getElementById('graphYearSelect').value);
  const area = document.getElementById('graphArea');

  const catMap = {};
  state.records.filter(r => r.thisYear === filterYear).forEach(r => {
    const d = calcDiff(r.thisAmt, r.lastAmt);
    if (d === null) return;
    if (!catMap[r.category]) catMap[r.category] = 0;
    catMap[r.category] += d;
  });

  const cats = Object.keys(catMap);
  if (cats.length === 0) {
    area.innerHTML = '<p class="graph-empty">データがありません。</p>';
    return;
  }

  const maxAbs = Math.max(...cats.map(c => Math.abs(catMap[c])));

  area.innerHTML = cats.map(cat => {
    const val = catMap[cat];
    const pct = maxAbs > 0 ? Math.abs(val) / maxAbs * 100 : 0;
    const cls = val > 0 ? 'up' : 'down';
    const sign = val > 0 ? '+' : '';
    const label = (val > 0 ? '+¥' : '-¥') + fmt(Math.abs(val));
    return `<div class="graph-row">
      <div class="graph-label">${escHtml(cat)}</div>
      <div class="graph-bar-wrap">
        <div class="graph-bar ${cls}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="graph-value ${cls === 'up' ? 'increase' : 'decrease'}">${label}</div>
    </div>`;
  }).join('');
}

// --- ユーティリティ ---
function calcDiff(thisAmt, lastAmt) {
  if (thisAmt === null || lastAmt === null) return null;
  return thisAmt - lastAmt;
}

function calcRate(thisAmt, lastAmt) {
  if (thisAmt === null || lastAmt === null) return '—';
  if (lastAmt === 0) return '—';
  const r = ((thisAmt / lastAmt - 1) * 100).toFixed(1);
  return (r > 0 ? '+' : '') + r + '%';
}

function fmt(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// --- 起動 ---
init();
