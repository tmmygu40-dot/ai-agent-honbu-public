// ===== データ管理 =====
const STORAGE_KEY = 'beauty_karte_customers';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

let customers = loadData();
let activeCustomerId = null;

// ===== ユーティリティ =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function getLatestVisit(customer) {
  if (!customer.records || customer.records.length === 0) return '来店記録なし';
  const sorted = [...customer.records].sort((a, b) => b.date.localeCompare(a.date));
  return `最終来店：${formatDate(sorted[0].date)}`;
}

// ===== 顧客一覧の描画 =====
function renderCustomerList() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const list = document.getElementById('customerList');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">${query ? '一致する顧客が見つかりません' : '顧客がまだ登録されていません'}</div>`;
    return;
  }

  // 名前順に並べる
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  list.innerHTML = sorted.map(c => `
    <div class="customer-card ${c.id === activeCustomerId ? 'active' : ''}" onclick="selectCustomer('${c.id}')">
      <div class="customer-card-name">${escapeHtml(c.name)}</div>
      <div class="customer-card-meta">${getLatestVisit(c)}　記録：${c.records ? c.records.length : 0}件</div>
    </div>
  `).join('');
}

// ===== 顧客追加フォーム =====
function showAddCustomerForm() {
  document.getElementById('addCustomerForm').classList.remove('hidden');
  document.getElementById('newCustomerName').focus();
}

function hideAddCustomerForm() {
  document.getElementById('addCustomerForm').classList.add('hidden');
  document.getElementById('newCustomerName').value = '';
  document.getElementById('newCustomerMemo').value = '';
}

function addCustomer() {
  const name = document.getElementById('newCustomerName').value.trim();
  if (!name) {
    alert('顧客名を入力してください');
    return;
  }

  const customer = {
    id: generateId(),
    name,
    memo: document.getElementById('newCustomerMemo').value.trim(),
    records: [],
    createdAt: new Date().toISOString()
  };

  customers.push(customer);
  saveData(customers);
  hideAddCustomerForm();
  renderCustomerList();
  selectCustomer(customer.id);
}

// ===== 顧客選択・詳細表示 =====
function selectCustomer(id) {
  activeCustomerId = id;
  renderCustomerList();
  renderDetailPanel();
}

function closeDetailPanel() {
  activeCustomerId = null;
  document.getElementById('detailPanel').classList.add('hidden');
  renderCustomerList();
}

function renderDetailPanel() {
  const customer = customers.find(c => c.id === activeCustomerId);
  if (!customer) return;

  document.getElementById('detailPanel').classList.remove('hidden');
  document.getElementById('detailCustomerName').textContent = customer.name;

  const memoEl = document.getElementById('customerMemoDisplay');
  memoEl.textContent = customer.memo || '';

  hideAddRecordForm();
  renderRecordList(customer);
}

function deleteCustomer() {
  const customer = customers.find(c => c.id === activeCustomerId);
  if (!customer) return;
  if (!confirm(`「${customer.name}」を削除しますか？\n施術記録も全て削除されます。`)) return;

  customers = customers.filter(c => c.id !== activeCustomerId);
  saveData(customers);
  closeDetailPanel();
}

// ===== 施術記録フォーム =====
function showAddRecordForm() {
  const form = document.getElementById('addRecordForm');
  form.classList.remove('hidden');
  // 今日の日付をデフォルト設定
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('recordDate').value = today;
  document.getElementById('recordDate').focus();
}

function hideAddRecordForm() {
  const form = document.getElementById('addRecordForm');
  form.classList.add('hidden');
  document.getElementById('recordDate').value = '';
  document.getElementById('recordService').value = '';
  document.getElementById('recordColorRecipe').value = '';
  document.getElementById('recordNote').value = '';
}

function addRecord() {
  const date = document.getElementById('recordDate').value;
  const service = document.getElementById('recordService').value.trim();

  if (!date) {
    alert('来店日を入力してください');
    return;
  }
  if (!service) {
    alert('施術内容を入力してください');
    return;
  }

  const customer = customers.find(c => c.id === activeCustomerId);
  if (!customer) return;

  const record = {
    id: generateId(),
    date,
    service,
    colorRecipe: document.getElementById('recordColorRecipe').value.trim(),
    note: document.getElementById('recordNote').value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!customer.records) customer.records = [];
  customer.records.push(record);
  saveData(customers);
  hideAddRecordForm();
  renderCustomerList();
  renderRecordList(customer);
}

// ===== 施術記録一覧の描画 =====
function renderRecordList(customer) {
  const list = document.getElementById('recordList');

  if (!customer.records || customer.records.length === 0) {
    list.innerHTML = `<div class="record-empty">施術記録がまだありません</div>`;
    return;
  }

  // 日付の新しい順
  const sorted = [...customer.records].sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = sorted.map(r => `
    <div class="record-card">
      <div class="record-card-header">
        <span class="record-date">${formatDate(r.date)}</span>
        <button class="btn-delete-record" onclick="deleteRecord('${r.id}')" title="削除">✕</button>
      </div>
      <div class="record-service">${escapeHtml(r.service)}</div>
      ${r.colorRecipe ? `<div class="record-recipe">🎨 ${escapeHtml(r.colorRecipe)}</div>` : ''}
      ${r.note ? `<div class="record-note">📝 ${escapeHtml(r.note)}</div>` : ''}
    </div>
  `).join('');
}

function deleteRecord(recordId) {
  if (!confirm('この施術記録を削除しますか？')) return;

  const customer = customers.find(c => c.id === activeCustomerId);
  if (!customer) return;

  customer.records = customer.records.filter(r => r.id !== recordId);
  saveData(customers);
  renderCustomerList();
  renderRecordList(customer);
}

// ===== セキュリティ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== 初期表示 =====
renderCustomerList();
