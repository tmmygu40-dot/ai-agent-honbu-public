const STORAGE_KEY = 'wardrobe_items';
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

function getDaysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDaysLabel(item) {
  if (!item.lastWorn) {
    return { text: '未着用', cls: 'days-never' };
  }
  const days = getDaysAgo(item.lastWorn);
  if (days === 0) return { text: '今日着た', cls: 'days-ok' };
  if (days < 30) return { text: `${days}日前`, cls: 'days-ok' };
  if (days < 60) return { text: `${days}日前`, cls: 'days-warn' };
  return { text: `${days}日前`, cls: 'days-alert' };
}

function filterItems(items) {
  if (currentFilter === 'all') return items;
  if (currentFilter === 'never') return items.filter(i => !i.lastWorn);
  const threshold = parseInt(currentFilter);
  return items.filter(i => {
    if (!i.lastWorn) return true;
    return getDaysAgo(i.lastWorn) >= threshold;
  });
}

function renderItems() {
  const items = loadItems();
  const filtered = filterItems(items);
  const list = document.getElementById('items-list');
  const emptyMsg = document.getElementById('empty-msg');

  list.innerHTML = '';

  if (items.length === 0) {
    emptyMsg.textContent = '服が登録されていません';
    emptyMsg.style.display = 'block';
    return;
  }

  if (filtered.length === 0) {
    emptyMsg.textContent = '該当するアイテムがありません';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const label = getDaysLabel(item);
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.category)}${item.color ? ' / ' + escapeHtml(item.color) : ''}</div>
        <span class="item-days ${label.cls}">${label.text}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-worn" onclick="markWorn('${item.id}')">今日着た</button>
        <button class="btn btn-delete" onclick="deleteItem('${item.id}')">削除</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addItem() {
  const name = document.getElementById('item-name').value.trim();
  const category = document.getElementById('item-category').value;
  const color = document.getElementById('item-color').value.trim();

  if (!name) {
    alert('名前を入力してください');
    return;
  }

  const items = loadItems();
  items.push({
    id: Date.now().toString(),
    name,
    category,
    color,
    lastWorn: null,
    addedAt: new Date().toISOString().split('T')[0]
  });
  saveItems(items);

  document.getElementById('item-name').value = '';
  document.getElementById('item-color').value = '';
  renderItems();
}

function markWorn(id) {
  const items = loadItems();
  const item = items.find(i => i.id === id);
  if (item) {
    item.lastWorn = new Date().toISOString().split('T')[0];
    saveItems(items);
    renderItems();
  }
}

function deleteItem(id) {
  if (!confirm('削除しますか？')) return;
  const items = loadItems().filter(i => i.id !== id);
  saveItems(items);
  renderItems();
}

// フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderItems();
  });
});

document.getElementById('add-btn').addEventListener('click', addItem);

document.getElementById('item-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

renderItems();
