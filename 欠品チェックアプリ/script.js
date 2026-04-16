const STORAGE_KEY = 'deficiency_items';

let items = [];

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function renderList() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMessage');
  const countBadge = document.getElementById('count');
  const actionSection = document.getElementById('actionSection');
  const clearAllBtn = document.getElementById('clearAllBtn');

  list.innerHTML = '';
  countBadge.textContent = items.length;

  if (items.length === 0) {
    emptyMsg.style.display = 'block';
    actionSection.style.display = 'none';
    clearAllBtn.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  actionSection.style.display = 'flex';
  clearAllBtn.style.display = 'inline-block';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item' + (item.done ? ' done' : '');
    li.dataset.id = item.id;

    const metaParts = [];
    if (item.shelf) metaParts.push('棚：' + item.shelf);
    if (item.qty) metaParts.push('数量：' + item.qty);
    const metaText = metaParts.length > 0 ? metaParts.join('　') : '';

    li.innerHTML = `
      <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''} aria-label="補充完了">
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${metaText ? `<div class="item-meta">${escapeHtml(metaText)}</div>` : ''}
      </div>
      <button class="delete-btn" aria-label="削除">×</button>
    `;

    li.querySelector('.item-check').addEventListener('change', () => toggleDone(item.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addItem() {
  const nameInput = document.getElementById('productName');
  const shelfInput = document.getElementById('shelfNumber');
  const qtyInput = document.getElementById('quantity');

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    showToast('商品名を入力してください');
    return;
  }

  const item = {
    id: generateId(),
    name,
    shelf: shelfInput.value.trim(),
    qty: qtyInput.value.trim(),
    done: false,
    createdAt: new Date().toISOString()
  };

  items.push(item);
  saveItems();
  renderList();

  nameInput.value = '';
  shelfInput.value = '';
  qtyInput.value = '';
  nameInput.focus();

  showToast('記録しました');
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
}

function toggleDone(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.done = !item.done;
    saveItems();
    renderList();
  }
}

function clearAll() {
  if (!confirm('全件削除しますか？')) return;
  items = [];
  saveItems();
  renderList();
}

function buildListText() {
  const date = new Date().toLocaleDateString('ja-JP');
  const lines = ['欠品補充リスト（' + date + '）', ''];
  items.forEach((item, i) => {
    let line = (i + 1) + '. ' + item.name;
    if (item.shelf) line += '　棚：' + item.shelf;
    if (item.qty) line += '　数量：' + item.qty;
    if (item.done) line += '　✓補充済';
    lines.push(line);
  });
  return lines.join('\n');
}

function copyList() {
  const text = buildListText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('コピーしました');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('コピーしました');
  } catch (e) {
    showToast('コピーに失敗しました');
  }
  document.body.removeChild(ta);
}

let toastTimer = null;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// イベント登録
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('productName').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('shelfNumber').focus();
  }
});

document.getElementById('shelfNumber').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('quantity').focus();
  }
});

document.getElementById('quantity').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addItem();
  }
});

document.getElementById('clearAllBtn').addEventListener('click', clearAll);
document.getElementById('copyBtn').addEventListener('click', copyList);
document.getElementById('printBtn').addEventListener('click', () => window.print());

// 初期化
loadItems();
renderList();
