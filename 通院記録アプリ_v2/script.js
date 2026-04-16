const STORAGE_KEY = 'visit_records_v2';

let records = [];
let searchQuery = '';

function loadRecords() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function renderRecords() {
  const list = document.getElementById('recordList');
  const countText = document.getElementById('countText');

  const q = searchQuery.toLowerCase();
  const filtered = records.filter(r => {
    if (!q) return true;
    return (
      r.department.toLowerCase().includes(q) ||
      r.medicine.toLowerCase().includes(q) ||
      r.memo.toLowerCase().includes(q)
    );
  });

  // 新しい順にソート
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  countText.textContent = `${filtered.length}件の記録`;

  if (sorted.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  list.innerHTML = sorted.map(r => `
    <div class="record-card">
      <div class="card-header">
        <div>
          <div class="card-date">${formatDate(r.date)}</div>
          <div class="card-dept">${escapeHtml(r.department)}</div>
        </div>
        <button class="btn-delete" onclick="deleteRecord('${r.id}')" title="削除">✕</button>
      </div>
      <div class="card-medicine">
        <span class="label">💊 処方薬：</span>
        ${r.medicine
          ? `<span class="value">${escapeHtml(r.medicine)}</span>`
          : `<span class="no-medicine">なし</span>`}
      </div>
      ${r.memo ? `<div class="card-memo">📝 ${escapeHtml(r.memo)}</div>` : ''}
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addRecord() {
  const date = document.getElementById('visitDate').value;
  const dept = document.getElementById('department').value.trim();
  const medicine = document.getElementById('medicine').value.trim();
  const memo = document.getElementById('memo').value.trim();

  if (!date) {
    alert('通院日を入力してください。');
    document.getElementById('visitDate').focus();
    return;
  }
  if (!dept) {
    alert('診察科を入力してください。');
    document.getElementById('department').focus();
    return;
  }

  const record = {
    id: Date.now().toString(),
    date,
    department: dept,
    medicine,
    memo
  };

  records.push(record);
  saveRecords();

  // フォームリセット
  document.getElementById('visitDate').value = '';
  document.getElementById('department').value = '';
  document.getElementById('medicine').value = '';
  document.getElementById('memo').value = '';

  renderRecords();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderRecords();
}

// 初期化
loadRecords();

// 今日の日付をデフォルトに
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
document.getElementById('visitDate').value = `${yyyy}-${mm}-${dd}`;

renderRecords();

// イベント
document.getElementById('addBtn').addEventListener('click', addRecord);

document.getElementById('searchInput').addEventListener('input', function () {
  searchQuery = this.value;
  renderRecords();
});
