const STORAGE_KEY = 'order_slip_data';

let currentTable = '';
let orders = [];

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    currentTable = data.tableNo || '';
    orders = data.orders || [];
    if (currentTable) {
      document.getElementById('tableNo').value = currentTable;
    }
  }
  render();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    tableNo: currentTable,
    orders: orders
  }));
}

function addOrder() {
  const tableInput = document.getElementById('tableNo').value.trim();
  const nameInput = document.getElementById('itemName').value.trim();
  const priceInput = parseInt(document.getElementById('price').value, 10);
  const qtyInput = parseInt(document.getElementById('qty').value, 10);

  if (!nameInput) {
    alert('注文品を入力してください');
    document.getElementById('itemName').focus();
    return;
  }
  if (isNaN(priceInput) || priceInput < 0) {
    alert('単価を正しく入力してください');
    document.getElementById('price').focus();
    return;
  }
  if (isNaN(qtyInput) || qtyInput < 1) {
    alert('数量を正しく入力してください');
    document.getElementById('qty').focus();
    return;
  }

  if (tableInput) {
    currentTable = tableInput;
  }

  orders.push({
    id: Date.now(),
    name: nameInput,
    price: priceInput,
    qty: qtyInput
  });

  saveData();
  render();

  document.getElementById('itemName').value = '';
  document.getElementById('price').value = '';
  document.getElementById('qty').value = '1';
  document.getElementById('itemName').focus();
}

function deleteOrder(id) {
  orders = orders.filter(o => o.id !== id);
  saveData();
  render();
}

function resetOrders() {
  if (!confirm('会計をリセットしますか？')) return;
  orders = [];
  currentTable = '';
  document.getElementById('tableNo').value = '';
  saveData();
  render();
}

function calcTotal() {
  return orders.reduce((sum, o) => sum + o.price * o.qty, 0);
}

function formatPrice(n) {
  return '¥' + n.toLocaleString();
}

function render() {
  const list = document.getElementById('orderList');
  const totalRow = document.getElementById('totalRow');
  const tableHeader = document.getElementById('tableHeader');
  const tableLabel = document.getElementById('tableLabel');
  const actionButtons = document.getElementById('actionButtons');

  if (orders.length === 0) {
    list.innerHTML = '<div class="empty-msg">注文がありません</div>';
    totalRow.style.display = 'none';
    tableHeader.style.display = 'none';
    actionButtons.style.display = 'none';
    return;
  }

  // テーブル番号ヘッダー
  if (currentTable) {
    tableLabel.textContent = 'テーブル：' + currentTable;
    tableHeader.style.display = 'block';
  } else {
    tableHeader.style.display = 'none';
  }

  // 注文一覧
  list.innerHTML = orders.map(o => `
    <div class="order-item">
      <span class="order-name">${escapeHtml(o.name)}</span>
      <span class="order-qty">× ${o.qty}</span>
      <span class="order-price">${formatPrice(o.price * o.qty)}</span>
      <button class="btn-delete" onclick="deleteOrder(${o.id})" title="削除">×</button>
    </div>
  `).join('');

  // 合計
  totalRow.style.display = 'flex';
  document.getElementById('totalAmount').textContent = formatPrice(calcTotal());

  actionButtons.style.display = 'flex';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  ['tableNo', 'itemName', 'price', 'qty'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addOrder();
    });
  });
});
