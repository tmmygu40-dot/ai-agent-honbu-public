const STORAGE_KEY = 'deliveries';

let deliveries = loadDeliveries();

const inputDate = document.getElementById('inputDate');
const inputTime = document.getElementById('inputTime');
const inputCarrier = document.getElementById('inputCarrier');
const inputItem = document.getElementById('inputItem');
const addBtn = document.getElementById('addBtn');
const deliveryList = document.getElementById('deliveryList');
const filterPending = document.getElementById('filterPending');
const countBadge = document.getElementById('countBadge');

// 今日の日付をデフォルトに
inputDate.value = todayStr();

addBtn.addEventListener('click', addDelivery);
filterPending.addEventListener('change', renderList);

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '日付未定';
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

function loadDeliveries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDeliveries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
}

function addDelivery() {
  const date = inputDate.value;
  const time = inputTime.value;
  const carrier = inputCarrier.value.trim();
  const item = inputItem.value.trim();

  if (!item && !carrier) {
    alert('業者名または品名を入力してください');
    return;
  }

  const entry = {
    id: Date.now(),
    date,
    time,
    carrier: carrier || '未入力',
    item: item || '未入力',
    received: false,
    createdAt: new Date().toISOString()
  };

  deliveries.unshift(entry);
  saveDeliveries();

  // フォームリセット（日付はそのまま）
  inputCarrier.value = '';
  inputItem.value = '';

  renderList();
}

function toggleReceived(id) {
  const entry = deliveries.find(d => d.id === id);
  if (entry) {
    entry.received = !entry.received;
    saveDeliveries();
    renderList();
  }
}

function deleteDelivery(id) {
  deliveries = deliveries.filter(d => d.id !== id);
  saveDeliveries();
  renderList();
}

function renderList() {
  const showPendingOnly = filterPending.checked;
  const filtered = showPendingOnly
    ? deliveries.filter(d => !d.received)
    : deliveries;

  countBadge.textContent = `${filtered.length}件`;

  if (filtered.length === 0) {
    deliveryList.innerHTML = '<p class="empty-msg">登録されている配達予定はありません</p>';
    return;
  }

  // 日付でソート（未来→今日→過去の順、日付未定は最後）
  const sorted = [...filtered].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  deliveryList.innerHTML = sorted.map(d => `
    <div class="card ${d.received ? 'received' : ''}" data-id="${d.id}">
      <input
        type="checkbox"
        class="card-check"
        ${d.received ? 'checked' : ''}
        onchange="toggleReceived(${d.id})"
        title="受取済みにする"
      >
      <div class="card-body">
        <div class="card-title">${escapeHtml(d.item)}</div>
        <div class="card-meta">
          <span class="tag">📅 ${formatDate(d.date)}</span>
          <span class="tag">🕐 ${escapeHtml(d.time)}</span>
          <span class="tag">🚚 ${escapeHtml(d.carrier)}</span>
          ${d.received ? '<span class="tag received-tag">✅ 受取済み</span>' : ''}
        </div>
      </div>
      <button class="card-delete" onclick="deleteDelivery(${d.id})" title="削除">✕</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 初期表示
renderList();
