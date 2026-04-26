const STORAGE_KEY = 'bichiku_items';

let items = [];

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch (e) {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getStatus(days) {
  if (days <= 7) return { cls: 'danger', label: '要補充' };
  if (days <= 15) return { cls: 'warning', label: '補充検討' };
  return { cls: 'safe', label: '十分' };
}

function calcDays(stock, daily) {
  if (daily <= 0) return Infinity;
  return Math.floor(stock / daily);
}

function renderList() {
  const list = document.getElementById('itemList');
  const emptyState = document.getElementById('emptyState');
  const itemCount = document.getElementById('itemCount');

  list.innerHTML = '';

  if (items.length === 0) {
    emptyState.style.display = 'block';
    itemCount.textContent = '';
    return;
  }

  emptyState.style.display = 'none';
  itemCount.textContent = `${items.length}件`;

  const sorted = [...items].sort((a, b) => {
    const da = calcDays(a.stock, a.daily);
    const db = calcDays(b.stock, b.daily);
    return da - db;
  });

  sorted.forEach((item) => {
    const days = calcDays(item.stock, item.daily);
    const status = getStatus(days);

    const li = document.createElement('li');
    li.className = `item-card ${status.cls}`;

    const daysDisplay = isFinite(days) ? days : '∞';

    li.innerHTML = `
      <div class="days-badge">
        <span class="days-num">${daysDisplay}</span>
        <span class="days-label">日分</span>
      </div>
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-detail">
          備蓄：${item.stock}${escapeHtml(item.unit)} ／ 1日：${item.daily}${escapeHtml(item.unit)}
        </div>
        <div class="item-status">${status.label}</div>
      </div>
      <button class="delete-btn" data-id="${item.id}" aria-label="${escapeHtml(item.name)}を削除">✕</button>
    `;

    list.appendChild(li);
  });

  list.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteItem(btn.dataset.id);
    });
  });
}

function deleteItem(id) {
  items = items.filter((item) => item.id !== id);
  saveItems();
  renderList();
}

function addItem() {
  const nameEl = document.getElementById('itemName');
  const unitEl = document.getElementById('itemUnit');
  const stockEl = document.getElementById('stockQty');
  const dailyEl = document.getElementById('dailyUse');
  const errorEl = document.getElementById('errorMsg');

  const name = nameEl.value.trim();
  const unit = unitEl.value.trim();
  const stock = parseFloat(stockEl.value);
  const daily = parseFloat(dailyEl.value);

  if (!name) {
    showError('品目名を入力してください');
    nameEl.focus();
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showError('備蓄数量を正しく入力してください');
    stockEl.focus();
    return;
  }
  if (isNaN(daily) || daily <= 0) {
    showError('1日の消費量を0より大きい数値で入力してください');
    dailyEl.focus();
    return;
  }

  errorEl.textContent = '';

  const newItem = {
    id: Date.now().toString(),
    name,
    unit,
    stock,
    daily,
  };

  items.push(newItem);
  saveItems();
  renderList();

  nameEl.value = '';
  unitEl.value = '';
  stockEl.value = '';
  dailyEl.value = '';
  nameEl.focus();
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });
});

loadItems();
renderList();
