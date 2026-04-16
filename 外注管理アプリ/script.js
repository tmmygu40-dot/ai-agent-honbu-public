const STORAGE_KEY = 'gaichuu_items';
let items = [];
let currentFilter = 'all';

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  items = raw ? JSON.parse(raw) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getStatus(item) {
  if (item.status === 'paid') return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (item.deadline) {
    const dl = new Date(item.deadline);
    dl.setHours(0, 0, 0, 0);
    if (dl < today) return 'overdue';
  }
  return 'unpaid';
}

function formatDate(dateStr) {
  if (!dateStr) return '納期未設定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatCost(n) {
  return Number(n).toLocaleString() + '円';
}

function render() {
  const list = document.getElementById('list');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');

  let filtered = items.slice();
  if (currentFilter === 'unpaid') {
    filtered = items.filter(it => getStatus(it) !== 'paid');
  } else if (currentFilter === 'paid') {
    filtered = items.filter(it => getStatus(it) === 'paid');
  }

  // サマリ計算
  const totalUnpaid = items
    .filter(it => getStatus(it) === 'unpaid')
    .reduce((s, it) => s + Number(it.cost || 0), 0);
  const totalOverdue = items
    .filter(it => getStatus(it) === 'overdue')
    .reduce((s, it) => s + Number(it.cost || 0), 0);
  const totalPaid = items
    .filter(it => getStatus(it) === 'paid')
    .reduce((s, it) => s + Number(it.cost || 0), 0);

  summary.innerHTML = `
    <span>全${items.length}件</span>
    <span class="amt-unpaid">未払い：${formatCost(totalUnpaid)}</span>
    <span class="amt-overdue">遅延：${formatCost(totalOverdue)}</span>
    <span>支払済：${formatCost(totalPaid)}</span>
  `;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  list.innerHTML = filtered.map(item => {
    const st = getStatus(item);
    const badgeLabel = st === 'overdue' ? '遅延' : st === 'paid' ? '支払い済み' : '未払い';
    const badgeClass = `badge-${st}`;
    const cardClass = `status-${st}`;

    const actionBtn = st !== 'paid'
      ? `<button class="btn-action btn-paid" onclick="markPaid('${item.id}')">支払い済みにする</button>`
      : `<button class="btn-action btn-unpaid" onclick="markUnpaid('${item.id}')">未払いに戻す</button>`;

    return `
      <div class="card ${cardClass}">
        <div class="card-header">
          <div>
            <div class="card-vendor">${escHtml(item.vendor)}</div>
            <div class="card-task">${escHtml(item.task)}</div>
          </div>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="card-meta">
          <span>納期：${formatDate(item.deadline)}</span>
          <span class="card-cost">${formatCost(item.cost)}</span>
        </div>
        ${item.memo ? `<div class="card-memo">${escHtml(item.memo)}</div>` : ''}
        <div class="card-actions">
          ${actionBtn}
          <button class="btn-action btn-delete" onclick="deleteItem('${item.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markPaid(id) {
  const item = items.find(it => it.id === id);
  if (item) { item.status = 'paid'; save(); render(); }
}

function markUnpaid(id) {
  const item = items.find(it => it.id === id);
  if (item) { item.status = 'unpaid'; save(); render(); }
}

function deleteItem(id) {
  if (!confirm('この案件を削除しますか？')) return;
  items = items.filter(it => it.id !== id);
  save();
  render();
}

document.getElementById('addBtn').addEventListener('click', () => {
  const vendor = document.getElementById('vendor').value.trim();
  const task = document.getElementById('task').value.trim();
  const deadline = document.getElementById('deadline').value;
  const cost = document.getElementById('cost').value;
  const status = document.getElementById('status').value;
  const memo = document.getElementById('memo').value.trim();

  if (!vendor || !task) {
    alert('外注先と依頼内容は必須です');
    return;
  }

  items.unshift({
    id: Date.now().toString(),
    vendor,
    task,
    deadline,
    cost: cost ? Number(cost) : 0,
    status,
    memo,
    createdAt: new Date().toISOString()
  });

  save();
  render();

  // フォームリセット
  document.getElementById('vendor').value = '';
  document.getElementById('task').value = '';
  document.getElementById('deadline').value = '';
  document.getElementById('cost').value = '';
  document.getElementById('status').value = 'unpaid';
  document.getElementById('memo').value = '';
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

load();
render();
