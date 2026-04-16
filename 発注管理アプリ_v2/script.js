const STORAGE_KEY = 'hatchukanri_v2_orders';

let orders = [];
let currentFilter = 'all';

function loadOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    orders = data ? JSON.parse(data) : [];
  } catch {
    orders = [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function isOverdue(order) {
  if (order.arrived) return false;
  if (!order.dueDate) return false;
  return order.dueDate < today();
}

function getFilteredOrders() {
  if (currentFilter === 'pending') return orders.filter(o => !o.arrived);
  if (currentFilter === 'arrived') return orders.filter(o => o.arrived);
  return orders;
}

function renderOrders() {
  const list = document.getElementById('orderList');
  const emptyMsg = document.getElementById('emptyMsg');
  const filtered = getFilteredOrders();

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  // 未入荷を上、入荷済みを下、未入荷の中は納期順
  const sorted = [...filtered].sort((a, b) => {
    if (a.arrived !== b.arrived) return a.arrived ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  list.innerHTML = sorted.map(order => {
    const overdue = isOverdue(order);
    let cardClass = 'order-card';
    if (order.arrived) cardClass += ' arrived';
    else if (overdue) cardClass += ' overdue';

    let badgeHtml = '';
    if (order.arrived) {
      badgeHtml = `<span class="badge badge-arrived">入荷済み</span>`;
    } else if (overdue) {
      badgeHtml = `<span class="badge badge-overdue">納期超過</span>`;
    } else {
      badgeHtml = `<span class="badge badge-pending">未入荷</span>`;
    }

    const actionBtn = order.arrived
      ? `<button class="btn-undo" onclick="undoArrive('${order.id}')">未入荷に戻す</button>`
      : `<button class="btn-arrive" onclick="markArrived('${order.id}')">入荷済みにする</button>`;

    const memoHtml = order.memo
      ? `<div class="order-memo">📝 ${escapeHtml(order.memo)}</div>`
      : '';

    return `
      <div class="${cardClass}">
        <div class="order-info">
          <div class="order-main">
            <span class="order-item">${escapeHtml(order.item)}</span>
            <span class="order-vendor">${escapeHtml(order.vendor)}</span>
            ${badgeHtml}
          </div>
          <div class="order-dates">
            <span>発注日：${formatDate(order.orderDate)}</span>
            <span>納期：${formatDate(order.dueDate)}</span>
            ${order.arrivedDate ? `<span>入荷日：${formatDate(order.arrivedDate)}</span>` : ''}
          </div>
          ${memoHtml}
        </div>
        <div class="order-actions">
          ${actionBtn}
          <button class="btn-delete" onclick="deleteOrder('${order.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addOrder() {
  const vendor = document.getElementById('vendor').value.trim();
  const item = document.getElementById('item').value.trim();
  const orderDate = document.getElementById('orderDate').value;
  const dueDate = document.getElementById('dueDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!vendor || !item || !orderDate || !dueDate) {
    alert('業者名・品目・発注日・納期は必須です');
    return;
  }

  const order = {
    id: Date.now().toString(),
    vendor,
    item,
    orderDate,
    dueDate,
    memo,
    arrived: false,
    arrivedDate: null,
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);
  saveOrders();
  renderOrders();

  // フォームリセット
  document.getElementById('vendor').value = '';
  document.getElementById('item').value = '';
  document.getElementById('orderDate').value = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('memo').value = '';
}

function markArrived(id) {
  const order = orders.find(o => o.id === id);
  if (!order) return;
  order.arrived = true;
  order.arrivedDate = today();
  saveOrders();
  renderOrders();
}

function undoArrive(id) {
  const order = orders.find(o => o.id === id);
  if (!order) return;
  order.arrived = false;
  order.arrivedDate = null;
  saveOrders();
  renderOrders();
}

function deleteOrder(id) {
  if (!confirm('この発注を削除しますか？')) return;
  orders = orders.filter(o => o.id !== id);
  saveOrders();
  renderOrders();
}

// タブ切り替え
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderOrders();
  });
});

// 登録ボタン
document.getElementById('addBtn').addEventListener('click', addOrder);

// Enter でも送信
['vendor', 'item', 'orderDate', 'dueDate', 'memo'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') addOrder();
  });
});

// 初期化
loadOrders();
// 今日の日付をデフォルトに
document.getElementById('orderDate').value = today();
renderOrders();
