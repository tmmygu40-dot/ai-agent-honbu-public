const STORAGE_KEY = 'danshari_items';

let items = [];

function load() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function calcDays(lastUsedDate) {
  const last = new Date(lastUsedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today - last;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDangerClass(days) {
  if (days >= 180) return 'danger';
  if (days >= 90) return 'warn';
  return '';
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value;
  const lastUsed = document.getElementById('lastUsed').value;

  if (!name) {
    alert('持ち物の名前を入力してください');
    return;
  }
  if (!lastUsed) {
    alert('最終使用日を入力してください');
    return;
  }

  const days = calcDays(lastUsed);
  if (days < 0) {
    alert('最終使用日は今日以前の日付を入力してください');
    return;
  }

  const item = {
    id: Date.now(),
    name,
    category,
    lastUsed,
  };

  items.push(item);
  save();
  renderList();

  document.getElementById('itemName').value = '';
  document.getElementById('lastUsed').value = '';
  document.getElementById('itemName').focus();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  renderList();
}

function renderList() {
  const sortOrder = document.getElementById('sortOrder').value;
  const filterCategory = document.getElementById('filterCategory').value;

  let filtered = filterCategory === 'all'
    ? [...items]
    : items.filter(i => i.category === filterCategory);

  filtered.forEach(i => { i._days = calcDays(i.lastUsed); });

  if (sortOrder === 'days_desc') {
    filtered.sort((a, b) => b._days - a._days);
  } else if (sortOrder === 'days_asc') {
    filtered.sort((a, b) => a._days - b._days);
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }

  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const days = item._days;
    const cls = getDangerClass(days);
    const li = document.createElement('li');
    li.className = 'item-card ' + cls;

    const daysText = days === 0
      ? '今日使用'
      : `${days}日未使用`;

    li.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.category)} ／ 最終使用：${item.lastUsed}</div>
      </div>
      <div class="item-days">${daysText}</div>
      <button class="delete-btn" onclick="deleteItem(${item.id})">削除</button>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 今日の日付をデフォルトにセット
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('lastUsed').value = today;
  load();
  renderList();

  document.getElementById('itemName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });
});
