const STORAGE_KEY = 'kyakuchu_orders';
let orders = [];
let currentFilter = 'all';

function loadOrders() {
  const saved = localStorage.getItem(STORAGE_KEY);
  orders = saved ? JSON.parse(saved) : [];
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addOrder(data) {
  orders.unshift({
    id: generateId(),
    customerName: data.customerName,
    productName: data.productName,
    arrivalDate: data.arrivalDate,
    memo: data.memo,
    status: '未連絡',
    createdAt: new Date().toISOString()
  });
  saveOrders();
  renderList();
}

function deleteOrder(id) {
  if (!confirm('この客注を削除しますか？')) return;
  orders = orders.filter(o => o.id !== id);
  saveOrders();
  renderList();
}

function updateStatus(id, newStatus) {
  const order = orders.find(o => o.id === id);
  if (order) {
    order.status = newStatus;
    saveOrders();
    renderList();
  }
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arrival = new Date(dateStr);
  return arrival < today;
}

function formatDate(dateStr) {
  if (!dateStr) return '日付未定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function getFilteredOrders() {
  if (currentFilter === 'all') return orders;
  return orders.filter(o => o.status === currentFilter);
}

function renderList() {
  const list = document.getElementById('orderList');
  const filtered = getFilteredOrders();

  document.getElementById('totalCount').textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">該当する客注品はありません</p>';
    return;
  }

  list.innerHTML = filtered.map(order => {
    const overdue = isOverdue(order.arrivalDate);
    const dateClass = overdue ? 'arrival-date overdue' : 'arrival-date';
    const dateLabel = order.arrivalDate
      ? (overdue ? `⚠ ${formatDate(order.arrivalDate)} 入荷予定（過ぎています）` : `入荷予定：${formatDate(order.arrivalDate)}`)
      : '入荷日未定';

    const statuses = ['未連絡', '連絡済み', '引き渡し済み'];
    const statusOptions = statuses.map(s =>
      `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const memoHtml = order.memo
      ? `<div class="card-memo">📝 ${escapeHtml(order.memo)}</div>`
      : '';

    return `
      <div class="order-card status-${order.status}" data-id="${order.id}">
        <div class="card-top">
          <span class="customer-name">👤 ${escapeHtml(order.customerName)}</span>
          <button class="btn-delete" onclick="deleteOrder('${order.id}')" title="削除">✕</button>
        </div>
        <div class="product-name">${escapeHtml(order.productName)}</div>
        <div class="card-meta">
          <span class="${dateClass}">📅 ${dateLabel}</span>
          <select class="status-select ${order.status}" onchange="updateStatus('${order.id}', this.value)">
            ${statusOptions}
          </select>
        </div>
        ${memoHtml}
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

// フォーム送信
document.getElementById('orderForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const customerName = document.getElementById('customerName').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const arrivalDate = document.getElementById('arrivalDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!customerName || !productName) return;

  addOrder({ customerName, productName, arrivalDate, memo });
  this.reset();
});

// フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    renderList();
  });
});

// 初期化
loadOrders();
renderList();
