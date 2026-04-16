'use strict';

const STORAGE_KEY = 'kids_items_v1';
let items = [];
let currentFilter = 'all';

function loadItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    items = data ? JSON.parse(data) : [];
  } catch (e) {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const type = document.getElementById('type-select').value;
  const name = document.getElementById('name-input').value.trim();
  const date = document.getElementById('date-input').value;

  if (!name) {
    alert('内容を入力してください');
    document.getElementById('name-input').focus();
    return;
  }

  const item = {
    id: Date.now(),
    type,
    name,
    date,
    done: false,
  };

  items.push(item);
  saveItems();
  renderList();

  document.getElementById('name-input').value = '';
  document.getElementById('date-input').value = '';
  document.getElementById('name-input').focus();
}

function toggleDone(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.done = !item.done;
    saveItems();
    renderList();
  }
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderList();
}

function getDateLabel(dateStr) {
  if (!dateStr) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);

  let label = `期限：${dateStr.replace(/-/g, '/')}`;
  if (diff < 0) {
    label += `（${Math.abs(diff)}日超過）`;
    return { text: label, cls: 'overdue' };
  } else if (diff === 0) {
    label += '（今日！）';
    return { text: label, cls: 'today' };
  } else if (diff === 1) {
    label += '（明日）';
    return { text: label, cls: '' };
  }
  return { text: label, cls: '' };
}

function sortedItems(list) {
  return [...list].sort((a, b) => {
    // 完了済みは後ろ
    if (a.done !== b.done) return a.done ? 1 : -1;
    // 期限なしは後ろ
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

function renderList() {
  const list = document.getElementById('item-list');
  const emptyMsg = document.getElementById('empty-msg');

  let filtered = items;
  if (currentFilter === '未完了') {
    filtered = items.filter(i => !i.done);
  } else if (currentFilter !== 'all') {
    filtered = items.filter(i => i.type === currentFilter);
  }

  const sorted = sortedItems(filtered);

  if (sorted.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  list.innerHTML = sorted.map(item => {
    const dateInfo = getDateLabel(item.date);
    const dateHtml = dateInfo
      ? `<div class="item-date ${dateInfo.cls}">${escHtml(dateInfo.text)}</div>`
      : '';
    const typeIcon = item.type === '提出物' ? '📄' : item.type === '宿題' ? '✏️' : '🎒';

    return `<li class="item ${item.done ? 'done' : ''}" data-id="${item.id}">
      <button class="check-btn" onclick="toggleDone(${item.id})" title="完了にする">✓</button>
      <div class="item-body">
        <div class="item-header">
          <span class="type-badge badge-${item.type}">${typeIcon} ${escHtml(item.type)}</span>
          <span class="item-name">${escHtml(item.name)}</span>
        </div>
        ${dateHtml}
      </div>
      <button class="delete-btn" onclick="deleteItem(${item.id})" title="削除">✕</button>
    </li>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
loadItems();
renderList();

// Enter キーで追加
document.getElementById('name-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItem();
});
