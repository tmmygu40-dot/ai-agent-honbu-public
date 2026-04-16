const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];
const STORAGE_KEY = 'kodomo_items';
const CHECK_KEY = 'kodomo_checks';

// JS曜日（0=日〜6=土）→ 本アプリ曜日（0=月〜6=日）
function getTodayIndex() {
  const jsDay = new Date().getDay(); // 0=日
  return jsDay === 0 ? 6 : jsDay - 1;
}

let currentDay = getTodayIndex();

// データ構造: { 0: [{id, name},...], 1: [...], ... }
function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

// チェック状態: { 0: {id: true/false, ...}, ... }
function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY)) || {};
  } catch {
    return {};
  }
}

function saveItems(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function saveChecks(data) {
  localStorage.setItem(CHECK_KEY, JSON.stringify(data));
}

function getItems(day) {
  const data = loadItems();
  return data[day] || [];
}

function getChecks(day) {
  const data = loadChecks();
  return data[day] || {};
}

function setItems(day, items) {
  const data = loadItems();
  data[day] = items;
  saveItems(data);
}

function setChecks(day, checks) {
  const data = loadChecks();
  data[day] = checks;
  saveChecks(data);
}

// ---- UI ----

function renderTabs() {
  const todayIndex = getTodayIndex();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const d = parseInt(btn.dataset.day);
    btn.classList.toggle('active', d === currentDay);
    btn.classList.toggle('today-tab', d === todayIndex);
  });
}

function renderList() {
  const items = getItems(currentDay);
  const checks = getChecks(currentDay);
  const list = document.getElementById('itemList');
  list.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-msg';
    empty.textContent = '持ち物がまだ登録されていません';
    list.appendChild(empty);
    updateProgress(0, 0);
    return;
  }

  let checkedCount = 0;
  items.forEach(item => {
    const isChecked = !!checks[item.id];
    if (isChecked) checkedCount++;

    const li = document.createElement('li');
    if (isChecked) li.classList.add('checked');

    const box = document.createElement('div');
    box.className = 'check-box' + (isChecked ? ' checked' : '');
    box.addEventListener('click', () => toggleCheck(item.id));

    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '✕';
    del.title = '削除';
    del.addEventListener('click', () => deleteItem(item.id));

    li.appendChild(box);
    li.appendChild(name);
    li.appendChild(del);
    list.appendChild(li);
  });

  updateProgress(checkedCount, items.length);
}

function updateProgress(done, total) {
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  bar.style.width = pct + '%';
  text.textContent = `${done} / ${total} チェック済み`;
}

function addItem(name) {
  const items = getItems(currentDay);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  items.push({ id, name });
  setItems(currentDay, items);
  renderList();
}

function deleteItem(id) {
  const items = getItems(currentDay).filter(i => i.id !== id);
  setItems(currentDay, items);
  const checks = getChecks(currentDay);
  delete checks[id];
  setChecks(currentDay, checks);
  renderList();
}

function toggleCheck(id) {
  const checks = getChecks(currentDay);
  checks[id] = !checks[id];
  setChecks(currentDay, checks);
  renderList();
}

function resetChecks() {
  setChecks(currentDay, {});
  renderList();
}

function renderTodayLabel() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const todayIndex = getTodayIndex();
  document.getElementById('todayLabel').textContent =
    `${y}年${m}月${d}日（${DAY_NAMES[todayIndex]}曜日）`;
}

// ---- イベント ----

document.getElementById('dayTabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  currentDay = parseInt(btn.dataset.day);
  renderTabs();
  renderList();
});

document.getElementById('addBtn').addEventListener('click', () => {
  const input = document.getElementById('itemInput');
  const name = input.value.trim();
  if (!name) return;
  addItem(name);
  input.value = '';
  input.focus();
});

document.getElementById('itemInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  resetChecks();
});

// ---- 初期化 ----
renderTodayLabel();
renderTabs();
renderList();
