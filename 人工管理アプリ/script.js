const STORAGE_KEY = 'ninkouKanriData';

let records = [];

// 初期化
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { records = JSON.parse(saved); } catch (e) { records = []; }
  }
  // デフォルト日付を今日に
  document.getElementById('workDate').value = getTodayStr();
  render();
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 登録
document.getElementById('addBtn').addEventListener('click', () => {
  const kojiName  = document.getElementById('kojiName').value.trim();
  const workerName = document.getElementById('workerName').value.trim();
  const workDate  = document.getElementById('workDate').value;
  const unitPrice = parseFloat(document.getElementById('unitPrice').value);
  const manCount  = parseFloat(document.getElementById('manCount').value);

  if (!kojiName || !workerName || !workDate || isNaN(unitPrice) || isNaN(manCount)) {
    alert('すべての項目を入力してください');
    return;
  }
  if (unitPrice < 0 || manCount <= 0) {
    alert('単価・人数は正の数で入力してください');
    return;
  }

  const cost = Math.round(unitPrice * manCount);
  const record = {
    id: Date.now(),
    kojiName,
    workerName,
    workDate,
    unitPrice,
    manCount,
    cost
  };

  records.push(record);
  save();
  render();

  // フォームリセット（工事名・単価は残す）
  document.getElementById('workerName').value = '';
  document.getElementById('workDate').value = getTodayStr();
  document.getElementById('manCount').value = '';
});

// 削除
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  render();
}

// 表示更新
function render() {
  renderSummary();
  renderFilter();
  renderList();
}

// 工事別合計
function renderSummary() {
  const el = document.getElementById('summaryList');
  if (records.length === 0) {
    el.innerHTML = '<p class="empty-msg">登録データがありません</p>';
    return;
  }

  // 工事名でグループ集計
  const map = {};
  records.forEach(r => {
    if (!map[r.kojiName]) map[r.kojiName] = { total: 0, count: 0, days: 0 };
    map[r.kojiName].total += r.cost;
    map[r.kojiName].count += 1;
    map[r.kojiName].days += r.manCount;
  });

  const html = Object.entries(map)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([koji, data]) => `
      <div class="summary-item">
        <div>
          <div class="summary-koji">${escHtml(koji)}</div>
          <div class="summary-detail">${data.count}件 / ${data.days}人日</div>
        </div>
        <div class="summary-total">${fmt(data.total)}円</div>
      </div>
    `).join('');

  el.innerHTML = html;
}

// 絞り込みフィルター更新
function renderFilter() {
  const sel = document.getElementById('filterKoji');
  const current = sel.value;
  const kojiList = [...new Set(records.map(r => r.kojiName))].sort();

  sel.innerHTML = '<option value="">すべて</option>' +
    kojiList.map(k => `<option value="${escHtml(k)}" ${current === k ? 'selected' : ''}>${escHtml(k)}</option>`).join('');
}

// 一覧表示
function renderList() {
  const el = document.getElementById('recordList');
  const filterVal = document.getElementById('filterKoji').value;

  let filtered = records;
  if (filterVal) filtered = records.filter(r => r.kojiName === filterVal);

  // 新しい順
  filtered = [...filtered].sort((a, b) => {
    if (b.workDate !== a.workDate) return b.workDate.localeCompare(a.workDate);
    return b.id - a.id;
  });

  if (filtered.length === 0) {
    el.innerHTML = '<p class="empty-msg">登録データがありません</p>';
    return;
  }

  el.innerHTML = filtered.map(r => `
    <div class="record-item">
      <div class="record-info">
        <span class="record-koji">${escHtml(r.kojiName)}</span>
        <div class="record-main">${escHtml(r.workerName)}</div>
        <div class="record-sub">${r.workDate}｜単価 ${fmt(r.unitPrice)}円 × ${r.manCount}人日</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div class="record-cost">${fmt(r.cost)}円</div>
        <button class="btn-delete" onclick="deleteRecord(${r.id})">削除</button>
      </div>
    </div>
  `).join('');
}

// フィルター変更
document.getElementById('filterKoji').addEventListener('change', renderList);

function fmt(n) {
  return Number(n).toLocaleString('ja-JP');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
