const STORAGE_KEY = 'delivery_records';

let records = [];
let currentFilter = 'all';

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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
  const target = new Date(dateStr);
  return target < today;
}

function renderList() {
  const list = document.getElementById('deliveryList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = records.filter(r => {
    if (currentFilter === 'pending') return !r.done;
    if (currentFilter === 'done') return r.done;
    return true;
  });

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  emptyMsg.style.display = 'none';
  list.innerHTML = filtered.map(r => {
    const overdueClass = !r.done && isOverdue(r.deliveryDate) ? 'overdue' : '';
    const dateLabel = r.deliveryDate
      ? `<span class="${overdueClass}">到着予定：${formatDate(r.deliveryDate)}${overdueClass ? ' ⚠️' : ''}</span>`
      : '';
    const noteLabel = r.note ? `<span>📝 ${escapeHtml(r.note)}</span>` : '';
    return `
      <li class="delivery-item ${r.done ? 'done' : ''}" data-id="${r.id}">
        <button class="check-btn ${r.done ? 'checked' : ''}" data-id="${r.id}" title="${r.done ? '受取済み' : '受取確認'}">
          ${r.done ? '✓' : ''}
        </button>
        <div class="item-body">
          <div class="item-recipient">${escapeHtml(r.recipient)}</div>
          <div class="item-name">${escapeHtml(r.item)}</div>
          <div class="item-meta">${dateLabel}${noteLabel}</div>
        </div>
        <button class="delete-btn" data-id="${r.id}" title="削除">✕</button>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addRecord() {
  const recipient = document.getElementById('recipient').value.trim();
  const item = document.getElementById('item').value.trim();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const note = document.getElementById('note').value.trim();

  if (!recipient || !item) {
    alert('相手と品名は必ず入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    recipient,
    item,
    deliveryDate,
    note,
    done: false,
    createdAt: new Date().toISOString()
  };

  records.unshift(record);
  saveRecords();
  renderList();

  document.getElementById('recipient').value = '';
  document.getElementById('item').value = '';
  document.getElementById('deliveryDate').value = '';
  document.getElementById('note').value = '';
  document.getElementById('recipient').focus();
}

function toggleDone(id) {
  const r = records.find(r => r.id === id);
  if (r) {
    r.done = !r.done;
    saveRecords();
    renderList();
  }
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
}

// イベントリスナー
document.getElementById('addBtn').addEventListener('click', addRecord);

document.getElementById('recipient').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('item').focus();
});
document.getElementById('item').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('deliveryDate').focus();
});

document.getElementById('deliveryList').addEventListener('click', e => {
  const checkBtn = e.target.closest('.check-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  if (checkBtn) {
    toggleDone(Number(checkBtn.dataset.id));
  } else if (deleteBtn) {
    if (confirm('この記録を削除しますか？')) {
      deleteRecord(Number(deleteBtn.dataset.id));
    }
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// 初期化
loadRecords();
renderList();
