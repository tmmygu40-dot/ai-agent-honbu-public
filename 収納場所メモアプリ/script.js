const STORAGE_KEY = 'storage-memo-items';

let items = [];
let searchQuery = '';

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const nameInput = document.getElementById('itemName');
  const placeInput = document.getElementById('itemPlace');
  const name = nameInput.value.trim();
  const place = placeInput.value.trim();

  if (!name || !place) {
    alert('品名と場所を両方入力してください');
    return;
  }

  items.push({ id: Date.now(), name, place });
  saveItems();
  nameInput.value = '';
  placeInput.value = '';
  nameInput.focus();
  render();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  render();
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark class="highlight">$1</mark>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

function render() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countLabel = document.getElementById('countLabel');

  const filtered = searchQuery
    ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    countLabel.textContent = searchQuery ? '0件' : '';
  } else {
    emptyMsg.style.display = 'none';
    countLabel.textContent = `${filtered.length}件`;
    list.innerHTML = filtered.map(item => `
      <li>
        <div class="item-info">
          <div class="item-name">${highlight(item.name, searchQuery)}</div>
          <div class="item-place">${escapeHtml(item.place)}</div>
        </div>
        <button class="delete-btn" data-id="${item.id}" title="削除">✕</button>
      </li>
    `).join('');
  }
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('itemName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('itemPlace').focus();
});

document.getElementById('itemPlace').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  render();
});

document.getElementById('clearSearchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  render();
});

document.getElementById('itemList').addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (btn) {
    const id = Number(btn.dataset.id);
    deleteItem(id);
  }
});

// 初期化
loadItems();
render();
