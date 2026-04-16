'use strict';

const STORAGE_KEY = 'menuItems';

let items = [];

// --- データ管理 ---

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem(category, name, price) {
  items.push({
    id: Date.now() + Math.random(),
    category: category.trim() || '未分類',
    name: name.trim(),
    price: price
  });
  saveItems();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
}

function updateItem(id, category, name, price) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.category = category.trim() || '未分類';
    item.name = name.trim();
    item.price = price;
    saveItems();
  }
}

// --- 表示 ---

function renderList() {
  const container = document.getElementById('menuList');

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-msg">メニューがまだありません。上のフォームから追加してください。</p>';
    return;
  }

  // カテゴリ別に整理
  const categoryMap = {};
  items.forEach(item => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = [];
    }
    categoryMap[item.category].push(item);
  });

  container.innerHTML = '';
  Object.entries(categoryMap).forEach(([cat, catItems]) => {
    const group = document.createElement('div');
    group.className = 'category-group';

    const label = document.createElement('div');
    label.className = 'category-label';
    label.textContent = cat;
    group.appendChild(label);

    catItems.forEach(item => {
      group.appendChild(createItemElement(item));
    });

    container.appendChild(group);
  });
}

function createItemElement(item) {
  const div = document.createElement('div');
  div.className = 'menu-item';
  div.dataset.id = item.id;

  const priceText = item.price !== null && item.price !== '' ? `¥${Number(item.price).toLocaleString()}` : '価格未設定';

  div.innerHTML = `
    <div class="menu-item-main">
      <span class="menu-name">${escapeHtml(item.name)}</span>
      <span class="menu-price">${priceText}</span>
    </div>
    <div class="edit-form">
      <input type="text" class="edit-category" value="${escapeHtml(item.category)}" placeholder="カテゴリ">
      <input type="text" class="edit-name" value="${escapeHtml(item.name)}" placeholder="料理名">
      <input type="number" class="edit-price" value="${item.price !== null ? item.price : ''}" placeholder="価格">
      <button class="save-btn">保存</button>
      <button class="cancel-btn">キャンセル</button>
    </div>
    <div class="item-actions">
      <button class="edit-btn">編集</button>
      <button class="delete-btn">削除</button>
    </div>
  `;

  div.querySelector('.edit-btn').addEventListener('click', () => {
    div.classList.add('editing');
  });

  div.querySelector('.cancel-btn').addEventListener('click', () => {
    div.classList.remove('editing');
  });

  div.querySelector('.save-btn').addEventListener('click', () => {
    const newCategory = div.querySelector('.edit-category').value;
    const newName = div.querySelector('.edit-name').value.trim();
    const newPrice = div.querySelector('.edit-price').value;

    if (!newName) {
      alert('料理名を入力してください。');
      return;
    }

    updateItem(item.id, newCategory, newName, newPrice !== '' ? Number(newPrice) : null);
    renderList();
  });

  div.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm(`「${item.name}」を削除しますか？`)) {
      deleteItem(item.id);
      renderList();
    }
  });

  return div;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- 印刷 ---

function buildPrintArea() {
  const title = document.getElementById('menuTitle').value.trim() || 'メニュー表';
  document.getElementById('printTitle').textContent = title;

  const content = document.getElementById('printContent');
  content.innerHTML = '';

  if (items.length === 0) {
    content.innerHTML = '<p>メニューがありません。</p>';
    return;
  }

  const categoryMap = {};
  items.forEach(item => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = [];
    }
    categoryMap[item.category].push(item);
  });

  Object.entries(categoryMap).forEach(([cat, catItems]) => {
    const section = document.createElement('div');
    section.className = 'print-category';

    const title = document.createElement('div');
    title.className = 'print-category-title';
    title.textContent = cat;
    section.appendChild(title);

    catItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'print-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'print-item-name';
      nameSpan.textContent = item.name;

      const priceSpan = document.createElement('span');
      priceSpan.className = 'print-item-price';
      priceSpan.textContent = item.price !== null && item.price !== '' ? `¥${Number(item.price).toLocaleString()}` : '—';

      row.appendChild(nameSpan);
      row.appendChild(priceSpan);
      section.appendChild(row);
    });

    content.appendChild(section);
  });
}

// --- イベント ---

document.getElementById('addBtn').addEventListener('click', () => {
  const category = document.getElementById('categoryInput').value;
  const name = document.getElementById('nameInput').value.trim();
  const priceVal = document.getElementById('priceInput').value;
  const price = priceVal !== '' ? Number(priceVal) : null;

  if (!name) {
    alert('料理名を入力してください。');
    return;
  }

  addItem(category, name, price);
  document.getElementById('nameInput').value = '';
  document.getElementById('priceInput').value = '';
  document.getElementById('nameInput').focus();
  renderList();
});

// Enterキーで追加
document.getElementById('priceInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('addBtn').click();
  }
});

document.getElementById('nameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('priceInput').focus();
  }
});

document.getElementById('printBtn').addEventListener('click', () => {
  if (items.length === 0) {
    alert('メニューがまだありません。先に料理を追加してください。');
    return;
  }
  buildPrintArea();
  window.print();
});

// --- 初期化 ---
loadItems();
renderList();
