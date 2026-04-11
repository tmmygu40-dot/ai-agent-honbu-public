const STORAGE_KEY = 'shokuhin_items';
let currentFilter = 'all';

// データ読み込み
function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// データ保存
function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ステータス判定
function getStatus(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'danger';
  if (diffDays <= 3) return 'warning';
  return 'safe';
}

// ステータスのラベル
function getStatusLabel(status, expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (status === 'danger') {
    const days = Math.abs(diffDays);
    return days === 0 ? '今日期限切れ' : `${days}日超過`;
  }
  if (status === 'warning') {
    return diffDays === 0 ? '今日まで' : `あと${diffDays}日`;
  }
  return `あと${diffDays}日`;
}

// 日付フォーマット
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 一覧描画
function renderList() {
  const items = loadItems();
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');

  // 期限順にソート（近い順）
  items.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

  // フィルタリング
  const filtered = currentFilter === 'all'
    ? items
    : items.filter(item => getStatus(item.expiry) === currentFilter);

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const status = getStatus(item.expiry);
    const label = getStatusLabel(status, item.expiry);
    const badgeClass = `badge-${status}`;

    const card = document.createElement('div');
    card.className = `item-card ${status}`;
    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-expiry">消費期限：${formatDate(item.expiry)}</div>
      </div>
      <span class="item-badge ${badgeClass}">${label}</span>
      <button class="delete-btn" onclick="deleteItem('${item.id}')" title="削除">✕</button>
    `;
    list.appendChild(card);
  });
}

// 食材追加
function addItem() {
  const nameInput = document.getElementById('itemName');
  const dateInput = document.getElementById('expiryDate');

  const name = nameInput.value.trim();
  const expiry = dateInput.value;

  if (!name) {
    nameInput.focus();
    return;
  }
  if (!expiry) {
    dateInput.focus();
    return;
  }

  const items = loadItems();
  items.push({
    id: Date.now().toString(),
    name,
    expiry,
  });
  saveItems(items);

  nameInput.value = '';
  dateInput.value = '';
  nameInput.focus();

  renderList();
}

// 食材削除
function deleteItem(id) {
  const items = loadItems().filter(item => item.id !== id);
  saveItems(items);
  renderList();
}

// フィルター切り替え
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

// XSS対策
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enterキー対応
document.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をデフォルトに（明日）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('expiryDate').value = tomorrow.toISOString().split('T')[0];

  document.getElementById('itemName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
  document.getElementById('expiryDate').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });

  renderList();
});
