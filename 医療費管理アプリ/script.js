const STORAGE_KEY = 'iryohi_records';

let records = [];

// --- データ読み込み ---
function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- 年リスト生成 ---
function getYears() {
  const years = new Set(records.map(r => r.date.slice(0, 4)));
  const currentYear = String(new Date().getFullYear());
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}

function updateYearSelect() {
  const sel = document.getElementById('yearSelect');
  const current = sel.value;
  const years = getYears();
  sel.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('');
  if (current && years.includes(current)) sel.value = current;
}

function selectedYear() {
  return document.getElementById('yearSelect').value;
}

// --- フィルタ用メンバーリスト更新 ---
function updateMemberFilter() {
  const sel = document.getElementById('filterMember');
  const current = sel.value;
  const members = Array.from(new Set(records.map(r => r.member))).sort();
  sel.innerHTML = '<option value="">全員</option>' +
    members.map(m => `<option value="${m}">${m}</option>`).join('');
  if (current && members.includes(current)) sel.value = current;
}

// --- 集計サマリー ---
function updateSummary() {
  const year = selectedYear();
  const yearRecords = records.filter(r => r.date.startsWith(year));
  const total = yearRecords.reduce((s, r) => s + r.amount, 0);
  const deduction = Math.max(0, total - 100000);

  document.getElementById('totalAmount').textContent = '¥' + total.toLocaleString();
  document.getElementById('deductionAmount').textContent = '¥' + deduction.toLocaleString();
}

// --- 月別集計テーブル ---
function updateMonthlyTable() {
  const year = selectedYear();
  const yearRecords = records.filter(r => r.date.startsWith(year));

  // メンバー一覧
  const members = Array.from(new Set(yearRecords.map(r => r.member))).sort();

  // 月別・メンバー別集計
  const monthlyData = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    monthlyData[key] = {};
    members.forEach(mem => { monthlyData[key][mem] = 0; });
  }
  yearRecords.forEach(r => {
    const month = r.date.slice(5, 7);
    if (!monthlyData[month][r.member]) monthlyData[month][r.member] = 0;
    monthlyData[month][r.member] += r.amount;
  });

  const container = document.getElementById('monthlyTable');
  if (yearRecords.length === 0) {
    container.innerHTML = '<p class="empty-msg">データがありません</p>';
    return;
  }

  // ヘッダー
  let html = '<table><thead><tr><th>月</th>';
  members.forEach(m => { html += `<th>${m}</th>`; });
  html += '<th>合計</th></tr></thead><tbody>';

  let grandTotal = 0;
  const memberTotals = {};
  members.forEach(m => { memberTotals[m] = 0; });

  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    const rowData = monthlyData[key];
    const rowTotal = members.reduce((s, mem) => s + (rowData[mem] || 0), 0);
    if (rowTotal === 0) continue;

    html += `<tr><td>${m}月</td>`;
    members.forEach(mem => {
      const val = rowData[mem] || 0;
      memberTotals[mem] += val;
      html += `<td>${val > 0 ? '¥' + val.toLocaleString() : '-'}</td>`;
    });
    grandTotal += rowTotal;
    html += `<td>¥${rowTotal.toLocaleString()}</td></tr>`;
  }

  // 合計行
  html += '<tr><td>合計</td>';
  members.forEach(mem => {
    html += `<td>¥${(memberTotals[mem] || 0).toLocaleString()}</td>`;
  });
  html += `<td>¥${grandTotal.toLocaleString()}</td></tr>`;

  html += '</tbody></table>';
  container.innerHTML = html;
}

// --- 記録一覧 ---
function updateRecordList() {
  const year = selectedYear();
  const filterMember = document.getElementById('filterMember').value;

  let filtered = records.filter(r => r.date.startsWith(year));
  if (filterMember) filtered = filtered.filter(r => r.member === filterMember);
  filtered = filtered.slice().sort((a, b) => b.date.localeCompare(a.date));

  const container = document.getElementById('recordList');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-top">
          <span class="record-member">${escHtml(r.member)}</span>
          <span class="record-date">${r.date}</span>
        </div>
        <div class="record-hospital">${escHtml(r.hospital)}</div>
        ${r.memo ? `<div class="record-memo">${escHtml(r.memo)}</div>` : ''}
      </div>
      <div class="record-right">
        <span class="record-amount">¥${r.amount.toLocaleString()}</span>
        <button class="btn-delete" data-id="${r.id}">削除</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 全画面更新 ---
function renderAll() {
  updateYearSelect();
  updateMemberFilter();
  updateSummary();
  updateMonthlyTable();
  updateRecordList();
}

// --- 追加 ---
document.getElementById('addBtn').addEventListener('click', () => {
  const member = document.getElementById('member').value.trim();
  const date = document.getElementById('date').value;
  const hospital = document.getElementById('hospital').value.trim();
  const amount = parseInt(document.getElementById('amount').value, 10);
  const memo = document.getElementById('memo').value.trim();

  if (!member) { alert('家族名を入力してください'); return; }
  if (!date) { alert('日付を入力してください'); return; }
  if (!hospital) { alert('医療機関名を入力してください'); return; }
  if (isNaN(amount) || amount < 0) { alert('金額を正しく入力してください'); return; }

  records.push({
    id: Date.now().toString(),
    member,
    date,
    hospital,
    amount,
    memo
  });

  saveRecords();
  renderAll();

  // 金額・メモをリセット（家族名・医療機関は維持）
  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('date').value = '';
});

// --- 削除 ---
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderAll();
}

// --- 年・フィルタ変更 ---
document.getElementById('yearSelect').addEventListener('change', () => {
  updateSummary();
  updateMonthlyTable();
  updateRecordList();
});

document.getElementById('filterMember').addEventListener('change', updateRecordList);

// --- 初期化 ---
// デフォルト日付を今日に設定
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

loadRecords();
renderAll();
