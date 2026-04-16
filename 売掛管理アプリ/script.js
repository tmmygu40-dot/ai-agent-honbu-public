const STORAGE_KEY = 'urikake_records';

let records = [];
let currentFilter = 'unpaid';
let pendingPaidId = null;

function loadRecords() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatAmount(num) {
  return '¥' + Number(num).toLocaleString('ja-JP');
}

function renderSummary() {
  const unpaid = records.filter(r => !r.paid);
  const total = unpaid.reduce((sum, r) => sum + Number(r.amount), 0);
  document.getElementById('totalUnpaid').textContent = formatAmount(total);
  document.getElementById('unpaidCount').textContent = unpaid.length + '件';
}

function renderList() {
  const list = document.getElementById('recordList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = currentFilter === 'unpaid'
    ? records.filter(r => !r.paid)
    : [...records].sort((a, b) => (a.paid === b.paid ? 0 : a.paid ? 1 : -1));

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(r => {
    const li = document.createElement('li');
    li.className = 'record-item' + (r.paid ? ' paid' : '');

    const statusBadge = r.paid
      ? `<span class="status-badge badge-paid">入金済み</span>`
      : `<span class="status-badge badge-unpaid">未入金</span>`;

    const paidInfo = r.paid
      ? `<div class="record-meta">入金日：${r.paidDate || '不明'}</div>`
      : '';

    const memoHtml = r.memo
      ? `<div class="record-memo">${escapeHtml(r.memo)}</div>`
      : '';

    const actionButtons = r.paid
      ? `<button class="btn-delete" data-id="${r.id}">削除</button>`
      : `<button class="btn-paid" data-id="${r.id}">入金済み</button>
         <button class="btn-delete" data-id="${r.id}">削除</button>`;

    li.innerHTML = `
      <div class="record-info">
        <div class="record-client">${escapeHtml(r.client)}</div>
        <div class="record-amount">${formatAmount(r.amount)}</div>
        <div class="record-meta">請求日：${r.billingDate}</div>
        ${paidInfo}
        ${memoHtml}
        ${statusBadge}
      </div>
      <div class="record-actions">
        ${actionButtons}
      </div>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  renderSummary();
  renderList();
}

// 登録
document.getElementById('addBtn').addEventListener('click', () => {
  const client = document.getElementById('client').value.trim();
  const amount = document.getElementById('amount').value.trim();
  const billingDate = document.getElementById('billingDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!client) { alert('得意先を入力してください'); return; }
  if (!amount || isNaN(amount) || Number(amount) <= 0) { alert('金額を正しく入力してください'); return; }
  if (!billingDate) { alert('請求日を入力してください'); return; }

  records.push({
    id: generateId(),
    client,
    amount: Number(amount),
    billingDate,
    memo,
    paid: false,
    paidDate: null
  });

  saveRecords();
  render();

  document.getElementById('client').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('billingDate').value = '';
  document.getElementById('memo').value = '';
});

// フィルター切り替え
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// リストのアクション（入金済み・削除）
document.getElementById('recordList').addEventListener('click', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('btn-paid')) {
    pendingPaidId = id;
    const rec = records.find(r => r.id === id);
    document.getElementById('modalClientName').textContent =
      rec ? `${rec.client}　${formatAmount(rec.amount)}` : '';
    // 今日の日付をデフォルトに
    document.getElementById('paidDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal').classList.remove('hidden');
  }

  if (e.target.classList.contains('btn-delete')) {
    if (confirm('この記録を削除しますか？')) {
      records = records.filter(r => r.id !== id);
      saveRecords();
      render();
    }
  }
});

// モーダル：入金確定
document.getElementById('confirmPaid').addEventListener('click', () => {
  if (!pendingPaidId) return;
  const paidDate = document.getElementById('paidDate').value;
  const rec = records.find(r => r.id === pendingPaidId);
  if (rec) {
    rec.paid = true;
    rec.paidDate = paidDate || new Date().toISOString().split('T')[0];
  }
  saveRecords();
  render();
  pendingPaidId = null;
  document.getElementById('modal').classList.add('hidden');
});

// モーダル：キャンセル
document.getElementById('cancelModal').addEventListener('click', () => {
  pendingPaidId = null;
  document.getElementById('modal').classList.add('hidden');
});

// 初期化
loadRecords();

// 今日の日付をデフォルトセット
document.getElementById('billingDate').value = new Date().toISOString().split('T')[0];

render();
