const STORAGE_KEY = 'raitenKanri_customers';

let customers = loadData();
let currentCustomerId = null;

// --- データ管理 ---
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// --- 計算 ---
function daysSince(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.floor((today - target) / 86400000);
}

function getLastVisit(customer) {
  if (!customer.visits || customer.visits.length === 0) return null;
  return customer.visits.reduce((a, b) => (a > b ? a : b));
}

function getAvgInterval(customer) {
  if (!customer.visits || customer.visits.length < 2) return null;
  const sorted = [...customer.visits].sort();
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    total += diff;
  }
  return Math.round(total / (sorted.length - 1));
}

// --- 描画 ---
function render() {
  const list = document.getElementById('customerList');
  const countBadge = document.getElementById('customerCount');

  if (customers.length === 0) {
    list.innerHTML = '<p class="empty-msg">顧客が登録されていません</p>';
    countBadge.textContent = '0名';
    return;
  }

  // 最終来店からの経過日数が長い順に並べる
  const sorted = [...customers].sort((a, b) => {
    const da = getLastVisit(a) ? daysSince(getLastVisit(a)) : 99999;
    const db = getLastVisit(b) ? daysSince(getLastVisit(b)) : 99999;
    return db - da;
  });

  countBadge.textContent = `${customers.length}名`;

  list.innerHTML = sorted.map(c => {
    const lastVisit = getLastVisit(c);
    const days = lastVisit !== null ? daysSince(lastVisit) : null;
    const avg = getAvgInterval(c);
    const visitCount = c.visits ? c.visits.length : 0;

    let alertClass = '';
    let badgeClass = '';
    if (days === null) {
      alertClass = '';
      badgeClass = '';
    } else if (days >= 60) {
      alertClass = 'alert-high';
      badgeClass = 'high';
    } else if (days >= 30) {
      alertClass = 'alert-mid';
      badgeClass = 'mid';
    }

    const daysText = days !== null ? `${days}日経過` : '来店なし';
    const lastDateText = lastVisit ? `最終来店: ${lastVisit}` : '記録なし';
    const avgText = avg !== null ? `平均来店間隔: ${avg}日` : '平均: -（2回以上で計算）';

    return `
      <div class="customer-item ${alertClass}" data-id="${c.id}">
        <div class="customer-name">${escapeHtml(c.name)}</div>
        <div class="customer-stats">
          <div class="stat-line">${lastDateText}</div>
          <div class="stat-line">来店回数: <span>${visitCount}回</span>　${avgText}</div>
        </div>
        <div class="days-badge ${badgeClass}">${daysText}</div>
        <button class="btn-history" onclick="openHistory('${c.id}')">履歴</button>
        <button class="btn-delete-customer" onclick="deleteCustomer('${c.id}')">削除</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 顧客追加 ---
document.getElementById('addBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('customerName');
  const dateInput = document.getElementById('visitDate');
  const errorMsg = document.getElementById('errorMsg');

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (!name) {
    errorMsg.textContent = '顧客名を入力してください';
    return;
  }
  if (!date) {
    errorMsg.textContent = '来店日を選択してください';
    return;
  }
  if (date > new Date().toISOString().slice(0, 10)) {
    errorMsg.textContent = '未来の日付は登録できません';
    return;
  }

  errorMsg.textContent = '';

  // 同名顧客がいれば来店日を追加
  const existing = customers.find(c => c.name === name);
  if (existing) {
    if (!existing.visits.includes(date)) {
      existing.visits.push(date);
    }
  } else {
    customers.push({ id: generateId(), name, visits: [date] });
  }

  saveData();
  render();
  nameInput.value = '';
  dateInput.value = '';
  nameInput.focus();
});

// Enterキー対応
document.getElementById('customerName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('visitDate').focus();
});
document.getElementById('visitDate').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

// --- 顧客削除 ---
function deleteCustomer(id) {
  if (!confirm('この顧客のすべての来店記録を削除しますか？')) return;
  customers = customers.filter(c => c.id !== id);
  saveData();
  render();
}

// --- 来店履歴モーダル ---
function openHistory(id) {
  currentCustomerId = id;
  const customer = customers.find(c => c.id === id);
  if (!customer) return;

  document.getElementById('modalTitle').textContent = `${customer.name} の来店履歴`;
  renderHistory(customer);

  // モーダルの日付欄に今日を初期値
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('addVisitDate').value = today;

  document.getElementById('historyModal').classList.remove('hidden');
}

function renderHistory(customer) {
  const list = document.getElementById('historyList');
  if (!customer.visits || customer.visits.length === 0) {
    list.innerHTML = '<p class="empty-msg">来店記録がありません</p>';
    return;
  }
  const sorted = [...customer.visits].sort().reverse();
  list.innerHTML = sorted.map((date, i) => `
    <div class="history-item">
      <span>${date}</span>
      <button class="btn-del-visit" onclick="deleteVisit('${date}')">削除</button>
    </div>
  `).join('');
}

function deleteVisit(date) {
  const customer = customers.find(c => c.id === currentCustomerId);
  if (!customer) return;
  customer.visits = customer.visits.filter(v => v !== date);
  saveData();
  renderHistory(customer);
  render();
}

document.getElementById('addVisitBtn').addEventListener('click', () => {
  const date = document.getElementById('addVisitDate').value;
  if (!date) return;
  if (date > new Date().toISOString().slice(0, 10)) {
    alert('未来の日付は登録できません');
    return;
  }
  const customer = customers.find(c => c.id === currentCustomerId);
  if (!customer) return;
  if (!customer.visits.includes(date)) {
    customer.visits.push(date);
    saveData();
    renderHistory(customer);
    render();
  }
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('historyModal').classList.add('hidden');
  currentCustomerId = null;
});

document.getElementById('historyModal').addEventListener('click', e => {
  if (e.target === document.getElementById('historyModal')) {
    document.getElementById('historyModal').classList.add('hidden');
    currentCustomerId = null;
  }
});

// --- 初期化 ---
// 今日の日付をデフォルト設定
document.getElementById('visitDate').value = new Date().toISOString().slice(0, 10);
render();
