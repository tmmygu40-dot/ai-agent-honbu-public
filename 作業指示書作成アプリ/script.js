const STORAGE_KEY = 'workOrders';

let orders = loadOrders();

function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function formatDate(dateStr) {
  if (!dateStr) return '未設定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getVal(id) {
  return document.getElementById(id).value.trim();
}

function clearForm() {
  ['productName', 'process', 'assignee', 'deadline', 'quantity', 'note'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
  });
  document.getElementById('productName').focus();
}

function renderOrders() {
  const container = document.getElementById('listContainer');
  const emptyMsg = document.getElementById('emptyMsg');
  const countBadge = document.getElementById('countBadge');

  countBadge.textContent = orders.length;

  if (orders.length === 0) {
    if (!emptyMsg) {
      const p = document.createElement('p');
      p.className = 'empty-message';
      p.id = 'emptyMsg';
      p.textContent = '指示書がまだありません。上のフォームから追加してください。';
      container.appendChild(p);
    }
    const existing = container.querySelectorAll('.work-order-card');
    existing.forEach(c => c.remove());
    return;
  }

  // Remove empty message if present
  const em = document.getElementById('emptyMsg');
  if (em) em.remove();

  // Remove existing cards
  container.querySelectorAll('.work-order-card').forEach(c => c.remove());

  orders.forEach((order, index) => {
    const card = document.createElement('div');
    card.className = 'work-order-card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-number">指示書 #${String(order.id).padStart(4, '0')}</div>
          <div class="card-date">作成日：${order.createdAt}</div>
        </div>
        <button class="btn-delete no-print" data-index="${index}" title="削除">✕</button>
      </div>
      <div class="card-fields">
        <div class="field-item">
          <span class="field-label">品名</span>
          <span class="field-value">${escapeHtml(order.productName)}</span>
        </div>
        <div class="field-item">
          <span class="field-label">工程</span>
          <span class="field-value">${escapeHtml(order.process)}</span>
        </div>
        <div class="field-item">
          <span class="field-label">担当者</span>
          <span class="field-value">${escapeHtml(order.assignee)}</span>
        </div>
        <div class="field-item">
          <span class="field-label">期限</span>
          <span class="field-value deadline">${formatDate(order.deadline)}</span>
        </div>
        ${order.quantity ? `
        <div class="field-item">
          <span class="field-label">数量</span>
          <span class="field-value">${escapeHtml(order.quantity)}</span>
        </div>` : ''}
        ${order.note ? `
        <div class="field-item full">
          <span class="field-label">備考</span>
          <span class="field-value">${escapeHtml(order.note)}</span>
        </div>` : ''}
      </div>
    `;
    container.appendChild(card);
  });

  // Delete buttons
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      if (confirm('この指示書を削除しますか？')) {
        orders.splice(idx, 1);
        saveOrders();
        renderOrders();
      }
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.getElementById('addBtn').addEventListener('click', () => {
  const productName = getVal('productName');
  const process = getVal('process');
  const assignee = getVal('assignee');
  const deadline = getVal('deadline');

  if (!productName || !process || !assignee || !deadline) {
    alert('品名・工程・担当者・期限はすべて入力してください。');
    return;
  }

  const now = new Date();
  const createdAt = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

  const order = {
    id: Date.now(),
    productName,
    process,
    assignee,
    deadline,
    quantity: getVal('quantity'),
    note: getVal('note'),
    createdAt
  };

  orders.push(order);
  saveOrders();
  renderOrders();
  clearForm();
});

document.getElementById('printBtn').addEventListener('click', () => {
  if (orders.length === 0) {
    alert('印刷する指示書がありません。');
    return;
  }
  window.print();
});

// Initialize
renderOrders();
