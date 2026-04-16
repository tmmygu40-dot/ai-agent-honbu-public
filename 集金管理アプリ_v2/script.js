// State
let state = {
  households: [],  // [{id, name}]
  items: [],       // [{id, name, amount}]
  payments: {}     // {householdId_itemId: true/false}
};

const STORAGE_KEY = 'shukinkanri_v2';

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch(e) {}
  }
}

function genId() {
  return '_' + Math.random().toString(36).slice(2, 9);
}

// --- 世帯 ---
function addHousehold() {
  const input = document.getElementById('householdInput');
  const name = input.value.trim();
  if (!name) return;
  if (state.households.some(h => h.name === name)) {
    alert('同じ名前の世帯が既に存在します');
    return;
  }
  state.households.push({ id: genId(), name });
  input.value = '';
  save();
  render();
}

function removeHousehold(id) {
  state.households = state.households.filter(h => h.id !== id);
  // 関連するpaymentも削除
  Object.keys(state.payments).forEach(key => {
    if (key.startsWith(id + '_')) delete state.payments[key];
  });
  save();
  render();
}

// --- 集金項目 ---
function addItem() {
  const nameInput = document.getElementById('itemNameInput');
  const amtInput = document.getElementById('itemAmountInput');
  const name = nameInput.trim ? nameInput.value.trim() : nameInput.value.trim();
  const amount = parseInt(amtInput.value) || 0;
  if (!name) { alert('項目名を入力してください'); return; }
  if (amount < 0) { alert('金額は0以上で入力してください'); return; }
  if (state.items.some(i => i.name === name)) {
    alert('同じ名前の項目が既に存在します');
    return;
  }
  state.items.push({ id: genId(), name, amount });
  nameInput.value = '';
  amtInput.value = '';
  save();
  render();
}

function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  // 関連するpaymentも削除
  Object.keys(state.payments).forEach(key => {
    if (key.endsWith('_' + id)) delete state.payments[key];
  });
  save();
  render();
}

// --- 支払いトグル ---
function togglePayment(householdId, itemId) {
  const key = householdId + '_' + itemId;
  state.payments[key] = !state.payments[key];
  save();
  render();
}

function isPaid(householdId, itemId) {
  return !!state.payments[householdId + '_' + itemId];
}

// --- レンダリング ---
function render() {
  renderHouseholdList();
  renderItemList();
  renderTable();
  renderUnpaid();
}

function renderHouseholdList() {
  const ul = document.getElementById('householdList');
  ul.innerHTML = '';
  state.households.forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escHtml(h.name)}</span><button onclick="removeHousehold('${h.id}')" title="削除">×</button>`;
    ul.appendChild(li);
  });
}

function renderItemList() {
  const ul = document.getElementById('itemList');
  ul.innerHTML = '';
  state.items.forEach(item => {
    const li = document.createElement('li');
    const amtStr = item.amount > 0 ? `（¥${item.amount.toLocaleString()}）` : '';
    li.innerHTML = `<span>${escHtml(item.name)}${amtStr}</span><button onclick="removeItem('${item.id}')" title="削除">×</button>`;
    ul.appendChild(li);
  });
}

function renderTable() {
  const wrapper = document.getElementById('tableWrapper');
  const emptyMsg = document.getElementById('emptyMsg');
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');

  if (state.households.length === 0 || state.items.length === 0) {
    wrapper.style.display = 'none';
    emptyMsg.style.display = '';
    return;
  }
  wrapper.style.display = '';
  emptyMsg.style.display = 'none';

  // ヘッダー
  let thHtml = '<tr><th>世帯名</th>';
  state.items.forEach(item => {
    const amtStr = item.amount > 0 ? `<br><small>¥${item.amount.toLocaleString()}</small>` : '';
    thHtml += `<th>${escHtml(item.name)}${amtStr}</th>`;
  });
  thHtml += '<th>回収率</th></tr>';
  thead.innerHTML = thHtml;

  // 行
  tbody.innerHTML = '';
  state.households.forEach(h => {
    const tr = document.createElement('tr');
    let paidCount = 0;
    let tdHtml = `<td>${escHtml(h.name)}</td>`;
    state.items.forEach(item => {
      const paid = isPaid(h.id, item.id);
      if (paid) paidCount++;
      const cls = paid ? 'paid' : 'unpaid';
      const icon = paid ? '✅' : '○';
      tdHtml += `<td class="check-cell ${cls}" onclick="togglePayment('${h.id}','${item.id}')" title="${paid ? '支払済 (クリックで取消)' : '未払い (クリックで済みにする)'}">${icon}</td>`;
    });
    const rate = state.items.length > 0 ? Math.round(paidCount / state.items.length * 100) : 0;
    tdHtml += `<td class="rate-cell">${paidCount}/${state.items.length}<br>${rate}%</td>`;
    tr.innerHTML = tdHtml;
    tbody.appendChild(tr);
  });
}

function renderUnpaid() {
  const listEl = document.getElementById('unpaidList');
  const totalRow = document.getElementById('totalRow');
  const totalAmtEl = document.getElementById('totalAmount');

  const unpaidItems = [];
  let totalAmt = 0;

  state.households.forEach(h => {
    state.items.forEach(item => {
      if (!isPaid(h.id, item.id)) {
        unpaidItems.push({ householdName: h.name, itemName: item.name, amount: item.amount });
        totalAmt += item.amount;
      }
    });
  });

  if (unpaidItems.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">未払いなし</p>';
    totalRow.style.display = 'none';
    return;
  }

  listEl.innerHTML = unpaidItems.map(u => {
    const amtStr = u.amount > 0 ? `<span class="amount">¥${u.amount.toLocaleString()}</span>` : '';
    return `<div class="unpaid-item"><span>${escHtml(u.householdName)} ／ ${escHtml(u.itemName)}</span>${amtStr}</div>`;
  }).join('');

  totalRow.style.display = 'flex';
  totalAmtEl.textContent = '¥' + totalAmt.toLocaleString();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// キーボードショートカット
document.getElementById('householdInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addHousehold();
});
document.getElementById('itemNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('itemAmountInput').focus();
});
document.getElementById('itemAmountInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

// 初期化
load();
render();
