'use strict';

const STORAGE_KEY = 'orders_v1';
let orders = [];
let currentFilter = 'pending';

// --- データ管理 ---
function loadOrders() {
  try {
    orders = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    orders = [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function addOrder(data) {
  orders.push({
    id: Date.now(),
    supplier: data.supplier,
    itemName: data.itemName,
    quantity: data.quantity,
    orderDate: data.orderDate,
    dueDate: data.dueDate,
    note: data.note,
    received: false,
    createdAt: new Date().toISOString()
  });
  saveOrders();
}

function toggleReceived(id) {
  const order = orders.find(o => o.id === id);
  if (order) {
    order.received = !order.received;
    saveOrders();
  }
}

function deleteOrder(id) {
  orders = orders.filter(o => o.id !== id);
  saveOrders();
}

// --- 日付ユーティリティ ---
function today() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(dueDateStr) {
  return !!(dueDateStr && dueDateStr < today());
}

function isSoon(dueDateStr) {
  if (!dueDateStr) return false;
  const diff = (new Date(dueDateStr) - new Date(today())) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

// --- レンダリング ---
function filteredOrders() {
  const sorted = [...orders].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.id - a.id;
  });
  if (currentFilter === 'pending') return sorted.filter(o => !o.received);
  if (currentFilter === 'received') return sorted.filter(o => o.received);
  return sorted;
}

function renderList() {
  const list = document.getElementById('orderList');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');

  const items = filteredOrders();
  const pendingCount = orders.filter(o => !o.received).length;
  const overdueCount = orders.filter(o => !o.received && isOverdue(o.dueDate)).length;

  let summaryText = `未入荷 ${pendingCount} 件`;
  if (overdueCount > 0) summaryText += `（納期超過 ${overdueCount} 件）`;
  summary.textContent = summaryText;

  list.innerHTML = '';

  if (items.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  items.forEach(order => {
    const overdue = !order.received && isOverdue(order.dueDate);
    const soon = !order.received && isSoon(order.dueDate);

    const li = document.createElement('li');
    li.className = 'order-item' + (overdue ? ' overdue' : '') + (order.received ? ' received' : '');

    const dueDateClass = overdue ? 'due-date overdue' : (soon ? 'due-date soon' : 'due-date');
    const overdueBadge = overdue ? '<span class="overdue-badge">納期超過</span>' : '';

    li.innerHTML = `
      <div class="order-header">
        <div class="order-main">
          <input type="checkbox" title="入荷済みにする" ${order.received ? 'checked' : ''} data-id="${order.id}">
          <div>
            <div class="order-name">${escHtml(order.itemName)}</div>
            <div class="order-supplier">${escHtml(order.supplier)}</div>
          </div>
        </div>
        <button class="delete-btn" title="削除" data-id="${order.id}">×</button>
      </div>
      <div class="order-meta">
        <span>発注日：${formatDate(order.orderDate)}</span>
        <span class="${dueDateClass}">納期：${formatDate(order.dueDate)} ${overdueBadge}</span>
        ${order.quantity ? `<span>数量：${escHtml(String(order.quantity))}</span>` : ''}
      </div>
      ${order.note ? `<div class="order-note">${escHtml(order.note)}</div>` : ''}
    `;

    list.appendChild(li);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- イベント ---
document.getElementById('addBtn').addEventListener('click', () => {
  const supplier = document.getElementById('supplier').value.trim();
  const itemName = document.getElementById('itemName').value.trim();
  const quantity = document.getElementById('quantity').value.trim();
  const orderDate = document.getElementById('orderDate').value;
  const dueDate = document.getElementById('dueDate').value;
  const note = document.getElementById('note').value.trim();

  if (!supplier || !itemName || !orderDate || !dueDate) {
    alert('発注先・品名・発注日・納期は必須です。');
    return;
  }

  addOrder({ supplier, itemName, quantity, orderDate, dueDate, note });
  renderList();

  document.getElementById('supplier').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('quantity').value = '';
  document.getElementById('orderDate').value = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('note').value = '';
});

document.getElementById('orderList').addEventListener('change', e => {
  if (e.target.type === 'checkbox') {
    const id = Number(e.target.dataset.id);
    toggleReceived(id);
    renderList();
  }
});

document.getElementById('orderList').addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (btn) {
    const id = Number(btn.dataset.id);
    if (confirm('この発注を削除しますか？')) {
      deleteOrder(id);
      renderList();
    }
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderList();
  });
});

// --- 初期化 ---
document.getElementById('orderDate').value = today();
loadOrders();
renderList();
