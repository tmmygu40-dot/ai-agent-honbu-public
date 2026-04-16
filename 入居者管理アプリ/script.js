'use strict';

// --- データ管理 ---
const STORAGE_KEY = 'nyuukyosha_tenants';
const RENT_KEY = 'nyuukyosha_rent';

function loadTenants() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveTenants(tenants) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
}

function loadRentRecords() {
  try {
    return JSON.parse(localStorage.getItem(RENT_KEY)) || {};
  } catch { return {}; }
}

function saveRentRecords(records) {
  localStorage.setItem(RENT_KEY, JSON.stringify(records));
}

// --- 状態 ---
let tenants = loadTenants();
let rentRecords = loadRentRecords();
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// --- ユーティリティ ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(dateStr) {
  if (!dateStr) return '未設定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateStr);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatRentAmount(amount) {
  if (!amount) return '未設定';
  return Number(amount).toLocaleString() + '円';
}

// --- レンダリング：入居者一覧 ---
function renderTenants() {
  const list = document.getElementById('tenantList');
  if (tenants.length === 0) {
    list.innerHTML = '<div class="empty-state">入居者が登録されていません</div>';
    return;
  }

  list.innerHTML = tenants.map(t => {
    const days = daysUntil(t.contractRenew);
    let cardClass = 'tenant-card';
    let badge = '';

    if (days !== null) {
      if (days < 0) {
        cardClass += ' alert-overdue';
        badge = `<span class="badge badge-overdue">更新期限超過（${Math.abs(days)}日前）</span>`;
      } else if (days <= 30) {
        cardClass += ' alert-renew';
        badge = `<span class="badge badge-renew">更新まで${days}日</span>`;
      }
    }

    return `
      <div class="${cardClass}" data-id="${t.id}">
        <div class="tenant-card-header">
          <div>
            <span class="room-no">${escHtml(t.roomNo)}</span>
            <span style="margin-left:8px" class="tenant-name">${escHtml(t.tenantName)}</span>
            ${badge}
          </div>
        </div>
        <div class="tenant-meta">
          <span>家賃：${formatRentAmount(t.rentAmount)}</span>
          <span>契約開始：${formatDate(t.contractStart)}</span>
          <span>契約更新：${formatDate(t.contractRenew)}</span>
          ${t.memo ? `<span>メモ：${escHtml(t.memo)}</span>` : ''}
        </div>
        <div class="tenant-actions">
          <button class="btn-small" onclick="openEditModal('${t.id}')">編集</button>
          <button class="btn-small danger" onclick="deleteTenant('${t.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- レンダリング：家賃確認 ---
function renderRent() {
  const label = document.getElementById('currentMonthLabel');
  label.textContent = `${currentYear}年 ${currentMonth}月`;

  const list = document.getElementById('rentList');

  const activeTenants = tenants.filter(t => t.tenantName);
  if (activeTenants.length === 0) {
    list.innerHTML = '<div class="empty-state">入居者が登録されていません</div>';
    return;
  }

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2,'0')}`;

  list.innerHTML = activeTenants.map(t => {
    const isPaid = !!(rentRecords[monthKey] && rentRecords[monthKey][t.id]);
    return `
      <div class="rent-card ${isPaid ? 'paid' : ''}">
        <div class="rent-info">
          <div class="rent-room">${escHtml(t.roomNo)}</div>
          <div class="rent-tenant">${escHtml(t.tenantName)}</div>
          <div class="rent-amount">${formatRentAmount(t.rentAmount)}</div>
        </div>
        <button
          class="btn-paid-toggle ${isPaid ? 'paid' : 'unpaid'}"
          onclick="togglePaid('${t.id}')"
        >${isPaid ? '入金済み' : '未入金'}</button>
      </div>
    `;
  }).join('');
}

function togglePaid(tenantId) {
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2,'0')}`;
  if (!rentRecords[monthKey]) rentRecords[monthKey] = {};
  rentRecords[monthKey][tenantId] = !rentRecords[monthKey][tenantId];
  saveRentRecords(rentRecords);
  renderRent();
}

// --- 入居者登録 ---
document.getElementById('addTenantBtn').addEventListener('click', () => {
  const roomNo = document.getElementById('roomNo').value.trim();
  const tenantName = document.getElementById('tenantName').value.trim();
  if (!roomNo || !tenantName) {
    alert('部屋番号と入居者名は必須です');
    return;
  }

  const tenant = {
    id: generateId(),
    roomNo,
    tenantName,
    rentAmount: document.getElementById('rentAmount').value.trim(),
    contractStart: document.getElementById('contractStart').value,
    contractRenew: document.getElementById('contractRenew').value,
    memo: document.getElementById('tenantMemo').value.trim(),
  };

  tenants.push(tenant);
  saveTenants(tenants);
  renderTenants();
  renderRent();

  // フォームリセット
  ['roomNo','tenantName','rentAmount','contractStart','contractRenew','tenantMemo']
    .forEach(id => { document.getElementById(id).value = ''; });
});

// --- 削除 ---
function deleteTenant(id) {
  if (!confirm('この入居者を削除しますか？')) return;
  tenants = tenants.filter(t => t.id !== id);
  saveTenants(tenants);
  renderTenants();
  renderRent();
}

// --- 編集モーダル ---
function openEditModal(id) {
  const t = tenants.find(t => t.id === id);
  if (!t) return;
  document.getElementById('editId').value = t.id;
  document.getElementById('editRoomNo').value = t.roomNo;
  document.getElementById('editTenantName').value = t.tenantName;
  document.getElementById('editRentAmount').value = t.rentAmount;
  document.getElementById('editContractStart').value = t.contractStart;
  document.getElementById('editContractRenew').value = t.contractRenew;
  document.getElementById('editMemo').value = t.memo;
  document.getElementById('editModal').classList.remove('hidden');
}

document.getElementById('saveEditBtn').addEventListener('click', () => {
  const id = document.getElementById('editId').value;
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return;

  const roomNo = document.getElementById('editRoomNo').value.trim();
  const tenantName = document.getElementById('editTenantName').value.trim();
  if (!roomNo || !tenantName) {
    alert('部屋番号と入居者名は必須です');
    return;
  }

  tenants[idx] = {
    ...tenants[idx],
    roomNo,
    tenantName,
    rentAmount: document.getElementById('editRentAmount').value.trim(),
    contractStart: document.getElementById('editContractStart').value,
    contractRenew: document.getElementById('editContractRenew').value,
    memo: document.getElementById('editMemo').value.trim(),
  };

  saveTenants(tenants);
  renderTenants();
  renderRent();
  document.getElementById('editModal').classList.add('hidden');
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

// モーダル背景クリックで閉じる
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.add('hidden');
});

// --- タブ切り替え ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// --- 月切り替え ---
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  renderRent();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  renderRent();
});

// --- XSSエスケープ ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 初期描画 ---
renderTenants();
renderRent();
