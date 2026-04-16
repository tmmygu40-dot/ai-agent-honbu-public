const STORAGE_KEY = 'key_management_data';

let keys = [];
let currentFilter = 'all';

function loadKeys() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      keys = JSON.parse(stored);
    } catch (e) {
      keys = [];
    }
  }
}

function saveKeys() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function addKey(keyNumber, borrower, note) {
  const newKey = {
    id: Date.now().toString(),
    keyNumber: keyNumber.trim(),
    borrower: borrower.trim(),
    note: note.trim(),
    status: 'lending',
    createdAt: new Date().toISOString()
  };
  keys.push(newKey);
  saveKeys();
  render();
}

function toggleStatus(id) {
  const key = keys.find(k => k.id === id);
  if (!key) return;
  key.status = key.status === 'lending' ? 'returned' : 'lending';
  saveKeys();
  render();
}

function deleteKey(id) {
  keys = keys.filter(k => k.id !== id);
  saveKeys();
  render();
}

function getFilteredKeys() {
  if (currentFilter === 'all') return keys;
  return keys.filter(k => k.status === currentFilter);
}

function updateStats() {
  const total = keys.length;
  const lending = keys.filter(k => k.status === 'lending').length;
  const returned = keys.filter(k => k.status === 'returned').length;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('lendingCount').textContent = lending;
  document.getElementById('returnedCount').textContent = returned;
}

function render() {
  updateStats();

  const list = document.getElementById('keyList');
  const emptyMsg = document.getElementById('emptyMsg');
  const filtered = getFilteredKeys();

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  // 貸出中を先に表示
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === b.status) return new Date(b.createdAt) - new Date(a.createdAt);
    return a.status === 'lending' ? -1 : 1;
  });

  sorted.forEach(key => {
    const li = document.createElement('li');
    li.className = 'key-item';

    const isLending = key.status === 'lending';

    li.innerHTML = `
      <div class="key-info">
        <div class="key-number">${escapeHtml(key.keyNumber)}</div>
        <div class="key-borrower">👤 ${escapeHtml(key.borrower)}</div>
        ${key.note ? `<div class="key-note">📝 ${escapeHtml(key.note)}</div>` : ''}
        <div class="key-date">🕒 ${formatDate(key.createdAt)}</div>
      </div>
      <button class="status-badge ${isLending ? 'status-lending' : 'status-returned'}" data-id="${key.id}">
        ${isLending ? '貸出中' : '返却済み'}
      </button>
      <button class="delete-btn" data-del="${key.id}" title="削除">✕</button>
    `;

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// イベント：登録ボタン
document.getElementById('addBtn').addEventListener('click', () => {
  const keyNumber = document.getElementById('keyNumber').value.trim();
  const borrower = document.getElementById('borrower').value.trim();
  const note = document.getElementById('note').value.trim();

  if (!keyNumber) {
    alert('鍵番号を入力してください');
    document.getElementById('keyNumber').focus();
    return;
  }
  if (!borrower) {
    alert('貸出先を入力してください');
    document.getElementById('borrower').focus();
    return;
  }

  addKey(keyNumber, borrower, note);

  document.getElementById('keyNumber').value = '';
  document.getElementById('borrower').value = '';
  document.getElementById('note').value = '';
  document.getElementById('keyNumber').focus();
});

// Enterキーで登録
['keyNumber', 'borrower', 'note'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addBtn').click();
    }
  });
});

// イベント：一覧のクリック（状態切替・削除）
document.getElementById('keyList').addEventListener('click', (e) => {
  const statusBtn = e.target.closest('.status-badge');
  const deleteBtn = e.target.closest('.delete-btn');

  if (statusBtn) {
    const id = statusBtn.dataset.id;
    toggleStatus(id);
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.del;
    if (confirm('この鍵を削除しますか？')) {
      deleteKey(id);
    }
  }
});

// イベント：フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// 初期化
loadKeys();
render();
