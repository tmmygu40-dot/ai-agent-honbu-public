const STORAGE_KEY = 'nyukakenpinchecklist';

let items = [];

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    items = data ? JSON.parse(data) : [];
  } catch {
    items = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const nameEl = document.getElementById('itemName');
  const qtyEl = document.getElementById('orderQty');
  const name = nameEl.value.trim();
  const qty = parseInt(qtyEl.value, 10);

  if (!name) {
    nameEl.focus();
    return;
  }
  if (!qty || qty < 1) {
    qtyEl.focus();
    return;
  }

  items.push({ id: Date.now(), name, orderQty: qty, arrivalQty: null });
  saveToStorage();
  render();

  nameEl.value = '';
  qtyEl.value = '';
  nameEl.focus();
}

function updateArrival(id, value) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const val = value === '' ? null : parseInt(value, 10);
  item.arrivalQty = (val !== null && !isNaN(val) && val >= 0) ? val : null;
  saveToStorage();
  renderSummary();
  updateRowStatus(id);
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveToStorage();
  render();
}

function resetAll() {
  if (items.length === 0) return;
  if (!confirm('全データをリセットしますか？')) return;
  items = [];
  saveToStorage();
  render();
}

function clearCompleted() {
  items = items.filter(i => i.arrivalQty === null || i.arrivalQty !== i.orderQty);
  saveToStorage();
  render();
}

function getDiffInfo(item) {
  if (item.arrivalQty === null) {
    return { status: 'pending', label: '未入力', cls: 'diff-pending' };
  }
  const diff = item.arrivalQty - item.orderQty;
  if (diff === 0) return { status: 'ok', label: 'OK', cls: 'diff-ok', diff };
  if (diff < 0) return { status: 'shortage', label: `不足 ${Math.abs(diff)}`, cls: 'diff-shortage', diff };
  return { status: 'excess', label: `過剰 +${diff}`, cls: 'diff-excess', diff };
}

function updateRowStatus(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const row = document.getElementById(`row-${id}`);
  if (!row) return;
  const info = getDiffInfo(item);
  row.className = `item-row status-${info.status}`;
  const badge = row.querySelector('.diff-badge');
  if (badge) {
    badge.className = `diff-badge ${info.cls}`;
    badge.textContent = info.label;
  }
  renderSummary();
}

function render() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (items.length === 0) {
    list.innerHTML = '<p class="empty-msg" id="emptyMsg">発注品を登録してください</p>';
    document.getElementById('summarySection').style.display = 'none';
    return;
  }

  document.getElementById('summarySection').style.display = '';

  list.innerHTML = items.map(item => {
    const info = getDiffInfo(item);
    const arrivalVal = item.arrivalQty !== null ? item.arrivalQty : '';
    return `
      <div class="item-row status-${info.status}" id="row-${item.id}">
        <div class="item-top">
          <span class="item-name">${escHtml(item.name)}</span>
          <span class="order-label">発注数: ${item.orderQty}</span>
        </div>
        <div class="item-bottom">
          <div class="arrival-input-wrap">
            <label for="arrival-${item.id}">入荷数</label>
            <input
              class="arrival-input"
              id="arrival-${item.id}"
              type="number"
              min="0"
              value="${arrivalVal}"
              placeholder="0"
              oninput="updateArrival(${item.id}, this.value)"
            >
          </div>
          <span class="diff-badge ${info.cls}">${info.label}</span>
          <button class="delete-btn" onclick="deleteItem(${item.id})" title="削除">✕</button>
        </div>
      </div>
    `;
  }).join('');

  renderSummary();
}

function renderSummary() {
  if (items.length === 0) return;
  const total = items.length;
  let ok = 0, shortage = 0, excess = 0, pending = 0;
  items.forEach(item => {
    const info = getDiffInfo(item);
    if (info.status === 'ok') ok++;
    else if (info.status === 'shortage') shortage++;
    else if (info.status === 'excess') excess++;
    else pending++;
  });
  document.getElementById('totalItems').textContent = total;
  document.getElementById('okCount').textContent = ok;
  document.getElementById('shortageCount').textContent = shortage;
  document.getElementById('excessCount').textContent = excess;
  document.getElementById('pendingCount').textContent = pending;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Enter キーで登録
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  render();

  document.getElementById('itemName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('orderQty').focus();
  });
  document.getElementById('orderQty').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
});
