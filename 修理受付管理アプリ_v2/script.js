const STORAGE_KEY = 'repair_records_v2';
const STATUS_LIST = ['受付中', '修理中', '完了'];

let repairs = [];
let currentFilter = 'all';

// --- データ読み込み / 保存 ---
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  repairs = raw ? JSON.parse(raw) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repairs));
}

// --- 今日の日付（YYYY-MM-DD）をデフォルト設定 ---
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('receiveDate').value = `${yyyy}-${mm}-${dd}`;
}

// --- 受付登録 ---
document.getElementById('repairForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const customerName = document.getElementById('customerName').value.trim();
  const itemName = document.getElementById('itemName').value.trim();
  const receiveDate = document.getElementById('receiveDate').value;
  const note = document.getElementById('note').value.trim();

  if (!customerName || !itemName || !receiveDate) return;

  const record = {
    id: Date.now(),
    customerName,
    itemName,
    receiveDate,
    note,
    status: '受付中',
    createdAt: new Date().toISOString()
  };

  repairs.unshift(record);
  saveData();
  renderList();
  this.reset();
  setDefaultDate();
});

// --- ステータス変更 ---
function updateStatus(id, newStatus) {
  const item = repairs.find(r => r.id === id);
  if (item) {
    item.status = newStatus;
    saveData();
    renderList();
  }
}

// --- 削除 ---
function deleteRepair(id) {
  repairs = repairs.filter(r => r.id !== id);
  saveData();
  renderList();
}

// --- フィルター ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    renderList();
  });
});

// --- 一覧描画 ---
function renderList() {
  const list = document.getElementById('repairList');
  const countEl = document.getElementById('repairCount');

  const filtered = currentFilter === 'all'
    ? repairs
    : repairs.filter(r => r.status === currentFilter);

  countEl.textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-msg">該当する受付がありません</div>';
    return;
  }

  list.innerHTML = filtered.map(r => {
    const dateStr = r.receiveDate
      ? r.receiveDate.replace(/-/g, '/').replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$1年$2月$3日')
      : '';
    const noteHtml = r.note
      ? `<div class="card-note">📝 ${escapeHtml(r.note)}</div>`
      : '';
    const options = STATUS_LIST.map(s =>
      `<option value="${s}"${r.status === s ? ' selected' : ''}>${s}</option>`
    ).join('');

    return `
      <div class="repair-card status-${r.status}">
        <div class="card-header">
          <div>
            <div class="card-customer">${escapeHtml(r.customerName)}</div>
            <div class="card-title">${escapeHtml(r.itemName)}</div>
          </div>
          <span class="status-badge badge-${r.status}">${r.status}</span>
        </div>
        <div class="card-meta">受付日：${dateStr}</div>
        ${noteHtml}
        <div class="card-actions">
          <select class="status-select" onchange="updateStatus(${r.id}, this.value)">
            ${options}
          </select>
          <button class="btn-delete" onclick="deleteRepair(${r.id})" title="削除">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 初期化 ---
loadData();
setDefaultDate();
renderList();
