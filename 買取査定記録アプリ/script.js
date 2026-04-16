const STORAGE_KEY = 'kaitori_records';

let records = [];

function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${mi}`;
}

function formatPrice(n) {
  return Number(n).toLocaleString();
}

function addRecord() {
  const name = document.getElementById('itemName').value.trim();
  const condition = document.getElementById('itemCondition').value;
  const priceStr = document.getElementById('itemPrice').value;
  const memo = document.getElementById('itemMemo').value.trim();

  if (!name) {
    alert('品名を入力してください');
    return;
  }
  if (priceStr === '' || isNaN(priceStr) || Number(priceStr) < 0) {
    alert('査定額を正しく入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    name,
    condition,
    price: Number(priceStr),
    memo,
    createdAt: new Date().toISOString()
  };

  records.unshift(record);
  saveRecords();

  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemMemo').value = '';
  document.getElementById('itemCondition').value = '良品';

  renderList();
  renderSummary();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
  renderSummary();
}

function getFiltered() {
  const searchVal = document.getElementById('searchInput').value.trim().toLowerCase();
  const condFilter = document.getElementById('filterCondition').value;

  return records.filter(r => {
    const matchName = !searchVal || r.name.toLowerCase().includes(searchVal);
    const matchCond = !condFilter || r.condition === condFilter;
    return matchName && matchCond;
  });
}

function renderSummary() {
  const total = records.length;
  const sum = records.reduce((acc, r) => acc + r.price, 0);
  const avg = total > 0 ? Math.round(sum / total) : 0;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('totalAmount').textContent = formatPrice(sum);
  document.getElementById('avgAmount').textContent = formatPrice(avg);
}

function renderList() {
  const filtered = getFiltered();
  const container = document.getElementById('recordList');

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">該当する記録がありません</p>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="record-card">
      <button class="delete-btn" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      <div class="record-header">
        <span class="record-name">${escHtml(r.name)}</span>
        <span class="record-price">¥${formatPrice(r.price)}</span>
      </div>
      <div class="record-meta">
        <span class="condition-badge condition-${r.condition}">${r.condition}</span>
        <span class="record-date">${formatDate(r.createdAt)}</span>
      </div>
      ${r.memo ? `<div class="record-memo">${escHtml(r.memo)}</div>` : ''}
    </div>
  `).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
loadRecords();
renderList();
renderSummary();
