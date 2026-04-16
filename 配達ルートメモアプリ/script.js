const STORAGE_KEY = 'delivery_route_items';

let items = [];

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function renderList() {
  const list = document.getElementById('route-list');
  const totalEl = document.getElementById('total-count');
  const doneEl = document.getElementById('done-count');

  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<p class="empty-msg">訪問先が登録されていません</p>';
    totalEl.textContent = '0件';
    doneEl.textContent = '0件';
    return;
  }

  totalEl.textContent = items.length + '件';
  doneEl.textContent = items.filter(i => i.done).length + '件';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'route-item' + (item.done ? ' done' : '');
    li.dataset.id = item.id;

    li.innerHTML = `
      <button class="check-btn" data-id="${item.id}" title="完了切り替え">✓</button>
      <div class="item-body">
        <div class="item-name">
          <span class="order-badge">${index + 1}</span>${item.name}
        </div>
        ${item.address ? `<div class="item-address">${escHtml(item.address)}</div>` : ''}
        <div class="item-qty">${item.qty}件</div>
      </div>
      <button class="delete-btn" data-id="${item.id}" title="削除">✕</button>
    `;

    list.appendChild(li);
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('add-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('input-name').value.trim();
  const address = document.getElementById('input-address').value.trim();
  const qty = parseInt(document.getElementById('input-qty').value, 10) || 1;

  if (!name) return;

  items.push({ id: generateId(), name, address, qty, done: false });
  saveItems();
  renderList();

  document.getElementById('input-name').value = '';
  document.getElementById('input-address').value = '';
  document.getElementById('input-qty').value = '1';
  document.getElementById('input-name').focus();
});

document.getElementById('route-list').addEventListener('click', function(e) {
  const checkBtn = e.target.closest('.check-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (checkBtn) {
    const id = checkBtn.dataset.id;
    const item = items.find(i => i.id === id);
    if (item) {
      item.done = !item.done;
      saveItems();
      renderList();
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    items = items.filter(i => i.id !== id);
    saveItems();
    renderList();
  }
});

document.getElementById('btn-clear-done').addEventListener('click', function() {
  items = items.filter(i => !i.done);
  saveItems();
  renderList();
});

document.getElementById('btn-clear-all').addEventListener('click', function() {
  if (items.length === 0) return;
  if (confirm('全件削除しますか？')) {
    items = [];
    saveItems();
    renderList();
  }
});

loadItems();
renderList();
