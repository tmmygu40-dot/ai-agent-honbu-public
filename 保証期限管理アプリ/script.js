const STORAGE_KEY = 'warranty_items';

let items = [];

function loadItems() {
  const stored = localStorage.getItem(STORAGE_KEY);
  items = stored ? JSON.parse(stored) : [];
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDaysRemaining(expiryDate) {
  const today = new Date(getToday());
  const expiry = new Date(expiryDate);
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatus(days) {
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring-soon';
  return 'safe';
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function getRemainingText(days) {
  if (days < 0) return `期限切れ（${Math.abs(days)}日経過）`;
  if (days === 0) return '今日が期限です';
  return `残り ${days} 日`;
}

function renderItems() {
  const list = document.getElementById('itemList');
  const count = document.getElementById('itemCount');
  const banner = document.getElementById('alertBanner');

  // 期限が近い順にソート（切れているものを先頭に）
  const sorted = [...items].sort((a, b) => {
    const da = getDaysRemaining(a.expiryDate);
    const db = getDaysRemaining(b.expiryDate);
    return da - db;
  });

  count.textContent = `${items.length}件`;

  // アラートバナー
  const expiredCount = items.filter(i => getDaysRemaining(i.expiryDate) < 0).length;
  const soonCount = items.filter(i => {
    const d = getDaysRemaining(i.expiryDate);
    return d >= 0 && d <= 30;
  }).length;

  if (expiredCount > 0 || soonCount > 0) {
    let msgs = [];
    if (expiredCount > 0) msgs.push(`期限切れ ${expiredCount}件`);
    if (soonCount > 0) msgs.push(`30日以内に期限切れ ${soonCount}件`);
    banner.textContent = '⚠ ' + msgs.join(' / ');
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }

  if (sorted.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ登録されていません</p>';
    return;
  }

  list.innerHTML = sorted.map(item => {
    const days = getDaysRemaining(item.expiryDate);
    const status = getStatus(days);
    const remainingText = getRemainingText(days);
    return `
      <div class="item-card ${status}" data-id="${item.id}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">カテゴリ：${escapeHtml(item.category)}${item.memo ? '　' + escapeHtml(item.memo) : ''}</div>
          <div class="item-expiry">保証期限：${formatDate(item.expiryDate)}</div>
          <div class="item-remaining">${remainingText}</div>
        </div>
        <button class="delete-btn" onclick="deleteItem('${item.id}')">削除</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('category').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('品目名を入力してください');
    document.getElementById('itemName').focus();
    return;
  }
  if (!expiryDate) {
    alert('保証期限を入力してください');
    document.getElementById('expiryDate').focus();
    return;
  }

  const item = {
    id: Date.now().toString(),
    name,
    category,
    expiryDate,
    memo,
    createdAt: getToday()
  };

  items.push(item);
  saveItems();
  renderItems();

  // フォームリセット
  document.getElementById('itemName').value = '';
  document.getElementById('category').value = '家電';
  document.getElementById('expiryDate').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('itemName').focus();
}

function deleteItem(id) {
  if (!confirm('削除しますか？')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderItems();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('itemName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

loadItems();
renderItems();
