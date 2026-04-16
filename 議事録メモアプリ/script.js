const STORAGE_KEY = 'gijiroku_items';

let items = [];

function load() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  return deadline < today;
}

function render() {
  const list = document.getElementById('itemList');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  list.innerHTML = '';
  count.textContent = `${items.length}件`;

  if (items.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item-card' + (item.done ? ' done' : '');

    const deadlineClass = item.deadline && isOverdue(item.deadline) && !item.done
      ? 'meta-deadline overdue'
      : 'meta-deadline';

    li.innerHTML = `
      <div class="item-text">${escapeHtml(item.text)}</div>
      <div class="item-meta">
        ${item.owner ? `<span class="meta-owner">👤 ${escapeHtml(item.owner)}</span>` : ''}
        ${item.deadline ? `<span class="${deadlineClass}">📅 ${formatDate(item.deadline)}</span>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn-done" onclick="toggleDone(${index})" title="${item.done ? '未完了に戻す' : '完了にする'}">${item.done ? '↩' : '✓'}</button>
        <button class="btn-delete" onclick="deleteItem(${index})" title="削除">✕</button>
      </div>
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

function addItem() {
  const text = document.getElementById('item').value.trim();
  const owner = document.getElementById('owner').value.trim();
  const deadline = document.getElementById('deadline').value;

  if (!text) {
    document.getElementById('item').focus();
    return;
  }

  items.unshift({ text, owner, deadline, done: false, createdAt: Date.now() });
  save();
  render();

  document.getElementById('item').value = '';
  document.getElementById('owner').value = '';
  document.getElementById('deadline').value = '';
  document.getElementById('item').focus();
}

function deleteItem(index) {
  items.splice(index, 1);
  save();
  render();
}

function toggleDone(index) {
  items[index].done = !items[index].done;
  save();
  render();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('item').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    addItem();
  }
});

load();
render();
