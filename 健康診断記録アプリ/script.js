'use strict';

const STORAGE_KEY = 'kenkou_shindan_records';

// --- データ管理 ---
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- 前回比計算 ---
function calcDiff(records, item, year, currentVal) {
  // 同じ項目で年度が一つ前のレコードを探す
  const prevRecords = records
    .filter(r => r.item === item && r.year < year)
    .sort((a, b) => b.year - a.year);

  if (prevRecords.length === 0) return null;

  const prev = prevRecords[0];
  const diff = currentVal - prev.value;
  return { diff: diff, prevYear: prev.year, prevVal: prev.value };
}

// --- フィルター更新 ---
function updateFilter(records) {
  const select = document.getElementById('filterItem');
  const current = select.value;
  const items = [...new Set(records.map(r => r.item))].sort();

  select.innerHTML = '<option value="">すべての項目</option>';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    if (item === current) opt.selected = true;
    select.appendChild(opt);
  });
}

// --- 描画 ---
function renderTable() {
  const records = loadRecords();
  const filterVal = document.getElementById('filterItem').value;
  const wrapper = document.getElementById('tableWrapper');

  // フィルター適用
  const filtered = filterVal ? records.filter(r => r.item === filterVal) : records;

  if (filtered.length === 0) {
    wrapper.innerHTML = '<p class="empty-msg">記録がありません。上のフォームから追加してください。</p>';
    return;
  }

  // 項目ごとにグループ化
  const groups = {};
  filtered.forEach(r => {
    if (!groups[r.item]) groups[r.item] = [];
    groups[r.item].push(r);
  });

  // 項目名でソート
  const sortedItems = Object.keys(groups).sort();

  let html = '';
  sortedItems.forEach(item => {
    const rows = groups[item].sort((a, b) => b.year - a.year);

    html += `<div class="item-group">`;
    html += `<div class="item-group-title">${escHtml(item)}</div>`;
    html += `<table class="record-table">`;
    html += `<thead><tr>
      <th>年度</th>
      <th>数値</th>
      <th>単位</th>
      <th>前回比</th>
      <th>削除</th>
    </tr></thead><tbody>`;

    rows.forEach(r => {
      const diffInfo = calcDiff(records, r.item, r.year, r.value);
      let diffHtml;
      if (diffInfo === null) {
        diffHtml = '<span class="diff-na">-</span>';
      } else {
        const d = diffInfo.diff;
        const sign = d > 0 ? '+' : '';
        const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→';
        const cls = d > 0 ? 'diff-up' : d < 0 ? 'diff-down' : 'diff-none';
        const rounded = Math.round(d * 100) / 100;
        diffHtml = `<span class="${cls}">${arrow} ${sign}${rounded}<br><small>(${diffInfo.prevYear}年度比)</small></span>`;
      }

      html += `<tr>
        <td>${escHtml(String(r.year))}</td>
        <td><strong>${escHtml(String(r.value))}</strong></td>
        <td>${escHtml(r.unit || '')}</td>
        <td>${diffHtml}</td>
        <td><button class="btn-delete" data-id="${escHtml(r.id)}">削除</button></td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  });

  wrapper.innerHTML = html;

  // 削除ボタン
  wrapper.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteRecord(id);
    });
  });
}

// --- 削除 ---
function deleteRecord(id) {
  let records = loadRecords();
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  updateFilter(loadRecords());
  renderTable();
}

// --- 追加 ---
function addRecord() {
  const yearEl = document.getElementById('year');
  const itemEl = document.getElementById('item');
  const valueEl = document.getElementById('value');
  const unitEl = document.getElementById('unit');

  const year = parseInt(yearEl.value, 10);
  const item = itemEl.value.trim();
  const value = parseFloat(valueEl.value);
  const unit = unitEl.value.trim();

  if (!year || year < 2000 || year > 2099) {
    alert('年度を正しく入力してください（2000〜2099）');
    yearEl.focus();
    return;
  }
  if (!item) {
    alert('検査項目を入力してください');
    itemEl.focus();
    return;
  }
  if (isNaN(value)) {
    alert('数値を入力してください');
    valueEl.focus();
    return;
  }

  const records = loadRecords();

  // 同じ年度・同じ項目がすでにある場合は上書き確認
  const existIdx = records.findIndex(r => r.year === year && r.item === item);
  if (existIdx !== -1) {
    const ok = confirm(`${year}年度の「${item}」は既に記録があります。上書きしますか？`);
    if (!ok) return;
    records[existIdx].value = value;
    records[existIdx].unit = unit;
  } else {
    records.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      year,
      item,
      value,
      unit
    });
  }

  saveRecords(records);
  updateFilter(loadRecords());
  renderTable();

  // フォームリセット（年度と単位は保持）
  itemEl.value = '';
  valueEl.value = '';
  itemEl.focus();
}

// --- XSS対策 ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
  // 年度のデフォルト = 今年
  document.getElementById('year').value = new Date().getFullYear();

  updateFilter(loadRecords());
  renderTable();

  document.getElementById('addBtn').addEventListener('click', addRecord);

  document.getElementById('filterItem').addEventListener('change', renderTable);

  // Enterキーで追加
  ['year', 'item', 'value', 'unit'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addRecord();
    });
  });
});
