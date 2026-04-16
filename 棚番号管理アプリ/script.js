const STORAGE_KEY = 'tana_kanri_items';

let items = [];
let searchQuery = '';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch (e) {
    items = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem(shelf, itemName) {
  const id = Date.now();
  items.push({ id, shelf: shelf.trim(), itemName: itemName.trim() });
  saveToStorage();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveToStorage();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<span class="highlight">$1</span>');
}

function getFilteredItems() {
  if (!searchQuery) return items;
  const q = searchQuery.toLowerCase();
  return items.filter(item =>
    item.shelf.toLowerCase().includes(q) || item.itemName.toLowerCase().includes(q)
  );
}

function render() {
  const filtered = getFilteredItems();
  const tbody = document.getElementById('shelfList');
  const table = document.getElementById('shelfTable');
  const emptyMsg = document.getElementById('emptyMsg');
  const resultCount = document.getElementById('resultCount');

  tbody.innerHTML = '';

  if (items.length === 0) {
    table.style.display = 'none';
    emptyMsg.style.display = 'block';
    resultCount.textContent = '';
    return;
  }

  emptyMsg.style.display = 'none';
  table.style.display = 'table';

  if (searchQuery) {
    resultCount.textContent = `${filtered.length} / ${items.length} 件`;
  } else {
    resultCount.textContent = `${items.length} 件`;
  }

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="text-align:center;color:#aaa;padding:20px;">該当する保管品がありません</td>`;
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="shelf-badge">${highlightMatch(item.shelf, searchQuery)}</span></td>
      <td>${highlightMatch(item.itemName, searchQuery)}</td>
      <td><button class="del-btn" data-id="${item.id}" title="削除">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      deleteItem(id);
      render();
    });
  });
}

function showError(msg) {
  const el = document.getElementById('formError');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

document.getElementById('addBtn').addEventListener('click', () => {
  const shelf = document.getElementById('shelfInput').value.trim();
  const itemName = document.getElementById('itemInput').value.trim();

  if (!shelf) { showError('棚番号を入力してください'); return; }
  if (!itemName) { showError('保管品名を入力してください'); return; }

  addItem(shelf, itemName);
  document.getElementById('shelfInput').value = '';
  document.getElementById('itemInput').value = '';
  document.getElementById('shelfInput').focus();
  render();
});

document.getElementById('shelfInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('itemInput').focus();
});

document.getElementById('itemInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  render();
});

loadFromStorage();
render();
