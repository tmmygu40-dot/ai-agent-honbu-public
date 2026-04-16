'use strict';

const STORAGE_KEY = 'submission_items';

let items = [];
let currentFilter = 'pending';

function loadItems() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function deadlineStatus(dateStr) {
  if (!dateStr) return 'normal';
  const today = todayStr();
  if (dateStr < today) return 'overdue';
  if (dateStr === today) return 'today';
  return 'normal';
}

function deadlineLabel(dateStr, done) {
  if (!dateStr) return '';
  const status = deadlineStatus(dateStr);
  if (done) return `締め切り：${formatDate(dateStr)}`;
  if (status === 'overdue') return `⚠ 期限切れ (${formatDate(dateStr)})`;
  if (status === 'today') return `⏰ 今日が締め切り (${formatDate(dateStr)})`;
  return `締め切り：${formatDate(dateStr)}`;
}

function filteredItems() {
  switch (currentFilter) {
    case 'pending': return items.filter(i => !i.done);
    case 'done':    return items.filter(i => i.done);
    default:        return [...items];
  }
}

function sortItems(arr) {
  return arr.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

function renderList() {
  const listEl = document.getElementById('itemList');
  const emptyEl = document.getElementById('emptyMsg');
  const toShow = sortItems(filteredItems());

  listEl.innerHTML = '';

  if (toShow.length === 0) {
    emptyEl.classList.add('visible');
    return;
  }
  emptyEl.classList.remove('visible');

  toShow.forEach(item => {
    const status = item.done ? '' : deadlineStatus(item.deadline);
    const card = document.createElement('div');
    card.className = `item-card${item.done ? ' done' : ''}${status ? ' ' + status : ''}`;
    card.dataset.id = item.id;

    card.innerHTML = `
      <input type="checkbox" class="item-checkbox" ${item.done ? 'checked' : ''} aria-label="提出済みにする">
      <div class="item-body">
        <span class="item-subject">${escHtml(item.subject)}</span>
        <div class="item-title">${escHtml(item.title)}</div>
        <div class="deadline-text">${deadlineLabel(item.deadline, item.done)}</div>
      </div>
      <button class="delete-btn" aria-label="削除">✕</button>
    `;

    card.querySelector('.item-checkbox').addEventListener('change', () => toggleDone(item.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));

    listEl.appendChild(card);
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addItem() {
  const subject = document.getElementById('subject').value.trim();
  const title = document.getElementById('title').value.trim();
  const deadline = document.getElementById('deadline').value;

  if (!subject) { alert('科目を入力してください'); return; }
  if (!title) { alert('提出物・宿題名を入力してください'); return; }

  items.push({
    id: Date.now().toString(),
    subject,
    title,
    deadline,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveItems();
  renderList();

  document.getElementById('title').value = '';
  document.getElementById('deadline').value = '';
  document.getElementById('title').focus();
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

// フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// 追加ボタン
document.getElementById('addBtn').addEventListener('click', addItem);

// Enterキー対応
['subject', 'title', 'deadline'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
});

// 初期化
loadItems();
renderList();
