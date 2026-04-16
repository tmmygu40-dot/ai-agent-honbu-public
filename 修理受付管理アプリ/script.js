const STORAGE_KEY = 'repairItems';
let currentFilter = 'all';

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const itemName = document.getElementById('itemName').value.trim();
  const receiveDate = document.getElementById('receiveDate').value;
  const symptom = document.getElementById('symptom').value.trim();
  const status = document.getElementById('status').value;
  const customerName = document.getElementById('customerName').value.trim();

  if (!itemName) {
    alert('品名を入力してください');
    document.getElementById('itemName').focus();
    return;
  }

  const items = loadItems();
  const newItem = {
    id: Date.now(),
    itemName,
    receiveDate: receiveDate || new Date().toISOString().slice(0, 10),
    symptom,
    status,
    customerName,
    createdAt: new Date().toISOString()
  };

  items.unshift(newItem);
  saveItems(items);

  // フォームをリセット
  document.getElementById('itemName').value = '';
  document.getElementById('symptom').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('status').value = '受付中';
  document.getElementById('receiveDate').value = '';

  render();
}

function updateStatus(id, newStatus) {
  const items = loadItems();
  const item = items.find(i => i.id === id);
  if (item) {
    item.status = newStatus;
    saveItems(items);
    render();
  }
}

function deleteItem(id) {
  if (!confirm('この案件を削除しますか？')) return;
  const items = loadItems().filter(i => i.id !== id);
  saveItems(items);
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  document.getElementById('filterAll').classList.toggle('active', filter === 'all');
  document.getElementById('filterActive').classList.toggle('active', filter === 'active');
  render();
}

function formatDate(dateStr) {
  if (!dateStr) return '―';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function render() {
  const items = loadItems();
  const filtered = currentFilter === 'active'
    ? items.filter(i => i.status === '受付中' || i.status === '修理中')
    : items;

  const list = document.getElementById('itemList');
  const badge = document.getElementById('countBadge');
  badge.textContent = `${filtered.length}件`;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">案件はありません</p>';
    return;
  }

  list.innerHTML = filtered.map(item => `
    <div class="item-card">
      <div class="card-top">
        <div>
          <div class="card-title">${escHtml(item.itemName)}</div>
          ${item.customerName ? `<div class="card-customer">お客様：${escHtml(item.customerName)}</div>` : ''}
        </div>
        <div class="card-actions">
          <select class="status-select status-${item.status}"
            onchange="updateStatus(${item.id}, this.value)">
            <option value="受付中" ${item.status === '受付中' ? 'selected' : ''}>受付中</option>
            <option value="修理中" ${item.status === '修理中' ? 'selected' : ''}>修理中</option>
            <option value="完了"   ${item.status === '完了'   ? 'selected' : ''}>完了</option>
            <option value="引渡済" ${item.status === '引渡済' ? 'selected' : ''}>引渡済</option>
          </select>
          <button class="btn-delete" onclick="deleteItem(${item.id})">削除</button>
        </div>
      </div>
      <div class="card-meta">
        <span>受付日：${formatDate(item.receiveDate)}</span>
      </div>
      ${item.symptom ? `<div class="card-symptom">${escHtml(item.symptom)}</div>` : ''}
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 初期表示
document.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をデフォルトでセット
  document.getElementById('receiveDate').value = new Date().toISOString().slice(0, 10);
  render();
});
