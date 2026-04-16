const STORAGE_KEY = 'kigekan_items';

let items = [];

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch (e) {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getDaysLeft(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getStatus(daysLeft) {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'soon';
  return 'ok';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function renderDaysLabel(daysLeft) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}日超過`;
  if (daysLeft === 0) return '今日まで';
  return `あと ${daysLeft} 日`;
}

function render() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const totalCount = document.getElementById('totalCount');

  // 期限が近い順（残り日数昇順）にソート
  const sorted = [...items].sort((a, b) => getDaysLeft(a.date) - getDaysLeft(b.date));

  list.innerHTML = '';

  if (sorted.length === 0) {
    emptyMsg.style.display = 'block';
    totalCount.textContent = '';
    return;
  }

  emptyMsg.style.display = 'none';
  totalCount.textContent = `${sorted.length}件`;

  sorted.forEach(item => {
    const daysLeft = getDaysLeft(item.date);
    const status = getStatus(daysLeft);

    const li = document.createElement('li');
    li.className = `status-${status}`;

    const info = document.createElement('div');
    info.className = 'item-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = item.name;

    const metaEl = document.createElement('div');
    metaEl.className = 'item-meta';
    metaEl.textContent = `期限：${formatDate(item.date)}`;

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    const daysEl = document.createElement('div');
    daysEl.className = `item-days ${status === 'expired' ? 'expired' : status === 'soon' ? 'soon' : 'ok'}`;
    daysEl.textContent = renderDaysLabel(daysLeft);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => deleteItem(item.id));

    li.appendChild(info);
    li.appendChild(daysEl);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function addItem() {
  const nameInput = document.getElementById('itemName');
  const dateInput = document.getElementById('itemDate');
  const errorEl = document.getElementById('formError');

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (!name) {
    errorEl.textContent = '品目名を入力してください';
    nameInput.focus();
    return;
  }
  if (!date) {
    errorEl.textContent = '期限日を入力してください';
    dateInput.focus();
    return;
  }

  errorEl.textContent = '';

  items.push({
    id: Date.now(),
    name,
    date
  });

  saveItems();
  render();

  nameInput.value = '';
  dateInput.value = '';
  nameInput.focus();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  render();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('itemName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('itemDate').focus();
  }
});

document.getElementById('itemDate').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

loadItems();
render();
