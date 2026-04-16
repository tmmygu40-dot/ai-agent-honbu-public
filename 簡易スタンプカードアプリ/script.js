'use strict';

const STORAGE_KEY = 'stampCardCustomers';
const STAMP_ICON = '★';
const STAMP_EMPTY_ICON = '☆';

let customers = [];
let achievedCustomerId = null;

// --- localStorage ---
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      customers = JSON.parse(raw);
    } catch {
      customers = [];
    }
  }
}

// --- 顧客追加 ---
document.getElementById('addCustomerBtn').addEventListener('click', addCustomer);
document.getElementById('customerName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addCustomer();
});

function addCustomer() {
  const nameInput = document.getElementById('customerName');
  const maxInput = document.getElementById('stampMax');
  const name = nameInput.value.trim();
  const max = parseInt(maxInput.value, 10) || 10;

  if (!name) {
    nameInput.focus();
    return;
  }

  const customer = {
    id: Date.now(),
    name,
    stampMax: Math.max(1, Math.min(100, max)),
    stampCount: 0,
    achieved: false,
  };

  customers.push(customer);
  saveData();
  renderCustomers();

  nameInput.value = '';
  nameInput.focus();
}

// --- スタンプ追加 ---
function addStamp(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer || customer.achieved) return;

  customer.stampCount++;
  if (customer.stampCount >= customer.stampMax) {
    customer.stampCount = customer.stampMax;
    customer.achieved = true;
    achievedCustomerId = id;
    showAchieveModal(customer.name);
  }

  saveData();
  renderCustomers();
}

// --- 顧客削除 ---
function deleteCustomer(id) {
  customers = customers.filter(c => c.id !== id);
  saveData();
  renderCustomers();
}

// --- リセット ---
function resetStamps(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  customer.stampCount = 0;
  customer.achieved = false;
  saveData();
  renderCustomers();
}

// --- モーダル ---
function showAchieveModal(name) {
  document.getElementById('achieveName').textContent = name + ' さん';
  document.getElementById('achieveModal').classList.remove('hidden');
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (achievedCustomerId !== null) {
    resetStamps(achievedCustomerId);
    achievedCustomerId = null;
  }
  document.getElementById('achieveModal').classList.add('hidden');
});

document.getElementById('closeModalBtn').addEventListener('click', () => {
  achievedCustomerId = null;
  document.getElementById('achieveModal').classList.add('hidden');
});

document.getElementById('achieveModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('achieveModal')) {
    achievedCustomerId = null;
    document.getElementById('achieveModal').classList.add('hidden');
  }
});

// --- 描画 ---
function renderCustomers() {
  const list = document.getElementById('customerList');
  const countEl = document.getElementById('customerCount');

  countEl.textContent = customers.length;

  if (customers.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ顧客が登録されていません</p>';
    return;
  }

  list.innerHTML = '';

  customers.forEach(customer => {
    const card = document.createElement('div');
    card.className = 'customer-card' + (customer.achieved ? ' achieved' : '');

    // スタンプHTML
    let stampsHtml = '';
    for (let i = 0; i < customer.stampMax; i++) {
      const filled = i < customer.stampCount;
      stampsHtml += `<div class="stamp ${filled ? 'filled' : ''}">${filled ? STAMP_ICON : STAMP_EMPTY_ICON}</div>`;
    }

    const progress = customer.stampMax > 0
      ? Math.round((customer.stampCount / customer.stampMax) * 100)
      : 0;

    const stampBtnLabel = customer.achieved ? '達成済み ★' : '来店タップ ＋';

    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${escapeHtml(customer.name)}</span>
        <span class="card-count"><span>${customer.stampCount}</span> / ${customer.stampMax}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      <div class="stamp-grid">${stampsHtml}</div>
      <div class="card-actions">
        <button class="btn-stamp" data-id="${customer.id}" ${customer.achieved ? 'disabled' : ''}>${stampBtnLabel}</button>
        <button class="btn-delete" data-id="${customer.id}" title="削除">🗑</button>
      </div>
    `;

    list.appendChild(card);
  });

  // イベント委任
  list.querySelectorAll('.btn-stamp').forEach(btn => {
    btn.addEventListener('click', () => addStamp(Number(btn.dataset.id)));
  });
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(getCustomerName(Number(btn.dataset.id)) + ' を削除しますか？')) {
        deleteCustomer(Number(btn.dataset.id));
      }
    });
  });
}

function getCustomerName(id) {
  const c = customers.find(c => c.id === id);
  return c ? c.name : '';
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
renderCustomers();
