'use strict';

const STORAGE_KEY = 'stockout_items';
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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const location = document.getElementById('itemLocation').value.trim();
  const memo = document.getElementById('itemMemo').value.trim();

  if (!name) {
    document.getElementById('itemName').focus();
    document.getElementById('itemName').style.borderColor = '#e74c3c';
    setTimeout(() => {
      document.getElementById('itemName').style.borderColor = '';
    }, 1000);
    return;
  }

  const items = loadItems();
  const newItem = {
    id: Date.now().toString(),
    name,
    location,
    memo,
    done: false,
    createdAt: new Date().toISOString()
  };
  items.unshift(newItem);
  saveItems(items);

  document.getElementById('itemName').value = '';
  document.getElementById('itemLocation').value = '';
  document.getElementById('itemMemo').value = '';
  document.getElementById('itemName').focus();

  render();
}

function toggleDone(id) {
  const items = loadItems();
  const item = items.find(i => i.id === id);
  if (item) {
    item.done = !item.done;
    saveItems(items);
    render();
  }
}

function deleteItem(id) {
  let items = loadItems();
  items = items.filter(i => i.id !== id);
  saveItems(items);
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

function render() {
  const items = loadItems();
  const pendingCount = items.filter(i => !i.done).length;

  // バッジ更新
  const badge = document.getElementById('badge');
  if (pendingCount > 0) {
    badge.textContent = pendingCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  // フィルター適用
  let filtered;
  if (currentFilter === 'pending') {
    filtered = items.filter(i => !i.done);
  } else if (currentFilter === 'done') {
    filtered = items.filter(i => i.done);
  } else {
    filtered = items;
  }

  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.classList.add('show');
    return;
  }

  emptyMsg.classList.remove('show');
  list.innerHTML = filtered.map(item => {
    const metaParts = [];
    if (item.location) metaParts.push('📍 ' + escapeHtml(item.location));
    if (item.memo) metaParts.push('📝 ' + escapeHtml(item.memo));

    return `
      <li class="item-card${item.done ? ' done' : ''}">
        <input type="checkbox" ${item.done ? 'checked' : ''}
               onchange="toggleDone('${item.id}')"
               title="${item.done ? '未補充に戻す' : '補充完了にする'}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${metaParts.length > 0 ? `<div class="item-meta">${metaParts.join(' &nbsp;')}</div>` : ''}
          <div class="item-time">${formatDate(item.createdAt)}</div>
        </div>
        <button class="delete-btn" onclick="deleteItem('${item.id}')" title="削除">✕</button>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Enterキーで登録
document.addEventListener('DOMContentLoaded', () => {
  ['itemName', 'itemLocation', 'itemMemo'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });
  });
  render();
});
